<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import type { EntityId, FieldType, NotifyConfig, Notification } from '@/core/data/types';
import { ValueHelpers } from '@/core/data/types';
import { useDataStore } from '@/stores/data';
import FaceplateCanvas, { type CanvasComponent } from './FaceplateCanvas.vue';
import { FaceplateDataService, type FaceplateComponentRecord, type FaceplateRecord, type FaceplateBindingDefinition, type FaceplateScriptModule } from '@/apps/faceplate-builder/utils/faceplate-data';
import type { BindingMode } from '@/apps/faceplate-builder/types';
import { IndirectFieldNotifier } from '@/apps/faceplate-builder/utils/indirect-field-notifier';
import { logger } from '@/apps/faceplate-builder/utils/logger';

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
const loading = ref(false);
const error = ref<string | null>(null);
const scriptCompilationErrors = ref<Array<{ module: string; error: string; timestamp: number }>>([]);
const scriptRuntimeErrors = ref<Array<{ context: string; error: string; timestamp: number }>>([]);
const isLive = computed(() => props.live !== false);
const showErrorPanel = ref(true);

// Format timestamp for error display
function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

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

  return [...fromConfig, ...fromRecord, ...componentLevel]
    .filter((binding) => binding.component && binding.property && binding.expression);
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
  
  // First pass: create components with parentId and eventHandlers
  const eventHandlersFromConfig = faceplate.value.configuration.eventHandlers || [];
  
  const components = renderedSlots.value.map(slot => {
    // Find parent ID from layout data
    const layoutItem = layout.find(item => item.component === String(slot.id));
    const parentId = layoutItem?.parentId || null;
    
    // Find event handlers for this component (using component name, not ID)
    const handlers = eventHandlersFromConfig.filter((h: any) => String(h.componentId) === slot.name);
    
    // Add automatic event handlers for twoWay bindings
    const componentBindings = allBindings.value.filter((b: any) => String(b.componentId) === String(slot.id));
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
          componentId: String(slot.id),
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
    logger.error('FaceplateRuntime initialization failed:', err);
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
  // Normalize whitespace to prevent duplicate keys from formatting differences
  const normalized = expression.trim().replace(/\s+/g, ' ');
  return `${mode}::${normalized}`;
}

function collectBindingDependencies(
  binding: FaceplateBindingDefinition,
  mode: BindingMode,
  expression: string,
): string[] {
  if (mode === 'field') {
    // For computed expressions, extract all field references
    if (isComputedExpression(expression)) {
      const fieldPattern = /\b([A-Za-z_][\w]*(?:->[A-Za-z_][\w]*)*)\b(?!\s*\()/g;
      const fields = new Set<string>();
      let match;
      while ((match = fieldPattern.exec(expression)) !== null) {
        fields.add(match[1]);
      }
      return Array.from(fields);
    }
    // For simple field references, return the expression itself
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
  scriptCompilationErrors.value = [];
  
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      scriptCompilationErrors.value.push({ module: name, error: errorMessage, timestamp: Date.now() });
      logger.error(`Failed to compile faceplate script module "${name}":`, error);
    }
  });
}

// Track evaluation depth per call chain to detect true circular dependencies
const MAX_EVALUATION_DEPTH = 50;
// Cache ongoing evaluations to prevent duplicate work and false circular dependency errors
const ongoingEvaluations = new Map<string, Promise<unknown>>();

async function evaluateBindingExpression(
  expressionKey: string,
  meta: { expression: string; mode: BindingMode; dependencies: string[] },
  evaluationStack: Set<string> = new Set(),
): Promise<unknown> {
  if (!props.entityId) {
    expressionValueMap[expressionKey] = null;
    return null;
  }

  // If this expression is already being evaluated, wait for that evaluation to complete
  if (ongoingEvaluations.has(expressionKey)) {
    if (import.meta.env.DEV) {
      logger.debug(`Reusing ongoing evaluation for: ${expressionKey}`);
    }
    return ongoingEvaluations.get(expressionKey)!;
  }

  // Check for circular dependency within this specific call chain
  if (evaluationStack.has(expressionKey)) {
    const callChain = Array.from(evaluationStack).join(' → ');
    logger.error(`Circular dependency detected: ${callChain} → ${expressionKey}`);
    scriptRuntimeErrors.value.push({
      context: `Binding evaluation`,
      error: `Circular dependency: ${callChain} → ${expressionKey}`,
      timestamp: Date.now(),
    });
    expressionValueMap[expressionKey] = null;
    return null;
  }

  // Check evaluation depth for this call chain
  if (evaluationStack.size >= MAX_EVALUATION_DEPTH) {
    logger.error(`Max evaluation depth exceeded (${MAX_EVALUATION_DEPTH}) for: ${expressionKey}`);
    scriptRuntimeErrors.value.push({
      context: `Binding evaluation`,
      error: `Max evaluation depth exceeded: ${expressionKey}`,
      timestamp: Date.now(),
    });
    expressionValueMap[expressionKey] = null;
    return null;
  }

  // Create a new stack for this evaluation path
  const newStack = new Set(evaluationStack);
  newStack.add(expressionKey);
  
  // Create and cache the evaluation promise
  const evaluationPromise = (async () => {
    try {
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
    } catch (error) {
      // Catch any unexpected errors during evaluation
      logger.error(`Unexpected error evaluating expression ${expressionKey}:`, error);
      scriptRuntimeErrors.value.push({
        context: `Binding evaluation`,
        error: `Error in ${expressionKey}: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: Date.now(),
      });
      expressionValueMap[expressionKey] = null;
      return null;
    } finally {
      // Remove from ongoing evaluations once complete
      ongoingEvaluations.delete(expressionKey);
    }
  })();
  
  // Cache the promise so parallel evaluations can reuse it
  ongoingEvaluations.set(expressionKey, evaluationPromise);
  
  return evaluationPromise;
}

// Check if expression contains computed operators
function isComputedExpression(expression: string): boolean {
  return /[+\-*/%()]/.test(expression) && !/^[A-Za-z_][\w]*(?:->[A-Za-z_][\w]*)*$/.test(expression);
}

// Evaluate computed expressions like "Temperature * 1.8 + 32"
async function evaluateComputedExpression(expression: string): Promise<number | null> {
  if (!props.entityId) {
    return null;
  }

  // Extract field references from the expression (words not followed by parentheses)
  const fieldPattern = /\b([A-Za-z_][\w]*(?:->[A-Za-z_][\w]*)*)\b(?!\s*\()/g;
  const fields = new Set<string>();
  let match;
  while ((match = fieldPattern.exec(expression)) !== null) {
    fields.add(match[1]);
  }

  // Read all field values
  const fieldValues = new Map<string, number>();
  for (const field of fields) {
    const path = await getFieldPath(field);
    if (!path.length) {
      logger.warn(`Field not found in computed expression: ${field}`);
      return null;
    }
    
    const [value] = await dataStore.read(props.entityId, path);
    const extracted = ValueHelpers.extract(value);
    
    // Convert to number
    const numValue = typeof extracted === 'number' ? extracted : 
                     typeof extracted === 'string' ? parseFloat(extracted) :
                     typeof extracted === 'boolean' ? (extracted ? 1 : 0) :
                     null;
    
    if (numValue === null || isNaN(numValue)) {
      logger.warn(`Field value is not numeric in computed expression: ${field} = ${extracted}`);
      return null;
    }
    
    fieldValues.set(field, numValue);
  }

  // Replace field names with their values in the expression
  let evaluableExpression = expression;
  for (const [field, value] of fieldValues) {
    // Use word boundaries to avoid partial replacements
    const regex = new RegExp(`\\b${field.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}\\b`, 'g');
    evaluableExpression = evaluableExpression.replace(regex, String(value));
  }

  // Evaluate the mathematical expression safely
  try {
    // Only allow numbers, operators, and parentheses
    if (!/^[\d\s+\-*/%().]+$/.test(evaluableExpression)) {
      logger.warn(`Invalid computed expression after substitution: ${evaluableExpression}`);
      return null;
    }
    
    // Use Function constructor for safe evaluation (better than eval)
    const result = new Function(`'use strict'; return (${evaluableExpression})`)();
    
    if (typeof result !== 'number' || isNaN(result)) {
      logger.warn(`Computed expression did not evaluate to a number: ${result}`);
      return null;
    }
    
    return result;
  } catch (error) {
    logger.warn('Failed to evaluate computed expression:', error);
    return null;
  }
}

async function evaluateFieldExpression(expression: string): Promise<unknown> {
  if (!props.entityId) {
    return null;
  }

  // Check if this is a computed expression
  if (isComputedExpression(expression)) {
    return await evaluateComputedExpression(expression);
  }

  // Simple field reference
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
    const errorMessage = error instanceof Error ? error.message : String(error);
    scriptRuntimeErrors.value.push({
      context: `Script binding evaluation`,
      error: errorMessage,
      timestamp: Date.now()
    });
    logger.warn('Faceplate script evaluation failed:', error);
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
  ongoingEvaluations.clear();

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

  if (import.meta.env.DEV) {
    logger.debug(`Evaluating ${expressionMeta.size} binding expressions`);
  }

  // Evaluate all bindings in parallel for faster initialization
  const entries = Array.from(expressionMeta.entries());
  await Promise.all(
    entries.map(async ([key, meta]) => {
      const value = await evaluateBindingExpression(key, meta);
      updateBindingsForExpression(key, value);
    })
  );

  if (import.meta.env.DEV) {
    logger.debug('Binding evaluation complete. bindingValueMap:', Object.fromEntries(
      Object.entries(bindingValueMap).slice(0, 10) // Show first 10 for debugging
    ));
  }
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
      logger.warn(`Unable to resolve field type for segment "${segment}" in expression "${expression}":`, error);
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
  if (!expressionTargets.has(expressionKey)) {
    if (import.meta.env.DEV) {
      logger.debug(`No targets found for expression key: ${expressionKey}`);
    }
    return;
  }

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

    if (import.meta.env.DEV) {
      logger.debug(`Updated binding: ${key} = ${JSON.stringify(transformed)}`);
    }

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
    logger.warn('Failed to apply transform:', transform, error);
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
                    logger.warn('Failed to refresh binding after notification:', error);
                  });
              }
            });
          }
        );

        await notifier.start();
        indirectNotifiers.set(dependency, notifier);
      } catch (error) {
        logger.warn(`Failed to start IndirectFieldNotifier for dependency ${dependency}:`, error);
      }
      continue;
    }

    // For direct paths (single field), use simple notification
    await resolveBindingTarget(dependency, path);
    const target = bindingTargets.get(dependency);
    
    // Skip if target is invalid or missing required fields
    if (!target || target.entityId == null || target.fieldType == null) {
      logger.warn(`Skipping notification registration for dependency ${dependency}: invalid target`, target);
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
              logger.warn('Failed to refresh binding after notification:', error);
            });
        }
      });
    };

    try {
      await dataStore.registerNotification(notifyConfig, callback);
      subscriptions.push({ config: notifyConfig, callback });
    } catch (error) {
      logger.warn(`Failed to register notification for dependency ${dependency}:`, error);
    }
  }
}

async function cleanupNotifications() {
  // Stop all indirect field notifiers
  const notifierStops = Array.from(indirectNotifiers.values()).map((notifier) => 
    notifier.stop().catch((err) => {
      logger.warn('Failed to stop IndirectFieldNotifier during cleanup:', err);
    })
  );
  indirectNotifiers.clear();

  // Unregister all direct notifications
  const subscriptionCleanup = subscriptions.map(({ config, callback }) => 
    dataStore.unregisterNotification(config, callback).catch((err) => {
      logger.warn('Failed to unregister notification during cleanup:', err);
    })
  );
  subscriptions = [];

  // Wait for all cleanup operations
  await Promise.all([...notifierStops, ...subscriptionCleanup]);
}

function ensureArray<T>(value: T[] | T | null | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

// Event handler execution queue to prevent race conditions
const eventHandlerQueue = ref<Array<{ handler: any; value?: any; nativeEvent?: Event }>>([]);
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
      scriptRuntimeErrors.value.push({
        context: `Event handler ${handler.trigger}`,
        error: String(error),
        timestamp: Date.now(),
      });
    }
  }
  
  isProcessingEventQueue.value = false;
}

// Event handler execution
async function handleEventTriggered(payload: { handler: any; value?: any; nativeEvent?: Event }) {
  // Add to queue and process sequentially to prevent race conditions
  eventHandlerQueue.value.push(payload);
  await processEventQueue();
}

async function executeWriteFieldAction(action: any, componentValue: any) {
  const targetEntityId = props.entityId;
  if (!targetEntityId) {
    logger.warn('Cannot write field: no bound entity');
    return;
  }

  const fieldPath = action.fieldPath;
  if (!fieldPath) {
    logger.warn('Cannot write field: no field path specified');
    return;
  }

  // Determine the value to write
  let valueToWrite: any;
  if (action.valueSource === 'component') {
    valueToWrite = componentValue;
  } else if (action.valueSource === 'literal') {
    valueToWrite = action.value;
  } else if (action.valueSource === 'expression') {
    // Evaluate expression
    try {
      const func = new Function('value', `return ${action.value}`);
      valueToWrite = func(componentValue);
    } catch (error) {
      logger.error('Failed to evaluate value expression:', error);
      return;
    }
  }

  // Write the value
  try {
    // Determine if path is indirect
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

  // Create execution context
  const context = {
    get: (path: string) => {
      if (path.includes('->')) {
        return service.readValueIndirect(props.entityId!, path);
      }
      const value = service.readValue(props.entityId!, path);
      return value.then(v => v ? ValueHelpers.extract(v) : null);
    },
    getCached: (path: string) => expressionValueMap[path],
    set: (path: string, value: any) => {
      if (path.includes('->')) {
        return service.writeValueIndirect(props.entityId!, path, value);
      }
      return service.writeValue(props.entityId!, path, value);
    },
    setState: (key: string, value: unknown) => {
      const stateKey = `script-${props.faceplateId}-state`;
      if (!scriptState.has(stateKey)) {
        scriptState.set(stateKey, {});
      }
      scriptState.get(stateKey)![key] = value;
    },
    getState: (key: string) => {
      const stateKey = `script-${props.faceplateId}-state`;
      return scriptState.get(stateKey)?.[key];
    },
  };

  const helpers = {
    clamp: (value: number, min: number, max: number) => Math.max(min, Math.min(max, value)),
    lerp: (a: number, b: number, t: number) => a + (b - a) * t,
    colorRamp: (value: number, colors: string[]) => colors[Math.floor(value * (colors.length - 1))],
  };

  try {
    // Create an async function to support await in user scripts
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
    // Determine entity context for navigation
    let contextEntityId = props.entityId;
    if (action.entityContext) {
      // Evaluate entity context expression
      try {
        const context = createScriptExecutionContext('navigate-context');
        const helpers = getScriptHelpers();
        const func = new Function('context', 'helpers', `return ${action.entityContext}`);
        contextEntityId = func(context, helpers);
      } catch (error) {
        logger.error('Failed to evaluate entity context:', error);
        contextEntityId = props.entityId;
      }
    }
    
    // Emit navigation event for the window manager to handle
    // This allows the parent application to open a new window or navigate
    logger.info('Navigate to faceplate:', targetFaceplate, 'with entity:', contextEntityId);
    
    // For now, we'll just log it as window system integration is needed
    // In the future, this could emit an event or use a navigation service
    console.log('Navigation requested:', {
      targetFaceplate,
      entityId: contextEntityId,
      action,
    });
  } catch (error) {
    logger.error('Navigation failed:', error);
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
    await evaluateAllBindings();
    await registerNotifications();
  },
);

onBeforeUnmount(async () => {
  await cleanupNotifications();
  
  // Clear all caches to prevent memory leaks
  scriptCache.clear();
  scriptState.clear();
  scriptModuleExports.clear();
  bindingPaths.clear();
  bindingTargets.clear();
  expressionTargets.clear();
  expressionMeta.clear();
  dependencyIndex.clear();
  ongoingEvaluations.clear();
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
      v-if="faceplate && entityId"
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
