/**
 * Canvas utility functions
 */

import type { Point } from './types';

/**
 * Calculate distance between two points
 */
export function distance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate angle between two points (in radians)
 */
export function angleBetween(p1: Point, p2: Point): number {
  return Math.atan2(p2.y - p1.y, p2.x - p1.x);
}

/**
 * Rotate a point around a pivot
 */
export function rotatePoint(point: Point, pivot: Point, angle: number): Point {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  
  const dx = point.x - pivot.x;
  const dy = point.y - pivot.y;
  
  return {
    x: pivot.x + (dx * cos - dy * sin),
    y: pivot.y + (dx * sin + dy * cos),
    z: point.z
  };
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Linear interpolation
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Check if a point is inside a bounding box
 */
export function pointInBounds(point: Point, bounds: { from: Point; to: Point }): boolean {
  return (
    point.x >= bounds.from.x &&
    point.x <= bounds.to.x &&
    point.y >= bounds.from.y &&
    point.y <= bounds.to.y
  );
}

/**
 * Parse color string to ensure valid format
 */
export function parseColor(color: string): string {
  // Simple validation - could be expanded
  if (color.startsWith('#') || color.startsWith('rgb') || color.startsWith('hsl')) {
    return color;
  }
  // Default to black if invalid
  return '#000000';
}

/**
 * Convert degrees to radians
 */
export function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Convert radians to degrees
 */
export function toDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}
