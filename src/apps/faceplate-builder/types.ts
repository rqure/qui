export type Vector2 = {
  x: number;
  y: number;
};

export type PrimitivePropertyDefinition = {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'option';
  description?: string;
  options?: Array<{ label: string; value: string }>;
  default?: unknown;
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
};

export type CanvasNode = {
  id: string;
  componentId: string;
  name: string;
  position: Vector2;
  size: Vector2;
  props: Record<string, unknown>;
};

export type Binding = {
  id: string;
  componentId: string;
  componentName: string;
  property: string;
  expression: string;
};
