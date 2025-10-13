import type { EntityId, FieldType } from '@/core/data/types';
import { ValueHelpers } from '@/core/data/types';
import { logger } from './logger';

/**
 * Script helper functions available in binding expressions
 */
export interface ScriptHelpers {
  clamp(value: number, min: number, max: number): number;
  lerp(start: number, end: number, t: number): number;
  round(value: number, precision?: number): number;
  format(value: unknown, digits?: number): string;
  colorRamp(value: number, stops: Array<{ stop: number; color: string }>): string;
}

/**
 * Simplified binding evaluation service that consolidates all binding logic
 */
export class BindingService {
  private fieldTypeCache = new Map<string, FieldType>();
  private scriptCache = new Map<string, Function>();
  private scriptState = new Map<string, Record<string, unknown>>();
  private ongoingEvaluations = new Map<string, Promise<unknown>>();

  constructor(
    private dataStore: any,
    private service: any,
    private scriptHelpers: any,
    private scriptModuleExports: Map<string, Record<string, unknown>>,
    private scriptRuntimeErrors: any[]
  ) {}

  /**
   * Evaluate a binding expression
   */
  async evaluate(
    expression: string,
    mode: 'field' | 'literal' | 'script',
    entityId: EntityId | null,
    faceplateId: EntityId | null,
    expressionKey?: string
  ): Promise<unknown> {
    const key = expressionKey || `${mode}::${expression}`;

    // Prevent duplicate evaluations
    if (this.ongoingEvaluations.has(key)) {
      return this.ongoingEvaluations.get(key)!;
    }

    const evaluation = this.performEvaluation(expression, mode, entityId, faceplateId, key);
    this.ongoingEvaluations.set(key, evaluation);

    try {
      return await evaluation;
    } finally {
      this.ongoingEvaluations.delete(key);
    }
  }

  private async performEvaluation(
    expression: string,
    mode: 'field' | 'literal' | 'script',
    entityId: EntityId | null,
    faceplateId: EntityId | null,
    expressionKey: string
  ): Promise<unknown> {
    try {
      switch (mode) {
        case 'literal':
          return this.evaluateLiteral(expression);
        case 'field':
          return await this.evaluateField(expression, entityId);
        case 'script':
          return await this.evaluateScript(expression, entityId, faceplateId, expressionKey);
        default:
          throw new Error(`Unknown binding mode: ${mode}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.scriptRuntimeErrors.push({
        context: `Binding evaluation (${mode})`,
        error: errorMessage,
        timestamp: Date.now(),
      });
      logger.warn(`Binding evaluation failed for ${mode}:`, error);
      return null;
    }
  }

  private evaluateLiteral(expression: string): unknown {
    const trimmed = expression.trim();

    // String literals
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      return trimmed.slice(1, -1);
    }

    // Number literals
    if (/^\d+(\.\d+)?$/.test(trimmed)) {
      return Number(trimmed);
    }

    // Boolean literals
    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;
    if (trimmed === 'null') return null;

    // Not a literal, return as-is
    return expression;
  }

  private async evaluateField(expression: string, entityId: EntityId | null): Promise<unknown> {
    if (!entityId) return null;

    // Handle computed expressions (with math operators)
    if (this.isComputedExpression(expression)) {
      return this.evaluateComputedExpression(expression, entityId);
    }

    // Simple field reference
    const path = await this.getFieldPath(expression);
    if (!path.length) return null;

    const [value] = await this.dataStore.read(entityId, path);
    return ValueHelpers.extract(value);
  }

  private async evaluateComputedExpression(expression: string, entityId: EntityId): Promise<number | null> {
    // Extract field references
    const fieldPattern = /\b([A-Za-z_][\w]*(?:->[A-Za-z_][\w]*)*)\b(?!\s*\()/g;
    const fields = new Set<string>();
    let match;
    while ((match = fieldPattern.exec(expression)) !== null) {
      fields.add(match[1]);
    }

    // Read all field values
    const fieldValues = new Map<string, number>();
    for (const field of fields) {
      const path = await this.getFieldPath(field);
      if (!path.length) continue;

      const [value] = await this.dataStore.read(entityId, path);
      const extracted = ValueHelpers.extract(value);
      const numValue = this.toNumber(extracted);

      if (numValue === null) {
        logger.warn(`Field value is not numeric: ${field} = ${extracted}`);
        return null;
      }

      fieldValues.set(field, numValue);
    }

    // Replace field names with values
    let evaluableExpression = expression;
    for (const [field, value] of fieldValues) {
      const regex = new RegExp(`\\b${field.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}\\b`, 'g');
      evaluableExpression = evaluableExpression.replace(regex, String(value));
    }

    // Evaluate safely
    try {
      if (!/^[\d\s+\-*/%().]+$/.test(evaluableExpression)) {
        throw new Error('Invalid expression');
      }
      return new Function(`'use strict'; return (${evaluableExpression})`)();
    } catch (error) {
      logger.warn('Failed to evaluate computed expression:', error);
      return null;
    }
  }

  private async evaluateScript(
    scriptCode: string,
    entityId: EntityId | null,
    faceplateId: EntityId | null,
    expressionKey: string
  ): Promise<unknown> {
    if (!entityId) return null;

    const scriptFn = this.getOrCreateScriptFunction(scriptCode);
    const context = this.createScriptContext(entityId, faceplateId, expressionKey);

    try {
      return await scriptFn(context, this.scriptHelpers);
    } catch (error) {
      throw error; // Re-throw to be caught by performEvaluation
    }
  }

  private getOrCreateScriptFunction(scriptCode: string): Function {
    if (this.scriptCache.has(scriptCode)) {
      return this.scriptCache.get(scriptCode)!;
    }

    const body = this.normalizeScriptBody(scriptCode);
    const factory = new Function(
      'context',
      'helpers',
      '"use strict"; return (async () => {\n' + body + '\n})();'
    );

    const executor = (context: any, helpers: any) => Promise.resolve(factory(context, helpers));
    this.scriptCache.set(scriptCode, executor);
    return executor;
  }

  private normalizeScriptBody(source: string): string {
    const trimmed = source.trim();
    if (!trimmed) return 'return null;';

    if (/\breturn\b/.test(trimmed)) return trimmed;
    if (trimmed.endsWith(';')) return `${trimmed} return undefined;`;
    return `return (${trimmed});`;
  }

  private createScriptContext(entityId: EntityId, faceplateId: EntityId | null, expressionKey: string) {
    const state = this.getScriptState(expressionKey);
    const self = this;

    return {
      entityId,
      faceplateId,
      expressionKey,
      async get(path: string): Promise<unknown> {
        return await self.evaluateField(path, entityId);
      },
      getCached: (): null => null,
      getBindingValue: (): null => null,
      setState: (key: string, value: unknown): void => { state[key] = value; },
      getState: (key: string, defaultValue?: any): any => state[key] ?? defaultValue,
      bindingsSnapshot: (): {} => ({}),
      module: (name: string): Record<string, unknown> | undefined => this.scriptModuleExports.get(name),
      modules: (): Record<string, Record<string, unknown>> => Object.fromEntries(this.scriptModuleExports.entries()),
    };
  }

  private getScriptState(key: string): Record<string, unknown> {
    if (!this.scriptState.has(key)) {
      this.scriptState.set(key, {});
    }
    return this.scriptState.get(key)!;
  }

  private async getFieldPath(expression: string): Promise<FieldType[]> {
    const segments = expression.split('->').map(s => s.trim()).filter(Boolean);
    const fieldTypes: FieldType[] = [];

    for (const segment of segments) {
      const cacheKey = segment;
      if (this.fieldTypeCache.has(cacheKey)) {
        fieldTypes.push(this.fieldTypeCache.get(cacheKey)!);
      } else {
        try {
          const fieldType = await this.service.getFieldType(segment);
          this.fieldTypeCache.set(cacheKey, fieldType);
          fieldTypes.push(fieldType);
        } catch (error) {
          logger.warn(`Unable to resolve field type: ${segment}`, error);
          return [];
        }
      }
    }

    return fieldTypes;
  }

  private isComputedExpression(expression: string): boolean {
    return /[+\-*/%()]/.test(expression) && !/^[A-Za-z_][\w]*(?:->[A-Za-z_][\w]*)*$/.test(expression);
  }

  private toNumber(value: unknown): number | null {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? null : parsed;
    }
    if (typeof value === 'boolean') return value ? 1 : 0;
    return null;
  }

  /**
   * Clear all caches
   */
  clearCaches(): void {
    this.fieldTypeCache.clear();
    this.scriptCache.clear();
    this.scriptState.clear();
    this.ongoingEvaluations.clear();
  }

  /**
   * Execute a script directly (for event handlers)
   */
  async executeScript(
    scriptCode: string,
    entityId: EntityId | null,
    faceplateId: EntityId | null,
    componentValue?: any,
    nativeEvent?: Event
  ): Promise<unknown> {
    if (!entityId) return null;

    const context = this.createScriptContext(entityId, faceplateId, 'script-execution');

    try {
      const fn = new Function('event', 'value', 'context', 'helpers',
        `return (async () => { ${scriptCode} })();`);
      return await fn(nativeEvent, componentValue, context, this.scriptHelpers);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.scriptRuntimeErrors.push({
        context: 'Script execution',
        error: errorMessage,
        timestamp: Date.now(),
      });
      throw error;
    }
  }
}