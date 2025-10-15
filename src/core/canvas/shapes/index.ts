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
import { SvgText } from './svg_text';
import { Div } from './div';
import { ImageOverlay } from './image_overlay';

export { Drawable, Circle, Polygon, Polyline, Text, SvgText, Div, ImageOverlay };

// Shape factory type
export type ShapeFactory = () => Drawable;

// Shape registry for creating shapes by name
export const ShapeRegistry: Record<string, ShapeFactory> = {
  Circle: () => new Circle(),
  Polygon: () => new Polygon(),
  Polyline: () => new Polyline(),
  Text: () => new Text(),
  SvgText: () => new SvgText(),
  Div: () => new Div(),
  ImageOverlay: () => new ImageOverlay(),
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
