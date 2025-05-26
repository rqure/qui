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
  if (points.length < 4) {
    console.log('processDrawingPoints: Not enough points', points);
    return { x: 0, y: 0 };
  }

  const [x1, y1, x2, y2] = points;
  
  if (type === 'line' || type === 'arrow') {
    return {
      x: Math.min(x1, x2),
      y: Math.min(y1, y2),
      points: [x1, y1, x2, y2]
    };
  }
  
  // For rectangles and circles, ensure positive dimensions
  const x = Math.min(x1, x2);
  const y = Math.min(y1, y2);
  const width = Math.abs(x2 - x1);
  const height = Math.abs(y2 - y1);
  
  console.log('processDrawingPoints:', { type, input: points, output: { x, y, width, height } });
  
  return { x, y, width, height };
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
  console.log('finalizeShape called:', { tool, points, defaultFill, defaultStroke });
  
  if (points.length < 4) {
    console.log('finalizeShape: Not enough points');
    return null;
  }
  
  // Minimum size threshold to avoid creating tiny shapes by accident
  const MIN_SIZE = 5;
  
  if (tool === 'rect') {
    const { x, y, width, height } = processDrawingPoints(tool, points);
    
    if (width === undefined || height === undefined) {
      console.log('finalizeShape rect: width or height undefined');
      return null;
    }
    
    if (width < MIN_SIZE || height < MIN_SIZE) {
      console.log('finalizeShape rect: shape too small', { width, height, MIN_SIZE });
      return null;
    }
    
    const shape = createShapeConfig('rect', x, y, width, height, defaultFill, defaultStroke);
    console.log('finalizeShape rect: created', shape);
    return shape;
  }
  
  else if (tool === 'circle') {
    const { x, y, width, height } = processDrawingPoints(tool, points);
    
    if (width === undefined || height === undefined) {
      console.log('finalizeShape circle: width or height undefined');
      return null;
    }
    
    const radius = Math.max(width, height) / 2;
    if (radius < MIN_SIZE / 2) {
      console.log('finalizeShape circle: radius too small', { radius, MIN_SIZE });
      return null;
    }
    
    // For circles, we store the center position and radius as width
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    
    const shape = createShapeConfig(
      'circle',
      centerX,
      centerY,
      radius * 2, // Store diameter as width
      radius * 2, // Store diameter as height
      defaultFill,
      defaultStroke
    );
    console.log('finalizeShape circle: created', shape);
    return shape;
  }
  
  else if (tool === 'line' || tool === 'arrow') {
    const { x, y, points: linePoints } = processDrawingPoints(tool, points);
    
    if (!linePoints || linePoints.length < 4) {
      console.log('finalizeShape line/arrow: invalid points');
      return null;
    }
    
    const dx = linePoints[2] - linePoints[0];
    const dy = linePoints[3] - linePoints[1];
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < MIN_SIZE) {
      console.log('finalizeShape line/arrow: distance too small', { distance, MIN_SIZE });
      return null;
    }
    
    const shape = createShapeConfig(tool, x, y, 0, 0, defaultFill, defaultStroke, linePoints);
    console.log('finalizeShape line/arrow: created', shape);
    return shape;
  }
  
  console.log('finalizeShape: unknown tool', tool);
  return null;
}