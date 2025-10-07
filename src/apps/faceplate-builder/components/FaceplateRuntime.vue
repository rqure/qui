<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import type { EntityId, FieldType, NotifyConfig, Notification } from '@/core/data/types';
import { ValueHelpers } from '@/core/data/types';
import { useDataStore } from '@/stores/data';
import FaceplateComponentRenderer from './FaceplateComponentRenderer.vue';
import { FaceplateDataService, type FaceplateComponentRecord, type FaceplateRecord, type FaceplateBindingDefinition } from '@/apps/faceplate-builder/utils/faceplate-data';

interface RenderSlot {
  id: EntityId;
  name: string;
  type: string;
  config: Record<string, any>;
  bindings: Record<string, unknown>;
  animationClasses: string[];
  lastUpdated: Record<string, number>;
  position: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
}

interface NotificationSubscription {
  config: NotifyConfig;
  callback: (notification: Notification) => void;
}

const props = defineProps<{
  faceplateId?: EntityId | null;
  entityId?: EntityId | null;
  faceplateData?: FaceplateRecord | null;
  live?: boolean;
  title?: string;
}>();

const dataStore = useDataStore();
const service = new FaceplateDataService(dataStore);

const faceplate = ref<FaceplateRecord | null>(null);
const components = ref<FaceplateComponentRecord[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const isLive = computed(() => props.live !== false);

const bindingValueMap = reactive<Record<string, unknown>>({});
const expressionValueMap = reactive<Record<string, unknown>>({});
const bindingPaths = new Map<string, FieldType[]>();
const bindingTargets = new Map<string, { entityId: EntityId; fieldType: FieldType }>();
const expressionToBindings = new Map<string, Array<{ component: string; property: string; transform?: string }>>();
const componentLastUpdated = reactive<Record<string, Record<string, number>>>({});
let subscriptions: NotificationSubscription[] = [];

const allBindings = computed(() => {
  if (!faceplate.value) return [] as FaceplateBindingDefinition[];

  const fromConfig = Array.isArray(faceplate.value.configuration.bindings)
    ? faceplate.value.configuration.bindings
    : [];

  const fromRecord = Array.isArray(faceplate.value.bindings)
    ? faceplate.value.bindings
    : [];

  const componentLevel = components.value.flatMap((component) => {
    if (!Array.isArray(component.bindings)) return [] as FaceplateBindingDefinition[];
    return component.bindings.map((binding) => ({
      ...binding,
      component: binding.component || component.name,
    }));
  });

  return [...fromConfig, ...fromRecord, ...componentLevel].filter((binding) => binding.component && binding.property && binding.expression);
});

const componentMap = computed(() => {
  const map = new Map<string, FaceplateComponentRecord>();
  components.value.forEach((component) => {
    map.set(component.name, component);
  });
  return map;
});

const renderedSlots = computed<RenderSlot[]>(() => {
  if (!faceplate.value) return [];
  const layout = Array.isArray(faceplate.value.configuration.layout)
    ? faceplate.value.configuration.layout
    : [];

  return layout
    .map((slot) => {
      const component = componentMap.value.get(slot.component);
      if (!component) return null;

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
});

const gridTemplateColumns = computed(() => {
  if (renderedSlots.value.length === 0) {
    return 'repeat(1, minmax(220px, 1fr))';
  }
  const columns = Math.max(...renderedSlots.value.map((slot) => slot.position.x + slot.position.w), 1);
  return `repeat(${columns}, minmax(220px, 1fr))`;
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
      components.value = await service.readComponents(faceplate.value.components);
    } else {
      components.value = [];
    }

    buildBindingMaps();
    await evaluateAllBindings();
    await registerNotifications();
  } catch (err) {
    console.error('FaceplateRuntime initialization failed', err);
    error.value = err instanceof Error ? err.message : 'Failed to load faceplate';
  } finally {
    loading.value = false;
  }
}

function buildBindingMaps() {
  expressionToBindings.clear();
  Object.keys(bindingValueMap).forEach((key) => delete bindingValueMap[key]);
  bindingPaths.clear();
  bindingTargets.clear();
  Object.keys(componentLastUpdated).forEach((key) => delete componentLastUpdated[key]);

  for (const binding of allBindings.value) {
    const componentName = binding.component || '';
    const property = binding.property || '';
    const expression = binding.expression || '';
    if (!componentName || !property || !expression) continue;

    const key = `${componentName}:${property}`;
    if (!expressionToBindings.has(expression)) {
      expressionToBindings.set(expression, []);
    }
    expressionToBindings.get(expression)!.push({ component: componentName, property, transform: binding.transform });

    if (!bindingValueMap[key]) {
      bindingValueMap[key] = null;
    }

    if (!componentLastUpdated[componentName]) {
      componentLastUpdated[componentName] = {};
    }
  }
}

async function evaluateAllBindings() {
  if (!faceplate.value || !props.entityId) {
    Object.keys(bindingValueMap).forEach((key) => (bindingValueMap[key] = null));
    return;
  }

  const expressions = Array.from(expressionToBindings.keys());
  for (const expression of expressions) {
    const value = await evaluateExpression(expression);
    updateBindingsForExpression(expression, value);
  }
}

async function evaluateExpression(expression: string): Promise<unknown> {
  const literal = tryEvaluateLiteral(expression);
  if (literal.found) {
    expressionValueMap[expression] = literal.value;
    return literal.value;
  }

  if (!props.entityId) {
    expressionValueMap[expression] = null;
    return null;
  }

  const path = await getFieldPath(expression);
  if (path.length === 0) {
    expressionValueMap[expression] = null;
    return null;
  }

  const [value] = await dataStore.read(props.entityId, path);
  const extracted = ValueHelpers.extract(value);
  expressionValueMap[expression] = extracted;
  await resolveBindingTarget(expression, path);
  return extracted;
}

function tryEvaluateLiteral(expression: string): { found: boolean; value: unknown } {
  if (!expression) return { found: false, value: null };
  const trimmed = expression.trim();

  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith('\'') && trimmed.endsWith('\''))) {
    return { found: true, value: trimmed.slice(1, -1) };
  }

  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    return { found: true, value: Number(trimmed) };
  }

  if (trimmed === 'true') return { found: true, value: true };
  if (trimmed === 'false') return { found: true, value: false };
  if (trimmed === 'null') return { found: true, value: null };

  return { found: false, value: null };
}

async function getFieldPath(expression: string): Promise<FieldType[]> {
  if (bindingPaths.has(expression)) {
    return bindingPaths.get(expression)!;
  }

  const segments = expression.split('->').map((segment) => segment.trim()).filter(Boolean);
  const fieldTypes: FieldType[] = [];

  for (const segment of segments) {
    try {
      const fieldType = await service.getFieldType(segment);
      fieldTypes.push(fieldType);
    } catch (error) {
      console.warn(`Unable to resolve field type for segment "${segment}" in expression "${expression}"`, error);
      bindingPaths.set(expression, []);
      return [];
    }
  }

  bindingPaths.set(expression, fieldTypes);
  return fieldTypes;
}

async function resolveBindingTarget(expression: string, fieldPath: FieldType[]) {
  if (bindingTargets.has(expression)) return;
  if (!props.entityId) return;

  try {
    const [resolvedEntity, resolvedFieldType] = await dataStore.resolveIndirection(props.entityId, fieldPath);
    bindingTargets.set(expression, { entityId: resolvedEntity, fieldType: resolvedFieldType });
  } catch (err) {
    console.warn(`Failed to resolve indirection for expression ${expression}`, err);
  }
}

function updateBindingsForExpression(expression: string, value: unknown) {
  if (!expressionToBindings.has(expression)) return;

  const bindings = expressionToBindings.get(expression)!;
  bindings.forEach(({ component, property, transform }) => {
    const key = `${component}:${property}`;
    const transformed = applyTransform(transform, value);
    bindingValueMap[key] = transformed;

    if (!componentLastUpdated[component]) {
      componentLastUpdated[component] = {};
    }
    componentLastUpdated[component][property] = Date.now();
  });
}

function applyTransform(transform: string | undefined, value: unknown): unknown {
  if (!transform) return value;
  try {
    const fn = new Function('value', `return (${transform});`);
    return fn(value);
  } catch (error) {
    console.warn('Failed to apply transform', transform, error);
    return value;
  }
}

async function registerNotifications() {
  await cleanupNotifications();
  if (!isLive.value || !props.entityId) return;

  const expressionSet = new Set<string>(expressionToBindings.keys());

  if (faceplate.value) {
    faceplate.value.notificationChannels.forEach((channel) => {
      ensureArray(channel?.fields).forEach((field) => expressionSet.add(field));
    });
  }

  for (const expression of expressionSet) {
    const literal = tryEvaluateLiteral(expression);
    if (literal.found) continue;

    const path = await getFieldPath(expression);
    if (!path.length) continue;

    await resolveBindingTarget(expression, path);
    const target = bindingTargets.get(expression);
    if (!target) continue;

    const notifyConfig: NotifyConfig = {
      EntityId: {
        entity_id: target.entityId,
        field_type: target.fieldType,
        trigger_on_change: true,
        context: [],
      },
    };

    const callback = (notification: Notification) => {
      if (!notification.current) return;
      let updatedValue: unknown = null;
      if (notification.current.value) {
        updatedValue = ValueHelpers.extract(notification.current.value);
      }

      expressionValueMap[expression] = updatedValue;

      if (expressionToBindings.has(expression)) {
        updateBindingsForExpression(expression, updatedValue);
      } else {
        // This expression is tracked for relationship changes (e.g., Parent). Re-evaluate all bindings.
        void evaluateAllBindings();
      }
    };

    try {
      await dataStore.registerNotification(notifyConfig, callback);
      subscriptions.push({ config: notifyConfig, callback });
    } catch (error) {
      console.warn(`Failed to register notification for expression ${expression}`, error);
    }
  }
}

async function cleanupNotifications() {
  if (!subscriptions.length) return;
  await Promise.all(
    subscriptions.map(({ config, callback }) => dataStore.unregisterNotification(config, callback).catch(() => undefined)),
  );
  subscriptions = [];
}

function ensureArray<T>(value: T[] | T | null | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function getSlotStyle(slot: RenderSlot) {
  return {
    gridColumnStart: String(slot.position.x + 1),
    gridColumnEnd: `span ${Math.max(slot.position.w, 1)}`,
    gridRowStart: String(slot.position.y + 1),
    gridRowEnd: `span ${Math.max(slot.position.h, 1)}`,
  };
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
    await evaluateAllBindings();
    await registerNotifications();
  },
);

onMounted(async () => {
  if (!faceplate.value) {
    await initialize();
  }
});

onBeforeUnmount(async () => {
  await cleanupNotifications();
});

defineExpose({
  refresh: () => evaluateAllBindings(),
});
</script>

<template>
  <div class="faceplate-runtime">
    <div v-if="loading" class="runtime-state loading">Loading faceplate…</div>
    <div v-else-if="error" class="runtime-state error">{{ error }}</div>
    <div v-else-if="!faceplate" class="runtime-state empty">No faceplate selected</div>
    <div v-else-if="!entityId" class="runtime-state empty">Select an entity to drive this faceplate</div>
    <div v-else class="runtime-grid" :style="{ gridTemplateColumns: gridTemplateColumns }">
      <div
        v-for="slot in renderedSlots"
        :key="slot.id"
        class="runtime-slot"
        :style="getSlotStyle(slot)"
      >
        <FaceplateComponentRenderer :component="slot" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.faceplate-runtime {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  padding: 16px;
  background: radial-gradient(circle at top, rgba(0, 0, 0, 0.35), rgba(0, 0, 0, 0.65));
  overflow: auto;
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

.runtime-grid {
  display: grid;
  grid-auto-rows: minmax(160px, auto);
  gap: 18px;
}

.runtime-slot {
  min-height: 160px;
}
</style>
