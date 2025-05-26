import type { EntityId, EntityType, FieldType } from '@/core/data/types';

/**
 * Defines the different types of model component properties
 */
export enum PropertyType {
  String = 'string',
  Number = 'number',
  Boolean = 'boolean',
  Color = 'color',
  Options = 'options',
  EntityField = 'entity-field',
  Formula = 'formula'
}

/**
 * Property option for dropdown selection
 */
export interface PropertyOption {
  label: string;
  value: string | number;
}

/**
 * Definition of a property for a model component
 */
export interface PropertyDefinition {
  name: string;
  label?: string;
  type: PropertyType;
  category?: 'basic' | 'style' | 'advanced';
  defaultValue?: any;
  min?: number;
  max?: number;
  step?: number;
  options?: PropertyOption[];
  rank?: number;
}

/**
 * Definition of a model component type
 */
export interface ComponentDefinition {
  type: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  properties: PropertyDefinition[];
  width: number;
  height: number;
  allowResize: boolean;
  allowRotate?: boolean;
}

/**
 * Represents an instance of a model component
 */
export interface ModelComponent {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  z: number;
  properties: Record<string, any>;
  entityBindings?: Record<string, string>;
  formulaBindings?: Record<string, string>;
}

/**
 * Configuration of a complete model
 */
export interface ModelConfig {
  id: EntityId;
  name: string;
  components: ModelComponent[];
  width: number;
  height: number;
  background?: string;
  grid?: boolean;
  gridSize?: number;
  snapToGrid?: boolean;
  zoom?: number;
}

/**
 * Represents a binding between a component property and an entity field
 */
export interface FieldBinding {
  entityType: EntityType;
  entityId?: EntityId;
  fieldType: FieldType;
  propertyName: string;
}

/**
 * Represents a formula-based binding that computes based on multiple fields
 */
export interface FormulaBinding {
  formula: string;
  entityFields: { entityType: EntityType, fieldType: FieldType }[];
  propertyName: string;
}

/**
 * Entity representation for UI models in the database
 */
export interface UIModelEntity {
  id: EntityId;
  name: string;
  description?: string;
  configurationFile?: string;
  components: ModelComponent[];
  width: number;
  height: number;
  lastModified: Date;
}

/**
 * Event data when a component is selected
 */
export interface ComponentSelectionEvent {
  component: ModelComponent | null;
}

/**
 * Event data when a component property changes
 */
export interface PropertyChangeEvent {
  componentId: string;
  propertyName: string;
  value: any;
}

/**
 * Event data for model changes
 */
export interface ModelChangeEvent {
  model: ModelConfig;
  changeType: 'add' | 'update' | 'delete' | 'move' | 'resize' | 'property';
  componentId?: string;
}

/**
 * Status of real-time data connection
 */
export interface DataConnectionStatus {
  connected: boolean;
  lastUpdate: Date | null;
  error: string | null;
}
