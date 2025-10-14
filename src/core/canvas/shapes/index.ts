/**
 * Shape Registry and Exports
 * 
 * Central export point for all canvas shapes
 */

import { Drawable } from './base';
import { Circle } from './circle';
import { Polygon } from './polygon';
import { Polyline } from './polyline';
import { Text } from './text';

export { Drawable, Circle, Polygon, Polyline, Text };

// Shape factory type
export type ShapeFactory = () => Drawable;

// Shape registry for creating shapes by name
export const ShapeRegistry: Record<string, ShapeFactory> = {
  Circle: () => new Circle(),
  Polygon: () => new Polygon(),
  Polyline: () => new Polyline(),
  Text: () => new Text(),
};

/**
 * Create a shape by type name
 */
export function createShape(type: string): Drawable | null {
  const factory = ShapeRegistry[type];
  if (factory) {
    return factory();
  }
  console.error(`Unknown shape type: ${type}`);
  return null;
}

/**
 * Register a custom shape type
 */
export function registerShape(type: string, factory: ShapeFactory): void {
  ShapeRegistry[type] = factory;
}

/**
 * Get all registered shape types
 */
export function getShapeTypes(): string[] {
  return Object.keys(ShapeRegistry);
}
