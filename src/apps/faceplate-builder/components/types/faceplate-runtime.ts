/**
 * Types for FaceplateRuntime component
 */

import type { EntityId, FieldType, NotifyConfig, Notification } from '@/core/data/types';

export interface RenderSlot {
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

export interface NotificationSubscription {
  config: NotifyConfig;
  callback: (notification: Notification) => void;
}

export interface BindingTargetEntry {
  component: string;
  property: string;
  transform?: string | null;
}

export interface TransformContext {
  component: string;
  property: string;
  expressionKey: string;
  entityId: EntityId | null;
  faceplateId: EntityId | null;
  helpers: import('@/apps/faceplate-builder/utils/binding-evaluation-strategies').ScriptHelpers;
  module(name: string): Record<string, unknown> | undefined;
  modules(): Record<string, Record<string, unknown>>;
}

export interface ScriptError {
  module?: string;
  context?: string;
  error: string;
  timestamp: number;
}

export interface BindingMeta {
  expression: string;
  mode: 'field' | 'literal' | 'script' | 'twoWay';
  dependencies: string[];
  description?: string;
}

export interface EventPayload {
  handler: any;
  value?: any;
  nativeEvent?: Event;
}