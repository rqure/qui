import type { EntityId, FieldType } from '@/core/data/types';
import { ValueHelpers } from '@/core/data/types';
import { useDataStore } from '@/stores/data';
import { FaceplateDataService } from '@/apps/faceplate-builder/utils/faceplate-data';
import { logger } from '@/apps/faceplate-builder/utils/logger';
import {
  BindingEvaluationStrategyFactory,
  type BindingEvaluationContext,
  type ScriptHelpers,
  type ScriptExecutionContext,
  type BindingEvaluationStrategy
} from './binding-evaluation-strategies';

export interface UnifiedBindingContext {
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

export interface BindingMeta {
  expression: string;
  mode: 'field' | 'literal' | 'script' | 'twoWay';
  dependencies: string[];
  description?: string;
}

export interface BindingTarget {
  component: string;
  property: string;
  transform?: string | null;
}

/**
 * Unified service for all binding evaluation operations
 */
export class UnifiedBindingEvaluationService {
  private ongoingEvaluations = new Map<string, Promise<unknown>>();
  private bindingPaths = new Map<string, FieldType[]>();

  constructor(private context: UnifiedBindingContext) {}

  /**
   * Evaluate a single binding expression
   */
  async evaluateExpression(
    expressionKey: string,
    meta: BindingMeta,
    evaluationStack: Set<string> = new Set()
  ): Promise<unknown> {
    // Prevent circular dependencies
    if (evaluationStack.has(expressionKey)) {
      logger.error(`Circular dependency detected: ${Array.from(evaluationStack).join(' → ')} → ${expressionKey}`);
      return null;
    }

    // Check evaluation depth
    if (evaluationStack.size >= 50) {
      logger.error(`Max evaluation depth exceeded for: ${expressionKey}`);
      return null;
    }

    // Reuse ongoing evaluations
    if (this.ongoingEvaluations.has(expressionKey)) {
      return this.ongoingEvaluations.get(expressionKey)!;
    }

    const newStack = new Set(evaluationStack);
    newStack.add(expressionKey);

    const evaluationPromise = this.performEvaluation(expressionKey, meta, newStack);
    this.ongoingEvaluations.set(expressionKey, evaluationPromise);

    try {
      return await evaluationPromise;
    } finally {
      this.ongoingEvaluations.delete(expressionKey);
    }
  }

  private async performEvaluation(
    expressionKey: string,
    meta: BindingMeta,
    evaluationStack: Set<string>
  ): Promise<unknown> {
    try {
      const strategy = BindingEvaluationStrategyFactory.getStrategy(meta.mode);
      const evaluationContext: BindingEvaluationContext = {
        entityId: this.context.entityId,
        faceplateId: this.context.faceplateId,
        dataStore: this.context.dataStore,
        service: this.context.service,
        expressionValueMap: this.context.expressionValueMap,
        scriptHelpers: this.context.scriptHelpers,
        scriptModuleExports: this.context.scriptModuleExports,
        scriptState: this.context.scriptState,
        scriptCache: this.context.scriptCache,
        scriptRuntimeErrors: this.context.scriptRuntimeErrors,
      };

      const value = await strategy.evaluate(meta.expression, evaluationContext);
      this.context.expressionValueMap[expressionKey] = value;
      return value;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.context.scriptRuntimeErrors.push({
        context: `Binding evaluation`,
        error: errorMessage,
        timestamp: Date.now(),
      });
      this.context.expressionValueMap[expressionKey] = null;
      return null;
    }
  }

  /**
   * Check if an expression is a literal value
   */
  isLiteralExpression(expression: string): boolean {
    const strategy = new (BindingEvaluationStrategyFactory.getStrategy('literal') as any).constructor();
    return (strategy as any).tryEvaluateLiteral(expression).found;
  }

  /**
   * Get field path for an expression
   */
  async getFieldPath(expression: string): Promise<FieldType[]> {
    if (this.bindingPaths.has(expression)) {
      return this.bindingPaths.get(expression)!;
    }

    const segments = expression.split('->').map(s => s.trim()).filter(Boolean);
    const fieldTypes: FieldType[] = [];

    for (const segment of segments) {
      try {
        const fieldType = await this.context.service.getFieldType(segment);
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

  /**
   * Read a field value directly
   */
  async readFieldValue(expression: string): Promise<unknown> {
    if (!this.context.entityId) return null;

    const path = await this.getFieldPath(expression);
    if (!path.length) return null;

    const [value] = await this.context.dataStore.read(this.context.entityId, path);
    return ValueHelpers.extract(value);
  }

  /**
   * Execute a script with proper context
   */
  async executeScript(
    scriptCode: string,
    componentValue?: any,
    nativeEvent?: Event
  ): Promise<unknown> {
    const executionContext: ScriptExecutionContext = {
      entityId: this.context.entityId,
      faceplateId: this.context.faceplateId,
      expressionKey: 'script-execution',
      get: (path: string) => this.readFieldValue(path),
      getCached: (key: string) => this.context.expressionValueMap[key],
      getBindingValue: (componentId: string, property: string) =>
        this.context.expressionValueMap[`${componentId}:${property}`],
      setState: (key: string, value: unknown) => {
        const state = this.getScriptStateBucket('script-execution');
        state[key] = value;
      },
      getState: <T>(key: string, defaultValue?: T) => {
        const state = this.getScriptStateBucket('script-execution');
        return (state[key] as T) ?? defaultValue;
      },
      bindingsSnapshot: () => ({ ...this.context.expressionValueMap }),
      module: (name: string) => this.context.scriptModuleExports.get(name),
      modules: () => Object.fromEntries(this.context.scriptModuleExports.entries()),
    };

    try {
      const fn = new Function('event', 'value', 'context', 'helpers',
        `return (async () => { ${scriptCode} })();`);
      return await fn(nativeEvent, componentValue, executionContext, this.context.scriptHelpers);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.context.scriptRuntimeErrors.push({
        context: `Script execution`,
        error: errorMessage,
        timestamp: Date.now(),
      });
      throw error;
    }
  }

  /**
   * Clear all caches
   */
  clearCaches(): void {
    this.ongoingEvaluations.clear();
    this.bindingPaths.clear();
  }

  private getScriptStateBucket(key: string): Record<string, unknown> {
    if (!this.context.scriptState.has(key)) {
      this.context.scriptState.set(key, {});
    }
    return this.context.scriptState.get(key)!;
  }
}