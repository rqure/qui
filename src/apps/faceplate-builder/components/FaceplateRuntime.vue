<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import type { EntityId, FieldType, NotifyConfig, Notification } from '@/core/data/types';
import { ValueHelpers } from '@/core/data/types';
import { useDataStore } from '@/stores/data';
import FaceplateCanvas, { type CanvasComponent } from './FaceplateCanvas.vue';
import { FaceplateDataService, type FaceplateComponentRecord, type FaceplateRecord, type FaceplateBindingDefinition, type FaceplateScriptModule } from '@/apps/faceplate-builder/utils/faceplate-data';
import type { BindingMode } from '@/apps/faceplate-builder/types';
import { IndirectFieldNotifier } from '@/apps/faceplate-builder/utils/indirect-field-notifier';

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

type BindingTargetEntry = {
  component: string;
  property: string;
  transform?: string | null;
};

type ScriptHelpers = {
  clamp(value: number, min: number, max: number): number;
  lerp(start: number, end: number, t: number): number;
  round(value: number, precision?: number): number;
  format(value: unknown, digits?: number): string;
  colorRamp(value: number, stops: Array<{ stop: number; color: string }>): string;
};

type ScriptExecutionContext = {
  entityId: EntityId | null;
  faceplateId: EntityId | null;
  expressionKey: string;
  get(path: string): Promise<unknown>;
  getCached(expressionKey: string): unknown;
  getBindingValue(componentId: string, property: string): unknown;
  setState(key: string, value: unknown): void;
  getState<T>(key: string, defaultValue?: T): T | undefined;
  bindingsSnapshot(): Record<string, unknown>;
  module(name: string): Record<string, unknown> | undefined;
  modules(): Record<string, Record<string, unknown>>;
};

type TransformContext = {
  component: string;
  property: string;
  expressionKey: string;
  entityId: EntityId | null;
  faceplateId: EntityId | null;
  helpers: ScriptHelpers;
  module(name: string): Record<string, unknown> | undefined;
  modules(): Record<string, Record<string, unknown>>;
};

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
const expressionTargets = new Map<string, BindingTargetEntry[]>();
const expressionMeta = new Map<string, { expression: string; mode: BindingMode; dependencies: string[]; description?: string }>();
const dependencyIndex = new Map<string, Set<string>>();
const componentLastUpdated = reactive<Record<string, Record<string, number>>>({});
let subscriptions: NotificationSubscription[] = [];
const indirectNotifiers = new Map<string, IndirectFieldNotifier>();
const scriptCache = new Map<string, (context: ScriptExecutionContext, helpers: ScriptHelpers) => Promise<unknown>>();
const scriptState = new Map<string, Record<string, unknown>>();
const scriptModuleExports = new Map<string, Record<string, unknown>>();

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
  
  // First pass: create components with parentId
  const components = renderedSlots.value.map(slot => {
    // Find parent ID from layout data
    const layoutItem = layout.find(item => item.component === String(slot.id));
    const parentId = layoutItem?.parentId || null;
    
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
    // Load faceplate data if needed
    if (props.faceplateData) {
      faceplate.value = props.faceplateData;
    } else if (props.faceplateId) {
      faceplate.value = await service.readFaceplate(props.faceplateId);
    } else {
      faceplate.value = null;
    }

    if (faceplate.value) {
      // Load components and compile scripts in parallel
      const [componentsData] = await Promise.all([
        service.readComponents(faceplate.value.components),
        Promise.resolve(compileFaceplateScriptModules(faceplate.value.scriptModules ?? []))
      ]);
      components.value = componentsData;
    } else {
      components.value = [];
      compileFaceplateScriptModules([]);
    }

    // Build binding maps synchronously
    buildBindingMaps();
    
    // Evaluate bindings and register notifications in parallel
    await Promise.all([
      evaluateAllBindings(),
      registerNotifications()
    ]);
  } catch (err) {
    console.error('FaceplateRuntime initialization failed', err);
    error.value = err instanceof Error ? err.message : 'Failed to load faceplate';
  } finally {
    loading.value = false;
  }
}

function determineBindingMode(binding: FaceplateBindingDefinition): BindingMode {
  if (binding.mode) {
    return binding.mode;
  }
  const trimmed = (binding.expression || '').trim();
  if (trimmed.startsWith('script:')) {
    return 'script';
  }
  const literal = tryEvaluateLiteral(trimmed);
  if (literal.found) {
    return 'literal';
  }
  return 'field';
}

function sanitizeBindingExpression(expression: string, mode: BindingMode): string {
  if (mode === 'script' && expression.trim().startsWith('script:')) {
    return expression.trim().slice('script:'.length);
  }
  return expression;
}

function makeExpressionKey(expression: string, mode: BindingMode): string {
  return `${mode}::${expression}`;
}

function collectBindingDependencies(
  binding: FaceplateBindingDefinition,
  mode: BindingMode,
  expression: string,
): string[] {
  if (mode === 'field') {
    return [expression];
  }
  if (mode === 'script') {
    const deps = Array.isArray(binding.dependencies) ? binding.dependencies : [];
    return deps.map((dep) => dep.trim()).filter(Boolean);
  }
  return [];
}

function compileFaceplateScriptModules(modules: FaceplateScriptModule[]) {
  scriptModuleExports.clear();
  modules.forEach((moduleDef, index) => {
    const name = moduleDef?.name?.trim() || `module-${index + 1}`;
    const code = moduleDef?.code ?? '';
    if (!code.trim()) {
      return;
    }

    try {
      const factory = new Function(
        'helpers',
        'module',
        'exports',
        '"use strict";\n' + code + '\n',
      );
      const moduleObj: { exports: Record<string, unknown> } = { exports: {} };
      const exportsRef = moduleObj.exports;
      factory(getScriptHelpers(), moduleObj, exportsRef);
      const exports = moduleObj.exports || exportsRef;
      scriptModuleExports.set(name, exports as Record<string, unknown>);
    } catch (error) {
      console.warn(`Failed to compile faceplate script module ${name}`, error);
    }
  });
}

async function evaluateBindingExpression(
  expressionKey: string,
  meta: { expression: string; mode: BindingMode; dependencies: string[] },
): Promise<unknown> {
  if (!props.entityId) {
    expressionValueMap[expressionKey] = null;
    return null;
  }

  switch (meta.mode) {
    case 'literal': {
      const literal = tryEvaluateLiteral(meta.expression);
      const value = literal.found ? literal.value : meta.expression;
      expressionValueMap[expressionKey] = value;
      return value;
    }
    case 'field': {
      const value = await evaluateFieldExpression(meta.expression);
      expressionValueMap[expressionKey] = value;
      return value;
    }
    case 'script': {
      const value = await evaluateScriptExpression(expressionKey, meta.expression);
      expressionValueMap[expressionKey] = value;
      return value;
    }
    default:
      expressionValueMap[expressionKey] = null;
      return null;
  }
}

async function evaluateFieldExpression(expression: string): Promise<unknown> {
  if (!props.entityId) {
    return null;
  }

  const path = await getFieldPath(expression);
  if (!path.length) {
    return null;
  }

  const [value] = await dataStore.read(props.entityId, path);
  const extracted = ValueHelpers.extract(value);
  await resolveBindingTarget(expression, path);
  return extracted;
}

async function evaluateScriptExpression(expressionKey: string, source: string): Promise<unknown> {
  if (!props.entityId) {
    return null;
  }

  try {
    const fn = getOrCreateScriptFunction(source);
    const context = createScriptExecutionContext(expressionKey);
    const result = await fn(context, getScriptHelpers());
    return result;
  } catch (error) {
    console.warn('Faceplate script evaluation failed', error);
    return null;
  }
}

function normalizeScriptBody(source: string): string {
  const trimmed = source.trim();
  if (!trimmed) {
    return 'return null;';
  }

  const hasReturn = /\breturn\b/.test(trimmed);
  if (hasReturn) {
    return trimmed;
  }

  if (trimmed.endsWith(';')) {
    return `${trimmed} return undefined;`;
  }

  return `return (${trimmed});`;
}

function getOrCreateScriptFunction(source: string) {
  const cached = scriptCache.get(source);
  if (cached) {
    return cached;
  }

  const body = normalizeScriptBody(source);
  const factory = new Function(
    'context',
    'helpers',
    '"use strict"; return (async () => {\n' + body + '\n})();',
  );

  const executor = (context: ScriptExecutionContext, helpers: ScriptHelpers) =>
    Promise.resolve(factory(context, helpers));

  scriptCache.set(source, executor);
  return executor;
}

function getOrCreateScriptStateBucket(expressionKey: string): Record<string, unknown> {
  if (!scriptState.has(expressionKey)) {
    scriptState.set(expressionKey, {});
  }
  return scriptState.get(expressionKey)!;
}

function createScriptExecutionContext(expressionKey: string): ScriptExecutionContext {
  const state = getOrCreateScriptStateBucket(expressionKey);

  return {
    entityId: props.entityId ?? null,
    faceplateId: faceplate.value?.id ?? null,
    expressionKey,
    async get(path: string) {
      const value = await evaluateFieldExpression(path);
      const fieldKey = makeExpressionKey(path, 'field');
      if (!expressionMeta.has(fieldKey)) {
        expressionValueMap[fieldKey] = value;
      }
      return value;
    },
    getCached(targetKey: string) {
      return expressionValueMap[targetKey];
    },
    getBindingValue(componentId: string, property: string) {
      return bindingValueMap[`${componentId}:${property}`];
    },
    setState(key: string, value: unknown) {
      state[key] = value;
    },
    getState<T>(key: string, defaultValue?: T) {
      if (Object.prototype.hasOwnProperty.call(state, key)) {
        return state[key] as T;
      }
      return defaultValue;
    },
    bindingsSnapshot() {
      return { ...bindingValueMap };
    },
    module(name: string) {
      return scriptModuleExports.get(name);
    },
    modules() {
      return Object.fromEntries(scriptModuleExports.entries());
    },
  };
}

const sharedScriptHelpers: ScriptHelpers = {
  clamp(value: number, min: number, max: number) {
    const v = Number(value);
    return Math.min(Math.max(v, min), max);
  },
  lerp(start: number, end: number, t: number) {
    return start + (end - start) * t;
  },
  round(value: number, precision: number = 0) {
    const factor = Math.pow(10, precision);
    return Math.round(Number(value) * factor) / factor;
  },
  format(value: unknown, digits: number = 2) {
    if (value === null || value === undefined) {
      return '';
    }
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) {
        return String(value);
      }
      return value.toFixed(digits);
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    return String(value);
  },
  colorRamp(value: number, stops: Array<{ stop: number; color: string }>) {
    if (!stops.length) {
      return '#ffffff';
    }
    const sorted = [...stops].sort((a, b) => a.stop - b.stop);
    if (value <= sorted[0].stop) {
      return sorted[0].color;
    }
    if (value >= sorted[sorted.length - 1].stop) {
      return sorted[sorted.length - 1].color;
    }
    for (let i = 0; i < sorted.length - 1; i += 1) {
      const current = sorted[i];
      const next = sorted[i + 1];
      if (value >= current.stop && value <= next.stop) {
        const ratio = (value - current.stop) / (next.stop - current.stop);
        return ratio < 0.5 ? current.color : next.color;
      }
    }
    return sorted[sorted.length - 1].color;
  },
};

function getScriptHelpers(): ScriptHelpers {
  return sharedScriptHelpers;
}

function buildBindingMaps() {
  expressionTargets.clear();
  expressionMeta.clear();
  dependencyIndex.clear();
  Object.keys(bindingValueMap).forEach((key) => delete bindingValueMap[key]);
  Object.keys(expressionValueMap).forEach((key) => delete expressionValueMap[key]);
  bindingPaths.clear();
  bindingTargets.clear();
  Object.keys(componentLastUpdated).forEach((key) => delete componentLastUpdated[key]);
  scriptState.clear();

  for (const binding of allBindings.value) {
    const componentName = binding.component || '';
    const property = binding.property || '';
    const expression = binding.expression || '';
    if (!componentName || !property || !expression) continue;

    const mode = determineBindingMode(binding);
    const normalizedExpression = sanitizeBindingExpression(expression, mode);
    const expressionKey = makeExpressionKey(normalizedExpression, mode);
    const dependencies = collectBindingDependencies(binding, mode, normalizedExpression);

    if (!expressionMeta.has(expressionKey)) {
      expressionMeta.set(expressionKey, {
        expression: normalizedExpression,
        mode,
        dependencies: [...dependencies],
        description: binding.description,
      });
    } else {
      const existing = expressionMeta.get(expressionKey)!;
      const merged = new Set([...existing.dependencies, ...dependencies]);
      existing.dependencies = Array.from(merged);
    }

    if (!expressionTargets.has(expressionKey)) {
      expressionTargets.set(expressionKey, []);
    }

    expressionTargets.get(expressionKey)!.push({
      component: componentName,
      property,
      transform: binding.transform ?? null,
    });

    const bindingSlotKey = `${componentName}:${property}`;
    if (!bindingValueMap[bindingSlotKey]) {
      bindingValueMap[bindingSlotKey] = null;
    }

    if (!componentLastUpdated[componentName]) {
      componentLastUpdated[componentName] = {};
    }

    dependencies.forEach((dependency) => {
      if (!dependencyIndex.has(dependency)) {
        dependencyIndex.set(dependency, new Set());
      }
      dependencyIndex.get(dependency)!.add(expressionKey);
    });
  }
}

async function evaluateAllBindings() {
  if (!faceplate.value || !props.entityId) {
    Object.keys(bindingValueMap).forEach((key) => (bindingValueMap[key] = null));
    Object.keys(expressionValueMap).forEach((key) => (expressionValueMap[key] = null));
    return;
  }

  // Evaluate all bindings in parallel for faster initialization
  const entries = Array.from(expressionMeta.entries());
  await Promise.all(
    entries.map(async ([key, meta]) => {
      const value = await evaluateBindingExpression(key, meta);
      updateBindingsForExpression(key, value);
    })
  );
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
  if (!fieldPath.length) return;

  // Backend handles indirection for all field paths (direct and indirect)
  // Store the starting entity and the first field in the path
  bindingTargets.set(expression, { 
    entityId: props.entityId, 
    fieldType: fieldPath[0] 
  });
}

function updateBindingsForExpression(expressionKey: string, value: unknown) {
  if (!expressionTargets.has(expressionKey)) return;

  const targets = expressionTargets.get(expressionKey)!;
  targets.forEach((target) => {
    const key = `${target.component}:${target.property}`;
    const transformed = applyTransform(target.transform, value, {
      component: target.component,
      property: target.property,
      expressionKey,
      entityId: props.entityId ?? null,
      faceplateId: faceplate.value?.id ?? null,
      helpers: getScriptHelpers(),
      module: (name: string) => scriptModuleExports.get(name),
      modules: () => Object.fromEntries(scriptModuleExports.entries()),
    });
    bindingValueMap[key] = transformed;

    if (!componentLastUpdated[target.component]) {
      componentLastUpdated[target.component] = {};
    }
    componentLastUpdated[target.component][target.property] = Date.now();
  });
}

function applyTransform(transform: string | null | undefined, value: unknown, context: TransformContext): unknown {
  if (!transform) return value;
  const raw = transform.trim();
  if (!raw) return value;

  try {
    if (raw.includes('=>')) {
      const factory = new Function(`return (${raw});`);
      const transformer = factory();
      if (typeof transformer === 'function') {
        return transformer(value, context, context.helpers);
      }
    }

    const fn = new Function(
      'value',
      'context',
      'helpers',
      '"use strict"; ' + raw,
    );
    return fn(value, context, context.helpers);
  } catch (error) {
    console.warn('Failed to apply transform', transform, error);
    return value;
  }
}

async function registerNotifications() {
  await cleanupNotifications();
  if (!isLive.value || !props.entityId) return;

  const dependencySet = new Set<string>();

  expressionMeta.forEach((meta) => {
    if (meta.mode === 'field') {
      dependencySet.add(meta.expression);
    }
    meta.dependencies.forEach((dep) => dependencySet.add(dep));
  });

  if (faceplate.value) {
    const channels = Array.isArray(faceplate.value.notificationChannels)
      ? faceplate.value.notificationChannels
      : [];
    channels.forEach((channel) => {
      ensureArray(channel?.fields).forEach((field) => dependencySet.add(field));
    });
  }

  for (const dependency of dependencySet) {
    const literal = tryEvaluateLiteral(dependency);
    if (literal.found) continue;

    const path = await getFieldPath(dependency);
    if (!path.length) continue;

    // For indirect paths (e.g., "Parent->Name"), use IndirectFieldNotifier
    if (path.length > 1) {
      try {
        const notifier = new IndirectFieldNotifier(
          dataStore,
          props.entityId!,
          path,
          (value) => {
            // Handle final value changes
            const subscribers = dependencyIndex.get(dependency);
            if (!subscribers || !subscribers.size) {
              void evaluateAllBindings();
              return;
            }

            subscribers.forEach((expressionKey) => {
              const meta = expressionMeta.get(expressionKey);
              if (!meta) return;

              if (meta.mode === 'field' && meta.expression === dependency) {
                expressionValueMap[expressionKey] = value;
                updateBindingsForExpression(expressionKey, value);
              } else {
                void evaluateBindingExpression(expressionKey, meta)
                  .then((value) => {
                    updateBindingsForExpression(expressionKey, value);
                  })
                  .catch((error) => {
                    console.warn('Failed to refresh binding after notification', error);
                  });
              }
            });
          }
        );

        await notifier.start();
        indirectNotifiers.set(dependency, notifier);
      } catch (error) {
        console.warn(`Failed to start IndirectFieldNotifier for dependency ${dependency}`, error);
      }
      continue;
    }

    // For direct paths (single field), use simple notification
    await resolveBindingTarget(dependency, path);
    const target = bindingTargets.get(dependency);
    
    // Skip if target is invalid or missing required fields
    if (!target || target.entityId == null || target.fieldType == null) {
      console.warn(`Skipping notification registration for dependency ${dependency}: invalid target`, target);
      continue;
    }

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

      const subscribers = dependencyIndex.get(dependency);
      if (!subscribers || !subscribers.size) {
        void evaluateAllBindings();
        return;
      }

      subscribers.forEach((expressionKey) => {
        const meta = expressionMeta.get(expressionKey);
        if (!meta) return;

        if (meta.mode === 'field' && meta.expression === dependency && notification.current?.value !== undefined) {
          expressionValueMap[expressionKey] = updatedValue;
          updateBindingsForExpression(expressionKey, updatedValue);
        } else {
          void evaluateBindingExpression(expressionKey, meta)
            .then((value) => {
              updateBindingsForExpression(expressionKey, value);
            })
            .catch((error) => {
              console.warn('Failed to refresh binding after notification', error);
            });
        }
      });
    };

    try {
      await dataStore.registerNotification(notifyConfig, callback);
      subscriptions.push({ config: notifyConfig, callback });
    } catch (error) {
      console.warn(`Failed to register notification for dependency ${dependency}`, error);
    }
  }
}

async function cleanupNotifications() {
  // Stop all indirect field notifiers
  const notifierStops = Array.from(indirectNotifiers.values()).map((notifier) => notifier.stop().catch(() => undefined));
  indirectNotifiers.clear();

  // Unregister all direct notifications
  const subscriptionCleanup = subscriptions.map(({ config, callback }) => 
    dataStore.unregisterNotification(config, callback).catch(() => undefined)
  );
  subscriptions = [];

  // Wait for all cleanup operations
  await Promise.all([...notifierStops, ...subscriptionCleanup]);
}

function ensureArray<T>(value: T[] | T | null | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
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
    <div v-else-if="!entityId" class="runtime-state empty">Select an entity to drive this faceplate (entityId: {{ entityId }})</div>
    <FaceplateCanvas
      v-else
      class="faceplate-runtime__canvas"
      :components="canvasComponents"
      :viewport="viewportSize"
      :edit-mode="false"
      :show-grid="false"
      :show-viewport-boundary="false"
    />
  </div>
</template>

<style scoped>
.faceplate-runtime {
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
}
</style>
