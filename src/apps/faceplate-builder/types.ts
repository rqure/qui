/**
 * Faceplate Builder Types
 * 
 * This file defines types specific to the faceplate integration layer.
 * It extends the generic canvas types with Store-aware functionality.
 */

import type { 
  EntityId, 
  EntityType, 
  FieldType, 
  NotifyConfig,
  Notification,
  Value 
} from '@/core/data/types';
import type { ShapeConfig, ModelConfig, Point } from '@/core/canvas/types';

/**
 * Notification channel that listens to Store changes and executes a callback.
 * The callback is bound to FaceplateContext, giving access to shapes and Store.
 */
export interface NotificationChannel {
  /** Name/ID for this channel (for debugging/management) */
  name: string;
  
  /** NotifyConfig from qlib-rs (EntityId or EntityType based) */
  config: NotifyConfig;
  
  /** Callback function as JavaScript code string.
   * Executed with 'this' = FaceplateContext
   * Receives notification parameter with current, previous, and context fields
   * 
   * Example:
   * ```
   * function(notification) {
   *   const value = notification.current.value.Int;
   *   const shapes = this.getShapes();
   *   shapes[0].setFillColor(value > 100 ? 'red' : 'green');
   * }
   * ```
   */
  callback: string;
}

/**
 * Extended shape configuration that includes faceplate-specific callbacks.
 * Extends the generic ShapeConfig with Store-aware functionality.
 * 
 * Note: handlers, methods, and contextMenu are already defined in ShapeConfig
 * as Record<string, string>, which is perfect for storing JavaScript code strings.
 * We just extend with type safety for nested shapes.
 */
export interface FaceplateShapeConfig extends ShapeConfig {
  /** Child shapes (for Model/nested structures) - typed for faceplate configs */
  shapes?: FaceplateShapeConfig[];
}

/**
 * Extended model configuration for faceplates
 */
export interface FaceplateModelConfig extends Omit<ModelConfig, 'shapes'> {
  shapes?: FaceplateShapeConfig[];
}

/**
 * Complete faceplate configuration.
 * Stored as JSON in the Faceplate entity's Configuration field.
 */
export interface FaceplateConfig {
  /** Root model containing all shapes */
  model: FaceplateModelConfig;
  
  /** Notification channels that listen to Store changes */
  notificationChannels?: NotificationChannel[];
  
  /** Entity type this faceplate is designed for (informational) */
  targetEntityType?: string;
  
  /** Initialization script executed after faceplate is loaded
   * Bound to FaceplateContext
   * Can perform initial setup, register timers, etc.
   */
  initScript?: string;
}

/**
 * Context passed to notification callbacks.
 * Provides notification data in a structured format.
 */
export interface NotificationContext {
  /** Current field value, timestamp, and writer */
  current: {
    value: Value;
    timestamp: number;
    writerId: EntityId | null;
  };
  
  /** Previous field value (if available) */
  previous?: {
    value: Value;
    timestamp: number;
    writerId: EntityId | null;
  };
  
  /** Context fields pulled in via NotifyConfig.context
   * Key format: 'FieldName' or 'Field1->Field2' for indirection
   */
  context: Record<string, {
    value: Value;
    timestamp: number;
    writerId: EntityId | null;
  }>;
}

/**
 * Options for creating a faceplate renderer
 */
export interface FaceplateRendererOptions {
  /** Container element ID for the canvas */
  containerId: string;
  
  /** Data store instance (typically from useDataStore()) */
  dataStore: any;
  
  /** Optional canvas configuration */
  canvasOptions?: {
    minZoom?: number;
    maxZoom?: number;
    initialZoom?: number;
    initialCenter?: Point;
  };
}

/**
 * Shape registry entry for creating shapes from config
 */
export interface ShapeFactory {
  create: () => any; // Returns Drawable instance
}

/**
 * Internal state for managing notification subscriptions
 */
export interface NotificationSubscription {
  config: NotifyConfig;
  callback: (notification: Notification) => void;
  cleanup: () => Promise<void>;
}
