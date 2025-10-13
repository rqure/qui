<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import type { EntityId, FieldType, NotifyConfig, Notification } from '@/core/data/types';
import { ValueHelpers } from '@/core/data/types';
import { useDataStore } from '@/stores/data';
import FaceplateCanvas, { type CanvasComponent } from './FaceplateCanvas.vue';
import { FaceplateDataService, type FaceplateComponentRecord, type FaceplateRecord, type FaceplateBindingDefinition, type FaceplateScriptModule } from '@/apps/faceplate-builder/utils/faceplate-data';
import type { BindingMode } from '@/apps/faceplate-builder/types';
import { logger } from '@/apps/faceplate-builder/utils/logger';
import { useScriptExecution } from '@/apps/faceplate-builder/composables/useScriptExecution';
import { useBindings } from '@/apps/faceplate-builder/composables/useBindings';
import { useEventHandling } from '@/apps/faceplate-builder/composables/useEventHandling';
import { useNotifications } from '@/apps/faceplate-builder/composables/useNotifications';
import type { RenderSlot, NotificationSubscription, BindingTargetEntry, TransformContext, EventPayload } from './types/faceplate-runtime';

const props = defineProps<{
  faceplateId?: EntityId | null;
  entityId?: EntityId | null;
  faceplateData?: FaceplateRecord | null;
  live?: boolean;
  title?: string;
}>();

const dataStore = useDataStore();
const service = new FaceplateDataService(dataStore);

// Use composables for different concerns
const scriptComposable = useScriptExecution();
const {
  scriptCompilationErrors,
  scriptRuntimeErrors,
  scriptCache,
  scriptState,
  scriptModuleExports,
  getScriptHelpers,
  compileFaceplateScriptModules,
  createScriptExecutionContext,
  clearScriptState,
} = scriptComposable;

// Use simplified binding composable
const bindingComposable = useBindings(
  dataStore,
  service,
  getScriptHelpers,
  scriptModuleExports.value,
  scriptRuntimeErrors.value
);
const {
  bindingValueMap,
  expressionValueMap,
  componentLastUpdated,
  evaluateBindings,
  executeScript,
  clearCaches,
} = bindingComposable;

const { handleEventTriggered } = useEventHandling(
  dataStore,
  service,
  () => props.entityId ?? null,
  scriptRuntimeErrors.value
);

// Reactive state
const faceplate = ref<FaceplateRecord | null>(null);
const components = ref<FaceplateComponentRecord[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const showErrorPanel = ref(true);

// Format timestamp for error display
function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

const allBindings = computed(() => {
  if (!faceplate.value) return [] as FaceplateBindingDefinition[];

  // Component-level bindings are the primary pattern
  const componentLevel = components.value.flatMap((component) => {
    if (!Array.isArray(component.bindings)) return [] as FaceplateBindingDefinition[];
    return component.bindings.map((binding) => ({
      ...binding,
      component: binding.component || component.name,
    }));
  });

  return componentLevel
    .filter((binding) => binding.component && binding.property && binding.expression);
});

// Initialize notifications after allBindings is defined
const notificationComposable = useNotifications(
  dataStore,
  service,
  () => props.entityId ?? null,
  () => faceplate.value,
  allBindings.value,
  () => bindingComposable.evaluateBindings(allBindings.value, props.entityId ?? null, faceplate.value?.id ?? null)
);
const { registerNotifications, cleanupNotifications } = notificationComposable;

// Component map for efficient lookups
const componentMap = computed(() => {
  const map = new Map<string, FaceplateComponentRecord>();
  components.value.forEach((component) => {
    // Map by both ID (for layout lookups) and name (for binding lookups)
    map.set(String(component.id), component);
    map.set(component.name, component);
  });
  return map;
});

const renderedSlots = computed<RenderSlot[]>(() => {
  if (!faceplate.value) return [];
  const layout = Array.isArray(faceplate.value.configuration.layout)
    ? faceplate.value.configuration.layout
    : [];

  const slots = layout
    .map((slot) => {
      const component = componentMap.value.get(slot.component);
      if (!component) {
        return null;
      }

      const bindings: Record<string, unknown> = {};
      const lastUpdated = componentLastUpdated[component.name] || {};

      Object.entries(bindingValueMap).forEach(([key, value]) => {
        const [componentName, property] = key.split(':');
        if (componentName === component.name) {
          bindings[property] = value;
        }
      });

      const typeFromConfig = typeof component.configuration.type === 'string'
        ? component.configuration.type
        : component.componentType;

      const animationClasses = computeAnimationClasses(component, bindings);

      return {
        id: component.id,
        name: component.name,
        type: typeFromConfig,
        config: {
          ...component.configuration,
          label: component.configuration.label ?? component.name,
        },
        bindings,
        animationClasses,
        lastUpdated,
        position: {
          x: Number(slot.x ?? 0),
          y: Number(slot.y ?? 0),
          w: Number(slot.w ?? 1),
          h: Number(slot.h ?? 1),
        },
      } as RenderSlot;
    })
    .filter((slot): slot is RenderSlot => Boolean(slot));
  
  return slots;
});

// Convert renderedSlots to CanvasComponent format (preserving hierarchy)
const canvasComponents = computed<CanvasComponent[]>(() => {
  if (!faceplate.value) return [];
  
  const layout = Array.isArray(faceplate.value.configuration.layout)
    ? faceplate.value.configuration.layout
    : [];
  
  if (import.meta.env.DEV && layout.length > 0) {
    console.log('FaceplateRuntime - Layout items:', layout);
    console.log('FaceplateRuntime - RenderedSlots:', renderedSlots.value.map(s => ({ id: s.id, name: s.name, type: s.type })));
  }
  
  // First pass: create components with parentId and eventHandlers
  const eventHandlersFromConfig = faceplate.value.configuration.eventHandlers || [];
  
  const components = renderedSlots.value.map(slot => {
    // Find parent ID from layout data
    const layoutItem = layout.find(item => item.component === slot.name);
    const parentId = layoutItem?.parentId || null;
    
    // Find event handlers for this component (using component name, not ID)
    const handlers = eventHandlersFromConfig.filter((h: any) => String(h.componentId) === slot.name);
    
    // Add automatic event handlers for twoWay bindings
    const componentBindings = allBindings.value.filter((b: any) => b.component === slot.name);
    const twoWayBindings = componentBindings.filter((b: any) => b.mode === 'twoWay');
    
    // For each twoWay binding, create an automatic write handler
    twoWayBindings.forEach((binding: any) => {
      // Check if there's already a handler for this event
      const hasExistingHandler = handlers.some((h: any) => 
        h.trigger === 'onChange' || h.trigger === 'onInput'
      );
      
      if (!hasExistingHandler) {
        // Create automatic write handler
        handlers.push({
          id: `auto-twoway-${binding.id}`,
          componentId: slot.name,
          trigger: 'onChange',
          action: {
            type: 'writeField',
            fieldPath: binding.expression,
            valueSource: 'component',
          },
          enabled: true,
          description: `Auto-generated for two-way binding to ${binding.expression}`,
        });
      }
    });
    
    if (import.meta.env.DEV && parentId) {
      console.log(`FaceplateRuntime - Component ${slot.id} has parentId: ${parentId}`);
    }
    
    return {
      id: slot.id,
      type: slot.type,
      position: {
        x: slot.position.x,
        y: slot.position.y,
      },
      size: {
        x: slot.position.w,
        y: slot.position.h,
      },
      config: slot.config,
      bindings: slot.bindings,
      parentId: parentId,
      eventHandlers: handlers.length > 0 ? handlers : undefined,
    };
  });
  
  // Second pass: build children arrays for hierarchical rendering
  const childrenMap = new Map<string | number, CanvasComponent[]>();
  components.forEach(component => {
    if (component.parentId) {
      // Normalize parentId to string for consistent Map keys
      const parentKey = String(component.parentId);
      if (!childrenMap.has(parentKey)) {
        childrenMap.set(parentKey, []);
      }
      childrenMap.get(parentKey)!.push(component);
    }
  });
  
  // Third pass: attach children arrays to their parents and filter to root only
  const allComponents = components.map(component => {
    // Normalize component ID to string for Map lookup
    const componentKey = String(component.id);
    const children = childrenMap.get(componentKey);
    
    if (import.meta.env.DEV && children && children.length > 0) {
      console.log(`FaceplateRuntime - Component ${component.id} (${component.type}) has ${children.length} children:`, children.map(c => ({ id: c.id, type: c.type })));
    }
    
    return {
      ...component,
      children: children || undefined,
    };
  });
  
  // Only return root-level components (those without a parent)
  const result = allComponents.filter(component => !component.parentId);
  
  if (import.meta.env.DEV) {
    console.log('FaceplateRuntime - Final canvasComponents (root only):', result);
  }
  
  return result;
});

const viewportSize = computed(() => {
  const viewport = faceplate.value?.configuration?.metadata?.viewport as { width?: number; height?: number } | undefined;
  if (!viewport) return undefined;
  return {
    x: viewport.width ?? 960,
    y: viewport.height ?? 720,
  };
});

function computeAnimationClasses(component: FaceplateComponentRecord, bindings: Record<string, unknown>): string[] {
  if (!Array.isArray(component.animationRules) || component.animationRules.length === 0) {
    return [];
  }
  const classes: string[] = [];
  component.animationRules.forEach((rule) => {
    const expression = typeof rule.expression === 'string' ? rule.expression : '';
    const animation = typeof rule.animation === 'string' ? rule.animation : '';
    if (!expression || !animation) return;
    const value = expressionValueMap[expression];
    if (rule.activeValue !== undefined) {
      if (value === rule.activeValue) {
        classes.push(animation);
      }
      return;
    }
    if (value) {
      classes.push(animation);
    }
  });
  return classes;
}

async function initialize() {
  loading.value = true;
  error.value = null;

  try {
    if (props.faceplateData) {
      faceplate.value = props.faceplateData;
    } else if (props.faceplateId) {
      faceplate.value = await service.readFaceplate(props.faceplateId);
    } else {
      faceplate.value = null;
    }

    if (faceplate.value) {
      const [componentsData] = await Promise.all([
        service.readComponents(faceplate.value.components),
        Promise.resolve(scriptComposable.compileFaceplateScriptModules(faceplate.value.scriptModules ?? []))
      ]);
      components.value = componentsData;
    } else {
      components.value = [];
      scriptComposable.compileFaceplateScriptModules([]);
    }

    bindingComposable.evaluateBindings(allBindings.value, props.entityId ?? null, faceplate.value?.id ?? null);
  } catch (err) {
    logger.error('FaceplateRuntime initialization failed:', err);
    error.value = err instanceof Error ? err.message : 'Failed to load faceplate';
  } finally {
    loading.value = false;
  }
}

watch(
  () => [props.faceplateId, props.faceplateData],
  async () => {
    await initialize();
  },
  { immediate: true },
);

watch(
  () => props.entityId,
  async () => {
    await bindingComposable.evaluateBindings(allBindings.value, props.entityId ?? null, faceplate.value?.id ?? null);
    await notificationComposable.registerNotifications();
  },
);

onBeforeUnmount(async () => {
  await notificationComposable.cleanupNotifications();

  // Clear caches to prevent memory leaks
  scriptComposable.clearScriptState();
  bindingComposable.clearCaches();
});

defineExpose({
  refresh: () => bindingComposable.evaluateBindings(allBindings.value, props.entityId ?? null, faceplate.value?.id ?? null),
});
</script>

<template>
  <div class="faceplate-runtime">
    <div v-if="loading" class="runtime-state loading">Loading faceplate…</div>
    <div v-else-if="error" class="runtime-state error">{{ error }}</div>
    <div v-else-if="!faceplate" class="runtime-state empty">No faceplate selected</div>
    <div v-else-if="!entityId" class="runtime-state empty">Select an entity to drive this faceplate (entityId: {{ entityId }})</div>
    
    <!-- Enhanced error panel for script errors -->
    <div 
      v-if="(scriptCompilationErrors.length > 0 || scriptRuntimeErrors.length > 0) && showErrorPanel && faceplate"
      class="error-panel"
    >
      <div class="error-panel__header">
        <div class="error-panel__title">
          <span class="error-panel__icon">⚠️</span>
          <span>Script Errors ({{ scriptCompilationErrors.length + scriptRuntimeErrors.length }})</span>
        </div>
        <button 
          type="button" 
          class="error-panel__close"
          @click="showErrorPanel = false"
        >
          ✕
        </button>
      </div>
      
      <div class="error-panel__content">
        <!-- Compilation Errors -->
        <div v-if="scriptCompilationErrors.length > 0" class="error-panel__section">
          <div class="error-panel__section-title">Compilation Errors</div>
          <div 
            v-for="(err, idx) in scriptCompilationErrors" 
            :key="`compile-${idx}`" 
            class="error-panel__item error-panel__item--compile"
          >
            <div class="error-panel__item-header">
              <span class="error-panel__item-badge">Module</span>
              <span class="error-panel__item-module">{{ err.module }}</span>
              <span class="error-panel__item-time">{{ formatTimestamp(err.timestamp) }}</span>
            </div>
            <div class="error-panel__item-message">{{ err.error }}</div>
          </div>
        </div>
        
        <!-- Runtime Errors -->
        <div v-if="scriptRuntimeErrors.length > 0" class="error-panel__section">
          <div class="error-panel__section-title">Runtime Errors</div>
          <div 
            v-for="(err, idx) in scriptRuntimeErrors.slice(-10)" 
            :key="`runtime-${idx}`" 
            class="error-panel__item error-panel__item--runtime"
          >
            <div class="error-panel__item-header">
              <span class="error-panel__item-badge">Context</span>
              <span class="error-panel__item-context">{{ err.context }}</span>
              <span class="error-panel__item-time">{{ formatTimestamp(err.timestamp) }}</span>
            </div>
            <div class="error-panel__item-message">{{ err.error }}</div>
          </div>
        </div>
      </div>
      
      <div class="error-panel__footer">
        <button 
          type="button" 
          class="error-panel__action"
          @click="scriptCompilationErrors = []; scriptRuntimeErrors = []"
        >
          Clear All
        </button>
      </div>
    </div>
    
    <!-- Show button to reopen error panel if hidden -->
    <button
      v-if="(scriptCompilationErrors.length > 0 || scriptRuntimeErrors.length > 0) && !showErrorPanel && faceplate"
      type="button"
      class="error-panel__reopen"
      @click="showErrorPanel = true"
    >
      ⚠️ {{ scriptCompilationErrors.length + scriptRuntimeErrors.length }} Errors
    </button>
    
    <FaceplateCanvas
      v-if="!loading && !error && faceplate && entityId"
      class="faceplate-runtime__canvas"
      :components="canvasComponents"
      :viewport="viewportSize"
      :edit-mode="false"
      :show-grid="false"
      :show-viewport-boundary="false"
      @event-triggered="handleEventTriggered"
    />
  </div>
</template>

<style scoped>
.faceplate-runtime {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at top, rgba(0, 0, 0, 0.35), rgba(0, 0, 0, 0.65));
  overflow: hidden;
}

.runtime-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  letter-spacing: 0.05em;
  color: var(--qui-text-secondary);
}

.runtime-state.error {
  color: var(--qui-danger-color);
}

.faceplate-runtime__canvas {
  flex: 1;
  border: none;
  border-radius: 0;
  background: transparent;
  overflow: hidden;
}

/* Enhanced Error Panel */
.error-panel {
  position: fixed;
  top: 16px;
  right: 16px;
  width: 480px;
  max-height: 600px;
  display: flex;
  flex-direction: column;
  background: rgba(20, 0, 0, 0.96);
  border: 2px solid rgba(255, 80, 80, 0.6);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  z-index: 10000;
  animation: error-panel-slide-in 0.3s ease-out;
  pointer-events: auto;
}

@keyframes error-panel-slide-in {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.error-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid rgba(255, 80, 80, 0.3);
  background: rgba(255, 50, 50, 0.15);
}

.error-panel__title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 15px;
  font-weight: 600;
  color: #ffcccc;
  letter-spacing: 0.03em;
}

.error-panel__icon {
  font-size: 18px;
  animation: error-icon-pulse 2s ease-in-out infinite;
}

@keyframes error-icon-pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
}

.error-panel__close {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 6px;
  color: #ffcccc;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.error-panel__close:hover {
  background: rgba(255, 255, 255, 0.2);
  color: #ffffff;
}

.error-panel__content {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.error-panel__section {
  margin-bottom: 16px;
}

.error-panel__section:last-child {
  margin-bottom: 0;
}

.error-panel__section-title {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255, 200, 200, 0.8);
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(255, 80, 80, 0.2);
}

.error-panel__item {
  margin-bottom: 10px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 8px;
  border-left: 3px solid rgba(255, 100, 100, 0.6);
}

.error-panel__item--compile {
  border-left-color: rgba(255, 150, 0, 0.8);
}

.error-panel__item--runtime {
  border-left-color: rgba(255, 50, 50, 0.8);
}

.error-panel__item-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.error-panel__item-badge {
  padding: 2px 8px;
  background: rgba(255, 100, 100, 0.3);
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(255, 200, 200, 0.9);
}

.error-panel__item-module,
.error-panel__item-context {
  font-size: 12px;
  font-weight: 600;
  color: #ffaaaa;
  font-family: 'Courier New', monospace;
}

.error-panel__item-time {
  margin-left: auto;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  font-family: 'Courier New', monospace;
}

.error-panel__item-message {
  font-size: 12px;
  font-family: 'Courier New', monospace;
  color: #ffdddd;
  line-height: 1.5;
  word-break: break-word;
  padding: 8px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
}

.error-panel__footer {
  padding: 12px 18px;
  border-top: 1px solid rgba(255, 80, 80, 0.3);
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  background: rgba(0, 0, 0, 0.2);
}

.error-panel__action {
  padding: 8px 16px;
  background: rgba(255, 100, 100, 0.2);
  border: 1px solid rgba(255, 100, 100, 0.4);
  border-radius: 6px;
  color: #ffcccc;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.error-panel__action:hover {
  background: rgba(255, 100, 100, 0.3);
  border-color: rgba(255, 100, 100, 0.6);
  color: #ffffff;
}

.error-panel__reopen {
  position: fixed;
  top: 16px;
  right: 16px;
  padding: 10px 16px;
  background: rgba(20, 0, 0, 0.96);
  border: 2px solid rgba(255, 80, 80, 0.6);
  border-radius: 8px;
  color: #ffcccc;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  z-index: 9999;
  transition: all 0.2s;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  pointer-events: auto;
}

.error-panel__reopen:hover {
  background: rgba(40, 0, 0, 1);
  border-color: rgba(255, 80, 80, 0.8);
  transform: scale(1.05);
}

/* Custom scrollbar for error panel */
.error-panel__content::-webkit-scrollbar {
  width: 8px;
}

.error-panel__content::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
}

.error-panel__content::-webkit-scrollbar-thumb {
  background: rgba(255, 100, 100, 0.4);
  border-radius: 4px;
}

.error-panel__content::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 100, 100, 0.6);
}
</style>
