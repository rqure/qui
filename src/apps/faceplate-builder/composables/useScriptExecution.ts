import { ref, readonly } from 'vue';
import type { EntityId } from '@/core/data/types';
import { logger } from '@/apps/faceplate-builder/utils/logger';
import { BindingService } from '@/apps/faceplate-builder/utils/binding-service';
import type { FaceplateRecord, FaceplateScriptModule } from '@/apps/faceplate-builder/utils/faceplate-data';
import type { ScriptError } from '../components/types/faceplate-runtime';

// Define the types that were in binding-evaluation-strategies.ts
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

export function useScriptExecution() {
  const scriptCompilationErrors = ref<ScriptError[]>([]);
  const scriptRuntimeErrors = ref<ScriptError[]>([]);
  const scriptCache = ref(new Map<string, (context: ScriptExecutionContext, helpers: ScriptHelpers) => Promise<unknown>>());
  const scriptState = ref(new Map<string, Record<string, unknown>>());
  const scriptModuleExports = ref(new Map<string, Record<string, unknown>>());

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

  function compileFaceplateScriptModules(modules: FaceplateScriptModule[]) {
    scriptModuleExports.value.clear();
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
        scriptModuleExports.value.set(name, exports as Record<string, unknown>);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        scriptCompilationErrors.value.push({
          module: name,
          error: errorMessage,
          timestamp: Date.now()
        });
        logger.error(`Failed to compile faceplate script module "${name}":`, error);
      }
    });
  }

  function createScriptExecutionContext(
    expressionKey: string,
    entityId: EntityId | null,
    faceplateId: EntityId | null,
    expressionValueMap: Record<string, unknown>,
    bindingValueMap: Record<string, unknown>,
    bindingService?: BindingService
  ): ScriptExecutionContext {
    const state = getOrCreateScriptStateBucket(expressionKey);

    return {
      entityId,
      faceplateId,
      expressionKey,
      async get(path: string) {
        if (bindingService) {
          const value = await bindingService.evaluate(path, 'field', entityId, faceplateId);
          const fieldKey = makeExpressionKey(path, 'field');
          if (!(fieldKey in expressionValueMap)) {
            expressionValueMap[fieldKey] = value;
          }
          return value;
        }
        return null;
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
        return scriptModuleExports.value.get(name);
      },
      modules() {
        return Object.fromEntries(scriptModuleExports.value.entries());
      },
    };
  }

  function getOrCreateScriptStateBucket(expressionKey: string): Record<string, unknown> {
    if (!scriptState.value.has(expressionKey)) {
      scriptState.value.set(expressionKey, {});
    }
    return scriptState.value.get(expressionKey)!;
  }

  function makeExpressionKey(expression: string, mode: string): string {
    const normalized = expression.trim().replace(/\s+/g, ' ');
    return `${mode}::${normalized}`;
  }

  function clearScriptState() {
    scriptCache.value.clear();
    scriptState.value.clear();
    scriptModuleExports.value.clear();
  }

  return {
    scriptCompilationErrors: readonly(scriptCompilationErrors),
    scriptRuntimeErrors,
    scriptCache,
    scriptState,
    scriptModuleExports,
    getScriptHelpers,
    compileFaceplateScriptModules,
    createScriptExecutionContext,
    clearScriptState,
  };
}