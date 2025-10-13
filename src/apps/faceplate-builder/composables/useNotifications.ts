import { ref } from 'vue';
import type { EntityId, FieldType, NotifyConfig, Notification } from '@/core/data/types';
import { ValueHelpers } from '@/core/data/types';
import { logger } from '@/apps/faceplate-builder/utils/logger';
import { BindingEvaluationStrategyFactory } from '@/apps/faceplate-builder/utils/binding-evaluation-strategies';
import { IndirectFieldNotifier } from '@/apps/faceplate-builder/utils/indirect-field-notifier';
import type { FaceplateDataService, FaceplateRecord } from '@/apps/faceplate-builder/utils/faceplate-data';
import type { NotificationSubscription } from '../components/types/faceplate-runtime';

export function useNotifications(
  dataStore: any,
  service: FaceplateDataService,
  entityId: () => EntityId | null,
  faceplate: () => FaceplateRecord | null,
  expressionMeta: Map<string, any>,
  dependencyIndex: Map<string, Set<string>>,
  expressionValueMap: Record<string, unknown>,
  updateBindingsForExpression: (key: string, value: unknown) => void,
  evaluateBindingExpression: (key: string, meta: any, entityId: EntityId | null, faceplateId: EntityId | null) => Promise<unknown>
) {
  const subscriptions = ref<NotificationSubscription[]>([]);
  const indirectNotifiers = ref(new Map<string, IndirectFieldNotifier>());

  async function registerNotifications() {
    await cleanupNotifications();
    if (!isLive() || !entityId()) return;

    const dependencySet = new Set<string>();

    expressionMeta.forEach((meta) => {
      if (meta.mode === 'field') {
        dependencySet.add(meta.expression);
      }
      meta.dependencies.forEach((dep: string) => dependencySet.add(dep));
    });

    if (faceplate()) {
      const channels = Array.isArray(faceplate()!.notificationChannels)
        ? faceplate()!.notificationChannels
        : [];
      channels.forEach((channel) => {
        ensureArray(channel?.fields).forEach((field) => dependencySet.add(field));
      });
    }

    for (const dependency of dependencySet) {
      const literalStrategy = new (BindingEvaluationStrategyFactory.getStrategy('literal') as any).constructor();
      const literal = (literalStrategy as any).tryEvaluateLiteral(dependency);
      if (literal.found) continue;

      const fieldStrategy = new (BindingEvaluationStrategyFactory.getStrategy('field') as any).constructor();
      const path = await (fieldStrategy as any).getFieldPath(dependency, {
        entityId: entityId(),
        faceplateId: faceplate()?.id ?? null,
        dataStore,
        service,
        expressionValueMap,
        scriptHelpers: null as any, // Will be injected
        scriptModuleExports: new Map(),
        scriptState: new Map(),
        scriptCache: new Map(),
        scriptRuntimeErrors: [],
      });
      if (!path.length) continue;

      if (path.length > 1) {
        await registerIndirectNotification(dependency, path);
      } else {
        await registerDirectNotification(dependency, path[0]);
      }
    }
  }

  async function registerIndirectNotification(dependency: string, path: FieldType[]) {
    try {
      const notifier = new IndirectFieldNotifier(
        dataStore,
        entityId()!,
        path,
        (value) => handleIndirectNotification(dependency, value)
      );

      await notifier.start();
      indirectNotifiers.value.set(dependency, notifier);
    } catch (error) {
      logger.warn(`Failed to start IndirectFieldNotifier for dependency ${dependency}:`, error);
    }
  }

  async function registerDirectNotification(dependency: string, fieldType: FieldType) {
    const notifyConfig: NotifyConfig = {
      EntityId: {
        entity_id: entityId()!,
        field_type: fieldType,
        trigger_on_change: true,
        context: [],
      },
    };

    const callback = (notification: Notification) => {
      handleDirectNotification(dependency, notification);
    };

    try {
      await dataStore.registerNotification(notifyConfig, callback);
      subscriptions.value.push({ config: notifyConfig, callback });
    } catch (error) {
      logger.warn(`Failed to register notification for dependency ${dependency}:`, error);
    }
  }

  function handleIndirectNotification(dependency: string, value: unknown) {
    const subscribers = dependencyIndex.get(dependency);
    if (!subscribers || !subscribers.size) {
      evaluateAllBindings();
      return;
    }

    subscribers.forEach((expressionKey) => {
      const meta = expressionMeta.get(expressionKey);
      if (!meta) return;

      if (meta.mode === 'field' && meta.expression === dependency) {
        expressionValueMap[expressionKey] = value;
        updateBindingsForExpression(expressionKey, value);
      } else {
        evaluateBindingExpression(expressionKey, meta, entityId(), faceplate()?.id ?? null)
          .then((value) => {
            updateBindingsForExpression(expressionKey, value);
          })
          .catch((error) => {
            logger.warn('Failed to refresh binding after notification:', error);
          });
      }
    });
  }

  function handleDirectNotification(dependency: string, notification: Notification) {
    if (!notification.current) return;
    let updatedValue: unknown = null;
    if (notification.current.value) {
      updatedValue = ValueHelpers.extract(notification.current.value);
    }

    const subscribers = dependencyIndex.get(dependency);
    if (!subscribers || !subscribers.size) {
      evaluateAllBindings();
      return;
    }

    subscribers.forEach((expressionKey) => {
      const meta = expressionMeta.get(expressionKey);
      if (!meta) return;

      if (meta.mode === 'field' && meta.expression === dependency && notification.current?.value !== undefined) {
        expressionValueMap[expressionKey] = updatedValue;
        updateBindingsForExpression(expressionKey, updatedValue);
      } else {
        evaluateBindingExpression(expressionKey, meta, entityId(), faceplate()?.id ?? null)
          .then((value) => {
            updateBindingsForExpression(expressionKey, value);
          })
          .catch((error) => {
            logger.warn('Failed to refresh binding after notification:', error);
          });
      }
    });
  }

  async function cleanupNotifications() {
    const notifierStops = Array.from(indirectNotifiers.value.values()).map((notifier) =>
      notifier.stop().catch((err) => {
        logger.warn('Failed to stop IndirectFieldNotifier during cleanup:', err);
      })
    );
    indirectNotifiers.value.clear();

    const subscriptionCleanup = subscriptions.value.map(({ config, callback }) =>
      dataStore.unregisterNotification(config, callback).catch((err: any) => {
        logger.warn('Failed to unregister notification during cleanup:', err);
      })
    );
    subscriptions.value = [];

    await Promise.all([...notifierStops, ...subscriptionCleanup]);
  }

  function isLive() {
    return true; // Will be controlled by props
  }

  function evaluateAllBindings() {
    // Will be injected from binding evaluation composable
  }

  function ensureArray<T>(value: T[] | T | null | undefined): T[] {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  }

  return {
    registerNotifications,
    cleanupNotifications,
  };
}