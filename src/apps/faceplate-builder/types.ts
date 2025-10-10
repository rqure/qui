export type Vector2 = {
  x: number;
  y: number;
};

export type PrimitivePropertyDefinition = {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'option' | 'color';
  description?: string;
  options?: Array<{ label: string; value: string }>;
  default?: unknown;
  min?: number;
  max?: number;
  step?: number;
};

export type PrimitiveDefinition = {
  id: string;
  label: string;
  description: string;
  icon: string;
  category: string;
  defaultSize: Vector2;
  defaultProps: Record<string, unknown>;
  propertySchema: PrimitivePropertyDefinition[];
  previewProps?: Record<string, unknown>;
};

export type PaletteTemplate = {
  id: string;
  label: string;
  description: string;
  icon: string;
  primitiveId: string;
  defaults: {
    size: Vector2;
    props: Record<string, unknown>;
  };
  propertySchema: PrimitivePropertyDefinition[];
  previewProps?: Record<string, unknown>;
  source: 'built-in' | 'custom';
  customComponentId?: string; // Reference to custom component entity if source is 'custom'
};

export type CanvasNode = {
  id: string;
  componentId: string;
  name: string;
  position: Vector2;
  size: Vector2;
  props: Record<string, unknown>;
  selected?: boolean; // For multi-selection support
  parentId?: string | null; // Reference to parent container node
  children?: string[]; // Array of child node IDs (for container primitives)
  zIndex?: number; // Explicit stacking order
};

export type BindingMode = 'field' | 'literal' | 'script';

export type Binding = {
  id: string;
  componentId: string;
  componentName: string;
  property: string;
  expression: string;
  mode?: BindingMode;
  transform?: string | null;
  dependencies?: string[];
  description?: string;
};

// Custom component definition for composing multiple primitives
export type CustomComponentDefinition = {
  id: string; // Entity ID in data store
  name: string;
  description: string;
  icon: string;
  // Child components with relative positions within the custom component
  children: Array<{
    primitiveId: string;
    position: Vector2; // Relative to custom component origin
    size: Vector2;
    props: Record<string, unknown>;
  }>;
  // Bindings within the custom component
  bindings: Array<{
    childIndex: number; // Index in children array
    property: string;
    expression: string;
    mode?: BindingMode;
    transform?: string | null;
    dependencies?: string[];
  }>;
  // Bounding box size
  size: Vector2;
};
