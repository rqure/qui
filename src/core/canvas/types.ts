/**
 * Core Canvas Types - Generic, Store-agnostic
 * 
 * These types define the structure for the generic canvas library.
 * They are completely independent of the faceplate system or Store.
 */

/**
 * 2D/3D Point in canvas space
 */
export interface Point {
  x: number;
  y: number;
  z?: number;  // zoom level (optional)
}

/**
 * Pane configuration for layering
 */
export interface Pane {
  name: string;
  level: number;  // z-index for layering
}

/**
 * Shape configuration - generic structure for all drawable shapes
 */
export interface ShapeConfig {
  type: string;  // 'Circle', 'Polygon', 'Text', etc.
  
  // Transform properties
  location?: Point;
  rotation?: number;
  scale?: Point;
  pivot?: Point;
  offset?: Point;
  
  // Appearance properties (shape-specific)
  radius?: number;           // Circle
  color?: string;            // Stroke color
  fillColor?: string;        // Fill color
  fillOpacity?: number;      // Fill opacity (0-1)
  weight?: number;           // Stroke weight
  opacity?: number;          // Overall opacity
  
  // Size properties
  width?: number;
  height?: number;
  
  // Text properties
  text?: string;
  fontSize?: number;
  direction?: string;        // Text direction
  
  // Polygon/Polyline properties
  edges?: Point[];           // Array of vertices
  
  // Div/HTML properties
  html?: string;             // HTML content
  className?: string;        // CSS class name
  
  // Image properties
  url?: string;              // Image URL
  
  // Zoom behavior
  minZoom?: number;          // Minimum zoom to display
  maxZoom?: number;          // Maximum zoom to display
  scaleWithZoom?: boolean;   // Scale with zoom level
  
  // Styling
  styles?: Record<string, any>;      // Custom CSS styles
  animations?: Record<string, any>;  // Animation definitions
  
  // Pane/layer
  pane?: Pane;
  
  // Nested shapes (Model can contain shapes)
  shapes?: ShapeConfig[];
  
  // Callbacks (stored but not processed by canvas)
  handlers?: Record<string, string>;      // event name -> script
  methods?: Record<string, string>;       // method name -> script
  contextMenu?: Record<string, string>;   // label -> script
}

/**
 * Model configuration - container for shapes
 */
export interface ModelConfig {
  type: 'Model';
  shapes: ShapeConfig[];
  canvasBackground?: string;
  boundary?: {
    from: Point;
    to: Point;
  };
  minZoom?: number;
  maxZoom?: number;
}

/**
 * Canvas options for initialization
 */
export interface CanvasOptions {
  crs?: any;                    // Coordinate reference system
  zoomControl?: boolean;
  attributionControl?: boolean;
  scrollWheelZoom?: boolean;
  smoothWheelZoom?: boolean;
  smoothSensitivity?: number;
  minZoom?: number;
  maxZoom?: number;
  zoom?: number;
  center?: [number, number];
  canvasBackground?: string;    // Background color
}

/**
 * Canvas event types
 */
export type CanvasEventType = 'mousemove' | 'zoom' | 'click' | 'dblclick' | 'contextmenu';

/**
 * Canvas event handler
 */
export type CanvasEventHandler = (event: any) => void;
