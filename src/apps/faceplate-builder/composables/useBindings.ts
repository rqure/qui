import { ref, reactive } from 'vue';
import type { EntityId } from '@/core/data/types';
import { BindingService } from '../utils/binding-service';
import type { FaceplateBindingDefinition } from '../utils/faceplate-data';

/**
 * Simplified binding evaluation composable
 */
export function useBindings(
  dataStore: any,
  service: any,
  scriptHelpers: any,
  scriptModuleExports: Map<string, Record<string, unknown>>,
  scriptRuntimeErrors: any[]
) {
  const bindingService = new BindingService(
    dataStore,
    service,
    scriptHelpers,
    scriptModuleExports,
    scriptRuntimeErrors
  );

  const bindingValueMap = reactive<Record<string, unknown>>({});
  const expressionValueMap = reactive<Record<string, unknown>>({});
  const componentLastUpdated = reactive<Record<string, Record<string, number>>>({});

  /**
   * Evaluate all bindings for a faceplate
   */
  async function evaluateBindings(
    bindings: FaceplateBindingDefinition[],
    entityId: EntityId | null,
    faceplateId: EntityId | null
  ): Promise<void> {
    if (!entityId) {
      // Clear all values when no entity
      Object.keys(bindingValueMap).forEach(key => delete bindingValueMap[key]);
      Object.keys(expressionValueMap).forEach(key => delete expressionValueMap[key]);
      return;
    }

    // Evaluate each binding
    for (const binding of bindings) {
      const componentName = binding.component || '';
      const property = binding.property || '';
      const expression = binding.expression || '';

      if (!componentName || !property || !expression) continue;

      // Determine mode
      const rawMode = binding.mode || (isLiteralExpression(expression) ? 'literal' : 'field');
      const mode = rawMode === 'twoWay' ? 'field' : rawMode; // Simplify twoWay to field for now
      const expressionKey = `${componentName}:${property}`;

      try {
        const value = await bindingService.evaluate(
          expression,
          mode,
          entityId,
          faceplateId,
          expressionKey
        );

        // Apply transform if present
        const transformedValue = applyTransform(binding.transform, value);

        // Update reactive maps
        bindingValueMap[expressionKey] = transformedValue;
        expressionValueMap[expressionKey] = value;

        // Track updates
        if (!componentLastUpdated[componentName]) {
          componentLastUpdated[componentName] = {};
        }
        componentLastUpdated[componentName][property] = Date.now();

      } catch (error) {
        console.warn(`Failed to evaluate binding ${expressionKey}:`, error);
        bindingValueMap[expressionKey] = null;
        expressionValueMap[expressionKey] = null;
      }
    }
  }

  /**
   * Execute a script (for event handlers)
   */
  async function executeScript(
    scriptCode: string,
    entityId: EntityId | null,
    faceplateId: EntityId | null,
    componentValue?: any,
    nativeEvent?: Event
  ): Promise<unknown> {
    return bindingService.executeScript(scriptCode, entityId, faceplateId, componentValue, nativeEvent);
  }

  /**
   * Clear all caches
   */
  function clearCaches(): void {
    bindingService.clearCaches();
  }

  return {
    bindingValueMap,
    expressionValueMap,
    componentLastUpdated,
    evaluateBindings,
    executeScript,
    clearCaches,
  };
}

/**
 * Check if expression is a literal value
 */
function isLiteralExpression(expression: string): boolean {
  const trimmed = expression.trim();

  // String literals
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return true;
  }

  // Number literals
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    return true;
  }

  // Boolean literals
  if (['true', 'false', 'null'].includes(trimmed)) {
    return true;
  }

  return false;
}

/**
 * Apply a transform function to a value
 */
function applyTransform(transform: string | null | undefined, value: unknown): unknown {
  if (!transform) return value;

  try {
    // Support arrow function syntax
    if (transform.includes('=>')) {
      const factory = new Function(`return (${transform});`);
      const transformer = factory();
      if (typeof transformer === 'function') {
        return transformer(value);
      }
    }

    // Support regular function body
    const fn = new Function('value', '"use strict"; ' + transform);
    return fn(value);
  } catch (error) {
    console.warn('Failed to apply transform:', transform, error);
    return value;
  }
}