import type { EntityId, FieldType } from '@/core/data/types';
import { ValueHelpers } from '@/core/data/types';
import { useDataStore } from '@/stores/data';
import { FaceplateDataService } from '@/apps/faceplate-builder/utils/faceplate-data';
import { logger } from '@/apps/faceplate-builder/utils/logger';

export interface BindingEvaluationContext {
  entityId: EntityId | null;
  faceplateId: EntityId | null;
  dataStore: ReturnType<typeof useDataStore>;
  service: FaceplateDataService;
  expressionValueMap: Record<string, unknown>;
  scriptHelpers: ScriptHelpers;
  scriptModuleExports: Map<string, Record<string, unknown>>;
  scriptState: Map<string, Record<string, unknown>>;
  scriptCache: Map<string, (context: ScriptExecutionContext, helpers: ScriptHelpers) => Promise<unknown>>;
  scriptRuntimeErrors: Array<{ context: string; error: string; timestamp: number }>;
}

export interface ScriptHelpers {
  clamp(value: number, min: number, max: number): number;
  lerp(start: number, end: number, t: number): number;
  round(value: number, precision?: number): number;
  format(value: unknown, digits?: number): string;
  colorRamp(value: number, stops: Array<{ stop: number; color: string }>): string;
}

export interface ScriptExecutionContext {
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
}

export interface BindingEvaluationStrategy {
  evaluate(expression: string, context: BindingEvaluationContext): Promise<unknown>;
}

export class LiteralBindingStrategy implements BindingEvaluationStrategy {
  evaluate(expression: string, context: BindingEvaluationContext): Promise<unknown> {
    const literal = this.tryEvaluateLiteral(expression);
    return Promise.resolve(literal.found ? literal.value : expression);
  }

  private tryEvaluateLiteral(expression: string): { found: boolean; value: unknown } {
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
}

export class FieldBindingStrategy implements BindingEvaluationStrategy {
  private bindingPaths = new Map<string, FieldType[]>();

  async evaluate(expression: string, context: BindingEvaluationContext): Promise<unknown> {
    if (!context.entityId) {
      return null;
    }

    // Check if this is a computed expression
    if (this.isComputedExpression(expression)) {
      return this.evaluateComputedExpression(expression, context);
    }

    // Simple field reference
    const path = await this.getFieldPath(expression, context);
    if (!path.length) {
      return null;
    }

    const [value] = await context.dataStore.read(context.entityId, path);
    const extracted = ValueHelpers.extract(value);
    return extracted;
  }

  private isComputedExpression(expression: string): boolean {
    return /[+\-*/%()]/.test(expression) && !/^[A-Za-z_][\w]*(?:->[A-Za-z_][\w]*)*$/.test(expression);
  }

  private async evaluateComputedExpression(expression: string, context: BindingEvaluationContext): Promise<number | null> {
    if (!context.entityId) {
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
      const path = await this.getFieldPath(field, context);
      if (!path.length) {
        logger.warn(`Field not found in computed expression: ${field}`);
        return null;
      }

      const [value] = await context.dataStore.read(context.entityId, path);
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

  private async getFieldPath(expression: string, context: BindingEvaluationContext): Promise<FieldType[]> {
    if (this.bindingPaths.has(expression)) {
      return this.bindingPaths.get(expression)!;
    }

    const segments = expression.split('->').map((segment) => segment.trim()).filter(Boolean);
    const fieldTypes: FieldType[] = [];

    for (const segment of segments) {
      try {
        const fieldType = await context.service.getFieldType(segment);
        fieldTypes.push(fieldType);
      } catch (error) {
        logger.warn(`Unable to resolve field type for segment "${segment}" in expression "${expression}":`, error);
        this.bindingPaths.set(expression, []);
        return [];
      }
    }

    this.bindingPaths.set(expression, fieldTypes);
    return fieldTypes;
  }
}

export class ScriptBindingStrategy implements BindingEvaluationStrategy {
  async evaluate(expression: string, context: BindingEvaluationContext): Promise<unknown> {
    if (!context.entityId) {
      return null;
    }

    try {
      const fn = this.getOrCreateScriptFunction(expression, context);
      const executionContext = this.createScriptExecutionContext(expression, context);
      const result = await fn(executionContext, context.scriptHelpers);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      context.scriptRuntimeErrors.push({
        context: `Script binding evaluation`,
        error: errorMessage,
        timestamp: Date.now()
      });
      logger.warn('Faceplate script evaluation failed:', error);
      return null;
    }
  }

  private normalizeScriptBody(source: string): string {
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

  private getOrCreateScriptFunction(source: string, context: BindingEvaluationContext) {
    const cached = context.scriptCache.get(source);
    if (cached) {
      return cached;
    }

    const body = this.normalizeScriptBody(source);
    const factory = new Function(
      'context',
      'helpers',
      '"use strict"; return (async () => {\n' + body + '\n})();',
    );

    const executor = (context: ScriptExecutionContext, helpers: ScriptHelpers) =>
      Promise.resolve(factory(context, helpers));

    context.scriptCache.set(source, executor);
    return executor;
  }

  private getOrCreateScriptStateBucket(expressionKey: string, context: BindingEvaluationContext): Record<string, unknown> {
    if (!context.scriptState.has(expressionKey)) {
      context.scriptState.set(expressionKey, {});
    }
    return context.scriptState.get(expressionKey)!;
  }

  private createScriptExecutionContext(expressionKey: string, context: BindingEvaluationContext): ScriptExecutionContext {
    const state = this.getOrCreateScriptStateBucket(expressionKey, context);

    return {
      entityId: context.entityId,
      faceplateId: context.faceplateId,
      expressionKey,
      async get(path: string) {
        const value = await new FieldBindingStrategy().evaluate(path, context);
        const fieldKey = `field::${path.trim().replace(/\s+/g, ' ')}`;
        if (!context.expressionValueMap[fieldKey]) {
          context.expressionValueMap[fieldKey] = value;
        }
        return value;
      },
      getCached(targetKey: string) {
        return context.expressionValueMap[targetKey];
      },
      getBindingValue(componentId: string, property: string) {
        return context.expressionValueMap[`${componentId}:${property}`];
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
        return { ...context.expressionValueMap };
      },
      module(name: string) {
        return context.scriptModuleExports.get(name);
      },
      modules() {
        return Object.fromEntries(context.scriptModuleExports.entries());
      },
    };
  }
}

export class BindingEvaluationStrategyFactory {
  private static strategies = new Map<string, BindingEvaluationStrategy>();

  static getStrategy(mode: string): BindingEvaluationStrategy {
    if (!this.strategies.has(mode)) {
      switch (mode) {
        case 'literal':
          this.strategies.set(mode, new LiteralBindingStrategy());
          break;
        case 'field':
          this.strategies.set(mode, new FieldBindingStrategy());
          break;
        case 'script':
          this.strategies.set(mode, new ScriptBindingStrategy());
          break;
        default:
          throw new Error(`Unknown binding mode: ${mode}`);
      }
    }
    return this.strategies.get(mode)!;
  }
}