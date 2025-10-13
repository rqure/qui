import { ref, reactive, computed } from 'vue';
import type { EntityId, FieldType } from '@/core/data/types';
import { logger } from '@/apps/faceplate-builder/utils/logger';
import { BindingEvaluationStrategyFactory } from '@/apps/faceplate-builder/utils/binding-evaluation-strategies';
import { UnifiedBindingEvaluationService, type BindingMeta } from '@/apps/faceplate-builder/utils/unified-binding-evaluation';
import type { FaceplateDataService, FaceplateBindingDefinition } from '@/apps/faceplate-builder/utils/faceplate-data';
import type { BindingMode } from '@/apps/faceplate-builder/types';
import type { BindingTargetEntry, TransformContext } from '../components/types/faceplate-runtime';

export function useBindingEvaluation(
  dataStore: any,
  service: FaceplateDataService,
  scriptHelpers: any,
  scriptModuleExports: Map<string, Record<string, unknown>>,
  scriptState: Map<string, Record<string, unknown>>,
  scriptCache: Map<string, any>,
  scriptRuntimeErrors: any[]
) {
  const bindingValueMap = reactive<Record<string, unknown>>({});
  const expressionValueMap = reactive<Record<string, unknown>>({});
  const bindingPaths = ref(new Map<string, FieldType[]>());
  const bindingTargets = ref(new Map<string, { entityId: EntityId; fieldType: FieldType }>());
  const expressionTargets = ref(new Map<string, BindingTargetEntry[]>());
  const expressionMeta = ref(new Map<string, BindingMeta>());
  const dependencyIndex = ref(new Map<string, Set<string>>());
  const componentLastUpdated = reactive<Record<string, Record<string, number>>>({});
  const ongoingEvaluations = ref(new Map<string, Promise<unknown>>());

  const bindingEvaluationService = computed(() => {
    const context = {
      entityId: null as EntityId | null, // Will be set by caller
      faceplateId: null as EntityId | null, // Will be set by caller
      dataStore,
      service,
      expressionValueMap,
      scriptHelpers,
      scriptModuleExports,
      scriptState,
      scriptCache,
      scriptRuntimeErrors,
    };
    return new UnifiedBindingEvaluationService(context);
  });

  function determineBindingMode(binding: FaceplateBindingDefinition): BindingMode {
    if (binding.mode) {
      return binding.mode;
    }
    const trimmed = (binding.expression || '').trim();
    const literalStrategy = new (BindingEvaluationStrategyFactory.getStrategy('literal') as any).constructor();
    const literal = (literalStrategy as any).tryEvaluateLiteral(trimmed);
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
    const normalized = expression.trim().replace(/\s+/g, ' ');
    return `${mode}::${normalized}`;
  }

  function collectBindingDependencies(
    binding: FaceplateBindingDefinition,
    mode: BindingMode,
    expression: string,
  ): string[] {
    if (mode === 'field') {
      if (isComputedExpression(expression)) {
        const fieldPattern = /\b([A-Za-z_][\w]*(?:->[A-Za-z_][\w]*)*)\b(?!\s*\()/g;
        const fields = new Set<string>();
        let match;
        while ((match = fieldPattern.exec(expression)) !== null) {
          fields.add(match[1]);
        }
        return Array.from(fields);
      }
      return [expression];
    }
    if (mode === 'script') {
      const deps = Array.isArray(binding.dependencies) ? binding.dependencies : [];
      return deps.map((dep) => dep.trim()).filter(Boolean);
    }
    return [];
  }

  function isComputedExpression(expression: string): boolean {
    return /[+\-*/%()]/.test(expression) && !/^[A-Za-z_][\w]*(?:->[A-Za-z_][\w]*)*$/.test(expression);
  }

  function buildBindingMaps(bindings: FaceplateBindingDefinition[]) {
    clearBindingMaps();
    processBindingExpressions(bindings);
  }

  function clearBindingMaps() {
    expressionTargets.value.clear();
    expressionMeta.value.clear();
    dependencyIndex.value.clear();
    Object.keys(bindingValueMap).forEach((key) => delete bindingValueMap[key]);
    Object.keys(expressionValueMap).forEach((key) => delete expressionValueMap[key]);
    bindingPaths.value.clear();
    bindingTargets.value.clear();
    Object.keys(componentLastUpdated).forEach((key) => delete componentLastUpdated[key]);
    ongoingEvaluations.value.clear();
  }

  function processBindingExpressions(bindings: FaceplateBindingDefinition[]) {
    for (const binding of bindings) {
      const componentName = binding.component || '';
      const property = binding.property || '';
      const expression = binding.expression || '';
      if (!componentName || !property || !expression) continue;

      const mode = determineBindingMode(binding);
      const normalizedExpression = sanitizeBindingExpression(expression, mode);
      const expressionKey = makeExpressionKey(normalizedExpression, mode);
      const dependencies = collectBindingDependencies(binding, mode, normalizedExpression);

      updateExpressionMeta(expressionKey, {
        expression: normalizedExpression,
        mode,
        dependencies: [...dependencies],
        description: binding.description,
      });

      addExpressionTarget(expressionKey, {
        component: componentName,
        property,
        transform: binding.transform ?? null,
      });

      initializeBindingValueMap(componentName, property);
      registerDependencies(dependencies, expressionKey);
    }
  }

  function updateExpressionMeta(expressionKey: string, meta: BindingMeta) {
    if (!expressionMeta.value.has(expressionKey)) {
      expressionMeta.value.set(expressionKey, meta);
    } else {
      const existing = expressionMeta.value.get(expressionKey)!;
      const merged = new Set([...existing.dependencies, ...meta.dependencies]);
      existing.dependencies = Array.from(merged);
    }
  }

  function addExpressionTarget(expressionKey: string, target: BindingTargetEntry) {
    if (!expressionTargets.value.has(expressionKey)) {
      expressionTargets.value.set(expressionKey, []);
    }
    expressionTargets.value.get(expressionKey)!.push(target);
  }

  function initializeBindingValueMap(componentName: string, property: string) {
    const bindingSlotKey = `${componentName}:${property}`;
    if (!bindingValueMap[bindingSlotKey]) {
      bindingValueMap[bindingSlotKey] = null;
    }

    if (!componentLastUpdated[componentName]) {
      componentLastUpdated[componentName] = {};
    }
  }

  function registerDependencies(dependencies: string[], expressionKey: string) {
    dependencies.forEach((dependency) => {
      if (!dependencyIndex.value.has(dependency)) {
        dependencyIndex.value.set(dependency, new Set());
      }
      dependencyIndex.value.get(dependency)!.add(expressionKey);
    });
  }

  async function evaluateAllBindings(entityId: EntityId | null, faceplateId: EntityId | null) {
    if (!entityId) {
      Object.keys(bindingValueMap).forEach((key) => (bindingValueMap[key] = null));
      Object.keys(expressionValueMap).forEach((key) => (expressionValueMap[key] = null));
      return;
    }

    if (import.meta.env.DEV) {
      logger.debug(`Evaluating ${expressionMeta.value.size} binding expressions`);
    }

    const entries = Array.from(expressionMeta.value.entries());
    await Promise.all(
      entries.map(async ([key, meta]) => {
        const value = await evaluateBindingExpression(key, meta, entityId, faceplateId);
        updateBindingsForExpression(key, value);
      })
    );

    if (import.meta.env.DEV) {
      logger.debug('Binding evaluation complete. bindingValueMap:', Object.fromEntries(
        Object.entries(bindingValueMap).slice(0, 10)
      ));
    }
  }

  async function evaluateBindingExpression(
    expressionKey: string,
    meta: BindingMeta,
    entityId: EntityId | null,
    faceplateId: EntityId | null,
    evaluationStack: Set<string> = new Set(),
  ): Promise<unknown> {
    // Update context for this evaluation
    (bindingEvaluationService.value as any).context.entityId = entityId;
    (bindingEvaluationService.value as any).context.faceplateId = faceplateId;

    return bindingEvaluationService.value.evaluateExpression(expressionKey, meta, evaluationStack);
  }

  function updateBindingsForExpression(expressionKey: string, value: unknown) {
    if (!expressionTargets.value.has(expressionKey)) {
      if (import.meta.env.DEV) {
        logger.debug(`No targets found for expression key: ${expressionKey}`);
      }
      return;
    }

    const targets = expressionTargets.value.get(expressionKey)!;
    targets.forEach((target) => {
      const key = `${target.component}:${target.property}`;
      const transformed = applyTransform(target.transform, value, {
        component: target.component,
        property: target.property,
        expressionKey,
        entityId: null, // Will be set by caller
        faceplateId: null, // Will be set by caller
        helpers: scriptHelpers,
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

  return {
    bindingValueMap,
    expressionValueMap,
    bindingPaths,
    bindingTargets,
    expressionTargets,
    expressionMeta,
    dependencyIndex,
    componentLastUpdated,
    bindingEvaluationService,
    buildBindingMaps,
    clearBindingMaps,
    evaluateAllBindings,
    evaluateBindingExpression,
    updateBindingsForExpression,
  };
}