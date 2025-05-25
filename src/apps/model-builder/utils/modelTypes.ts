import type { EntityId } from '@/core/data/types';

// Define the model binding configuration type
export interface BindingConfig {
  entityId: EntityId;
  fieldName: string;
  animation?: string;
}

// Define the property binding in a shape
export interface PropertyBinding {
  binding: boolean;
  entityId: EntityId;
  fieldName: string;
  animation?: string;
}

// Define a shape in the model
export interface ShapeConfig {
  id: string;
  type: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  points?: number[];
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  properties?: Record<string, PropertyBinding>;

  // Nested model support
  nestedModelId?: EntityId;
  nestedModel?: ModelConfig;
}

// Define the overall model configuration
export interface ModelConfig {
  name: string;
  width: number;
  height: number;
  background?: string;
  gridSize?: number;
  snapToGrid?: boolean;
  defaultFill?: string;
  defaultStroke?: string;
  shapes: ShapeConfig[];
  version: string;
}

// Create an empty model configuration
export function createEmptyModel(): ModelConfig {
  return {
    name: 'Untitled Model',
    width: 800,
    height: 600,
    background: '#1e1e1e',
    gridSize: 20,
    snapToGrid: true,
    defaultFill: '#ffffff',
    defaultStroke: '#00ccff',
    shapes: [],
    version: '1.0'
  };
}
