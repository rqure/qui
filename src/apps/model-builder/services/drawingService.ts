import type { ShapeConfig } from '../utils/modelTypes';

/**
 * Apply grid snapping to coordinates
 * 
 * @param x X coordinate
 * @param y Y coordinate
 * @param gridSize Size of the grid
 * @param snapToGrid Whether snapping is enabled
 * @returns Object with snapped x and y coordinates
 */
export function getSnappedPoint(
  x: number, 
  y: number, 
  gridSize: number, 
  snapToGrid: boolean
): { x: number, y: number } {
  if (!snapToGrid) {
    return { x, y };
  }
  
  return {
    x: Math.round(x / gridSize) * gridSize,
    y: Math.round(y / gridSize) * gridSize
  };
}

/**
 * Create a shape config object with specified properties
 * 
 * @param type Type of shape to create
 * @param x X coordinate
 * @param y Y coordinate
 * @param width Width of shape
 * @param height Height of shape
 * @param fill Fill color
 * @param stroke Stroke color
 * @param points Points for line/arrow shapes
 * @param text Text content for text shapes
 * @returns A ShapeConfig object
 */
export function createShapeConfig(
  type: string,
  x: number,
  y: number,
  width: number,
  height: number,
  fill: string,
  stroke: string,
  points: number[] | null = null,
  text: string | null = null
): ShapeConfig {
  const shapeId = 'shape_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
  
  const baseConfig: ShapeConfig = {
    id: shapeId,
    type,
    x,
    y,
    fill,
    stroke,
    strokeWidth: 2
  };
  
  if (width > 0) {
    baseConfig.width = width;
  }
  
  if (height > 0) {
    baseConfig.height = height;
  }
  
  if (points) {
    baseConfig.points = points;
  }
  
  if (text) {
    baseConfig.text = text;
    baseConfig.fontSize = 18;
    baseConfig.fontFamily = 'Arial';
  }
  
  return baseConfig;
}

/**
 * Process drawing points to handle negative dimensions
 * 
 * @param type Shape type
 * @param points Drawing points array [x, y, width, height] or [x1, y1, x2, y2]
 * @returns Processed points appropriate for the shape type
 */
export function processDrawingPoints(
  type: string,
  points: number[]
): { x: number; y: number; width?: number; height?: number; points?: number[] } {
  if (type === 'line' || type === 'arrow') {
    // Fix: Return x and y coordinates of the start point along with the points array
    return {
      x: points[0],
      y: points[1],
      points: points
    };
  }
  
  // Extract the points
  const [startX, startY, width, height] = points;
  
  // Handle negative dimensions for rect and circle
  const x = width < 0 ? startX + width : startX;
  const y = height < 0 ? startY + height : startY;
  const absWidth = Math.abs(width);
  const absHeight = Math.abs(height);
  
  return {
    x,
    y,
    width: absWidth,
    height: absHeight
  };
}

/**
 * Create a final shape from drawing points
 * 
 * @param tool Current drawing tool
 * @param points Drawing points array
 * @param defaultFill Default fill color
 * @param defaultStroke Default stroke color
 * @returns Final ShapeConfig object or null if invalid
 */
export function finalizeShape(
  tool: string,
  points: number[],
  defaultFill: string,
  defaultStroke: string
): ShapeConfig | null {
  if (points.length < 4) return null;
  
  // Minimum size threshold to avoid creating tiny shapes by accident
  const MIN_SIZE = 5;
  
  if (tool === 'rect') {
    const { x, y, width, height } = processDrawingPoints(tool, points);
    
    // Check if width and height are defined
    if (width === undefined || height === undefined) return null;
    
    // Ensure the shape has minimum dimensions
    if (width < MIN_SIZE || height < MIN_SIZE) return null;
    
    return createShapeConfig(
      'rect',
      x,
      y,
      width,
      height,
      defaultFill,
      defaultStroke
    );
  }
  
  else if (tool === 'circle') {
    const { x, y, width, height } = processDrawingPoints(tool, points);
    
    // Check if width and height are defined
    if (width === undefined || height === undefined) return null;
    
    const diameter = Math.max(width, height);
    
    // Ensure the shape has minimum dimensions
    if (diameter < MIN_SIZE) return null;
    
    // Center the circle at the midpoint of the drag area
    const circleX = x + diameter / 2;
    const circleY = y + diameter / 2;
    
    return createShapeConfig(
      'circle',
      circleX,
      circleY,
      diameter,
      diameter,
      defaultFill,
      defaultStroke
    );
  }
  
  else if (tool === 'line' || tool === 'arrow') {
    const [x1, y1, x2, y2] = points;
    
    // Ensure it's not just a click (minimum length)
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    if (length < MIN_SIZE) return null;
    
    return createShapeConfig(
      tool,
      0,
      0,
      0,
      0,
      'transparent',
      defaultStroke,
      points
    );
  }
  
  return null;
}
