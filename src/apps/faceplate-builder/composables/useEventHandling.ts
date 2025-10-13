import { ref } from 'vue';
import type { EntityId } from '@/core/data/types';
import { logger } from '@/apps/faceplate-builder/utils/logger';
import type { FaceplateDataService } from '@/apps/faceplate-builder/utils/faceplate-data';
import type { EventPayload } from '../components/types/faceplate-runtime';

export function useEventHandling(
  dataStore: any,
  service: FaceplateDataService,
  entityId: () => EntityId | null,
  scriptRuntimeErrors: any[]
) {
  const eventHandlerQueue = ref<EventPayload[]>([]);
  const isProcessingEventQueue = ref(false);

  async function processEventQueue() {
    if (isProcessingEventQueue.value || eventHandlerQueue.value.length === 0) {
      return;
    }

    isProcessingEventQueue.value = true;

    while (eventHandlerQueue.value.length > 0) {
      const payload = eventHandlerQueue.value.shift();
      if (!payload) continue;

      const { handler, value, nativeEvent } = payload;

      if (!handler || handler.enabled === false) {
        continue;
      }

      logger.debug('Event triggered:', handler.trigger, 'on component', handler.componentId, 'value:', value);

      try {
        if (handler.action.type === 'writeField') {
          await executeWriteFieldAction(handler.action, value);
        } else if (handler.action.type === 'script') {
          await executeScriptAction(handler.action, value, nativeEvent);
        } else if (handler.action.type === 'navigate') {
          await executeNavigateAction(handler.action);
        }
      } catch (error) {
        logger.error('Event handler execution failed:', error);
        scriptRuntimeErrors.push({
          context: `Event handler ${handler.trigger}`,
          error: String(error),
          timestamp: Date.now(),
        });
      }
    }

    isProcessingEventQueue.value = false;
  }

  async function handleEventTriggered(payload: EventPayload) {
    eventHandlerQueue.value.push(payload);
    await processEventQueue();
  }

  async function executeWriteFieldAction(action: any, componentValue: any) {
    const targetEntityId = entityId();
    if (!targetEntityId) {
      logger.warn('Cannot write field: no bound entity');
      return;
    }

    const fieldPath = action.fieldPath;
    if (!fieldPath) {
      logger.warn('Cannot write field: no field path specified');
      return;
    }

    let valueToWrite: any;
    if (action.valueSource === 'component') {
      valueToWrite = componentValue;
    } else if (action.valueSource === 'literal') {
      valueToWrite = action.value;
    } else if (action.valueSource === 'expression') {
      try {
        const func = new Function('value', `return ${action.value}`);
        valueToWrite = func(componentValue);
      } catch (error) {
        logger.error('Failed to evaluate value expression:', error);
        return;
      }
    }

    try {
      if (fieldPath.includes('->')) {
        await service.writeValueIndirect(targetEntityId, fieldPath, valueToWrite);
      } else {
        await service.writeValue(targetEntityId, fieldPath, valueToWrite);
      }
      logger.debug('Successfully wrote value:', valueToWrite, 'to', fieldPath);
    } catch (error) {
      logger.error('Failed to write field:', error);
    }
  }

  async function executeScriptAction(action: any, componentValue: any, nativeEvent?: Event) {
    const code = action.code;
    if (!code) {
      logger.warn('Cannot execute script: no code specified');
      return;
    }

    const context = {
      get: (path: string) => {
        if (path.includes('->')) {
          return service.readValueIndirect(entityId()!, path);
        }
        const value = service.readValue(entityId()!, path);
        return value.then(v => v ? (v as any).ValueHelpers.extract(v) : null);
      },
      getCached: (path: string) => ({} as any)[path], // Will be injected
      set: (path: string, value: any) => {
        if (path.includes('->')) {
          return service.writeValueIndirect(entityId()!, path, value);
        }
        return service.writeValue(entityId()!, path, value);
      },
      setState: (key: string, value: unknown) => {
        // Will be handled by script execution composable
      },
      getState: (key: string) => {
        // Will be handled by script execution composable
        return undefined;
      },
    };

    const helpers = {
      clamp: (value: number, min: number, max: number) => Math.max(min, Math.min(max, value)),
      lerp: (a: number, b: number, t: number) => a + (b - a) * t,
      colorRamp: (value: number, colors: string[]) => colors[Math.floor(value * (colors.length - 1))],
    };

    try {
      const func = new Function('event', 'value', 'context', 'helpers', `return (async () => { ${code} })();`);
      await func(nativeEvent, componentValue, context, helpers);
    } catch (error) {
      logger.error('Script execution failed:', error);
    }
  }

  async function executeNavigateAction(action: any) {
    const targetFaceplate = action.targetFaceplate;
    if (!targetFaceplate) {
      logger.warn('Cannot navigate: no target faceplate specified');
      return;
    }

    try {
      let contextEntityId = entityId();
      if (action.entityContext) {
        try {
          // Would need script execution context here
          contextEntityId = entityId(); // Simplified
        } catch (error) {
          logger.error('Failed to evaluate entity context:', error);
          contextEntityId = entityId();
        }
      }

      logger.info('Navigate to faceplate:', targetFaceplate, 'with entity:', contextEntityId);

      console.log('Navigation requested:', {
        targetFaceplate,
        entityId: contextEntityId,
        action,
      });
    } catch (error) {
      logger.error('Navigation failed:', error);
    }
  }

  return {
    handleEventTriggered,
  };
}