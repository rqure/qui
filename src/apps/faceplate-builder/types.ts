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
  eventHandlers?: EventHandler[]; // Event handlers for this component
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

/**
 * Event trigger types for interactive components
 */
export type EventTrigger = 
  | 'onClick'      // Button clicks
  | 'onChange'     // Toggle, input value changes
  | 'onInput'      // Input field text changes (fires during typing)
  | 'onSubmit'     // Form submission
  | 'onFocus'      // Input focus
  | 'onBlur';      // Input blur

/**
 * Event handler action types
 */
export type EventActionType = 
  | 'writeField'   // Write value to an entity field
  | 'script'       // Execute custom script
  | 'navigate';    // Navigate to another faceplate (future)

/**
 * Configuration for writeField action
 */
export type WriteFieldAction = {
  type: 'writeField';
  targetEntity?: string;  // Entity path or 'self' (default: bound entity)
  fieldPath: string;      // Field to write to
  valueSource: 'component' | 'literal' | 'expression'; // Where to get the value
  value?: string;         // For literal or expression
};

/**
 * Configuration for script action
 */
export type ScriptAction = {
  type: 'script';
  code: string;           // JavaScript code to execute
  dependencies?: string[]; // Field paths that should be available
};

/**
 * Configuration for navigation action
 */
export type NavigateAction = {
  type: 'navigate';
  targetFaceplate: string; // Faceplate ID or path
  entityContext?: string;  // Entity to bind to
};

/**
 * Union type for all event actions
 */
export type EventAction = WriteFieldAction | ScriptAction | NavigateAction;

/**
 * Event handler definition
 */
export type EventHandler = {
  id: string;
  componentId: string;     // Component this handler belongs to
  trigger: EventTrigger;   // What event triggers this handler
  action: EventAction;     // What action to perform
  description?: string;    // Optional description
  enabled?: boolean;       // Whether this handler is active (default: true)
};
