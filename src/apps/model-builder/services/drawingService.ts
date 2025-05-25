import { v4 as uuidv4 } from 'uuid';
import type { ShapeConfig } from '../utils/modelTypes';

/**
 * Gets a point snapped to the grid
 * @param x X coordinate
 * @param y Y coordinate
 * @param gridSize Grid size
 * @param snapToGrid Whether to snap to grid
 * @returns Snapped point
 */
export function getSnappedPoint(x: number, y: number, gridSize: number, snapToGrid: boolean): { x: number, y: number } {
  if (!snapToGrid) {
    return { x, y };
  }
  
  return {
    x: Math.round(x / gridSize) * gridSize,
    y: Math.round(y / gridSize) * gridSize
  };
}

/**
 * Creates a new shape configuration
 * @param type Shape type
 * @param x X coordinate
 * @param y Y coordinate
 * @param width Width
 * @param height Height
 * @param fill Fill color
 * @param stroke Stroke color
 * @param points Points for lines and arrows
 * @param text Text content
 * @returns Shape configuration
 */
export function createShapeConfig(
  type: string,
  x: number,
  y: number,
  width: number,
  height: number,
  fill: string = '#ffffff',
  stroke: string = '#000000',
  points?: number[] | null,
  text?: string,
): ShapeConfig {
  const id = `shape_${uuidv4().substring(0, 8)}`;
  
  const baseConfig: ShapeConfig = {
    id,
    type,
    x,
    y,
    fill,
    stroke,
    strokeWidth: 2,
    properties: {}
  };
  
  // Add type-specific properties
  switch (type) {
    case 'rect':
      baseConfig.width = width;
      baseConfig.height = height;
      break;
      
    case 'circle':
      // For circle, use width as diameter
      baseConfig.width = Math.max(width, height);
      break;
      
    case 'line':
    case 'arrow':
      // For lines and arrows, use points
      if (points && points.length >= 4) {
        baseConfig.points = points;
      } else {
        baseConfig.points = [0, 0, 100, 100]; // Default points
      }
      break;
      
    case 'text':
      baseConfig.width = width;
      baseConfig.height = height;
      baseConfig.text = text || 'Text';
      baseConfig.fontSize = 18;
      baseConfig.fontFamily = 'Arial';
      break;
  }
  
  return baseConfig;
}

/**
 * Handles mouse movements during drawing to calculate shape dimensions
 * @param tool Drawing tool
 * @param startX Starting X coordinate
 * @param startY Starting Y coordinate
 * @param currentX Current X coordinate
 * @param currentY Current Y coordinate
 * @param gridSize Grid size
 * @param snapToGrid Whether to snap to grid
 * @returns Processed drawing points
 */
export function processDrawingPoints(
  tool: string,
  startX: number,
  startY: number,
  currentX: number,
  currentY: number,
  gridSize: number,
  snapToGrid: boolean
): number[] {
  let x = startX;
  let y = startY;
  let endX = currentX;
  let endY = currentY;
  
  if (snapToGrid) {
    const snappedStart = getSnappedPoint(startX, startY, gridSize, true);
    const snappedEnd = getSnappedPoint(currentX, currentY, gridSize, true);
    
    x = snappedStart.x;
    y = snappedStart.y;
    endX = snappedEnd.x;
    endY = snappedEnd.y;
  }
  
  if (tool === 'line' || tool === 'arrow') {
    return [x, y, endX, endY];
  } else if (tool === 'rect' || tool === 'circle') {
    const width = endX - x;
    const height = endY - y;
    return [x, y, width, height];
  }
  
  return [x, y, 0, 0];
}

/**
 * Finalizes shape properties after drawing is complete
 * @param tool Drawing tool
 * @param points Drawing points
 * @param defaultFill Default fill color
 * @param defaultStroke Default stroke color
 * @returns Shape configuration
 */
export function finalizeShape(
  tool: string,
  points: number[],
  defaultFill: string = '#ffffff',
  defaultStroke: string = '#000000'
): ShapeConfig | null {
  // Ensure we have valid points
  if (points.length < 4) return null;
  
  let [x, y, width, height] = points;
  
  // For line and arrow, we need to handle the points differently
  if (tool === 'line' || tool === 'arrow') {
    // Check if line is long enough to be meaningful
    const [x1, y1, x2, y2] = points;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < 5) return null; // Line too short to be meaningful
    
    return createShapeConfig(tool, 0, 0, 0, 0, defaultFill, defaultStroke, points);
  } 
  // For rectangle and circle, handle width and height
  else if (tool === 'rect' || tool === 'circle') {
    // Handle negative dimensions
    if (width < 0) {
      x += width;
      width = Math.abs(width);
    }
    
    if (height < 0) {
      y += height;
      height = Math.abs(height);
    }
    
    // Check if shape is large enough to be meaningful
    if (width < 5 || height < 5) return null;
    
    return createShapeConfig(tool, x, y, width, height, defaultFill, defaultStroke);
  }
  else if (tool === 'text') {
    return createShapeConfig(tool, x, y, 150, 30, defaultFill, defaultStroke, null, 'Text');
  }
  
  return null;
}
