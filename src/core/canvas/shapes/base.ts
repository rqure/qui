/**
 * Base Drawable class - foundation for all canvas shapes
 * 
 * Inspired by qschematic's Drawable pattern but with TypeScript types
 */

import type { Point, Pane } from '../types';

// Forward declaration to avoid circular imports
export interface ICanvas {
  getZoom(): number;
  getMap(): any;
  getOrCreatePane(name: string, zIndex: number): HTMLElement;
}

export abstract class Drawable {
  protected parent: Drawable | null = null;
  protected canvas: ICanvas | null = null;
  protected layer: any | null = null;
  protected eventHandlers: Map<string, Function[]> = new Map();
  
  // Common properties
  protected _location: Point = { x: 0, y: 0 };
  protected _offset: Point = { x: 0, y: 0 };
  protected _rotation: number = 0;
  protected _scale: Point = { x: 1, y: 1 };
  protected _pivot: Point = { x: 0, y: 0 };
  protected _pane: Pane | null = null;
  protected _minZoom: number | null = null;
  protected _maxZoom: number | null = null;
  protected _scaleWithZoom: boolean = false;
  protected _currentZoom: number = 0;

  /**
   * Set the parent drawable
   */
  setParent(parent: Drawable | null): this {
    this.parent = parent;
    return this;
  }

  /**
   * Get the parent drawable
   */
  getParent(): Drawable | null {
    return this.parent;
  }

  /**
   * Traverse to root drawable
   */
  getRoot(): Drawable {
    let current: Drawable = this;
    while (current.parent) {
      current = current.parent;
    }
    return current;
  }

  /**
   * Set location
   */
  setLocation(location: Point): this {
    this._location = location;
    return this;
  }

  /**
   * Get location
   */
  getLocation(): Point {
    return this._location;
  }

  /**
   * Set offset
   */
  setOffset(offset: Point): this {
    this._offset = offset;
    return this;
  }

  /**
   * Get offset
   */
  getOffset(): Point {
    return this._offset;
  }

  /**
   * Set rotation (in radians)
   */
  setRotation(rotation: number): this {
    this._rotation = rotation;
    return this;
  }

  /**
   * Get rotation
   */
  getRotation(): number {
    return this._rotation;
  }

  /**
   * Set scale
   */
  setScale(scale: Point): this {
    this._scale = scale;
    return this;
  }

  /**
   * Get scale
   */
  getScale(): Point {
    return this._scale;
  }

  /**
   * Set pivot point for rotation
   */
  setPivot(pivot: Point): this {
    this._pivot = pivot;
    return this;
  }

  /**
   * Get pivot point
   */
  getPivot(): Point {
    return this._pivot;
  }

  /**
   * Set pane (layer)
   */
  setPane(pane: Pane): this {
    this._pane = pane;
    return this;
  }

  /**
   * Get pane
   */
  getPane(): Pane | null {
    return this._pane;
  }

  /**
   * Set minimum zoom level
   */
  setMinZoom(minZoom: number): this {
    this._minZoom = minZoom;
    return this;
  }

  /**
   * Set maximum zoom level
   */
  setMaxZoom(maxZoom: number): this {
    this._maxZoom = maxZoom;
    return this;
  }

  /**
   * Set whether to scale with zoom
   */
  setScaleWithZoom(enabled: boolean): this {
    this._scaleWithZoom = enabled;
    return this;
  }

  /**
   * Set current zoom (used for zoom-aware rendering)
   */
  setZoom(zoom: number): this {
    this._currentZoom = zoom;
    return this;
  }

  /**
   * Get current zoom
   */
  getZoom(): number {
    return this._currentZoom;
  }

  /**
   * Calculate effective position (location + offset + rotation)
   * Based on qschematic's approach
   */
  protected getEffectivePosition(): Point {
    const pivot = this._location;
    
    // Apply scaling to the pivot
    const scale = this.getAbsoluteScale();
    const scaledX = pivot.x * scale.x;
    const scaledY = pivot.y * scale.y;
    
    // Apply rotation to the scaled point
    const radians = this.getAbsoluteRotation();
    const rotatedX = Math.cos(radians) * scaledX - Math.sin(radians) * scaledY;
    const rotatedY = Math.sin(radians) * scaledX + Math.cos(radians) * scaledY;
    
    // Apply translation (offset)
    const offset = this.getAbsoluteOffset();
    const finalX = rotatedX + offset.x;
    const finalY = rotatedY + offset.y;
    
    return {
      x: finalX,
      y: finalY,
      z: (pivot.z || 0) + (offset.z || 0)
    };
  }
  
  /**
   * Get absolute rotation (including parent)
   */
  protected getAbsoluteRotation(): number {
    if (this.parent) {
      return (this.parent as any).getAbsoluteRotation() + this._rotation;
    }
    return this._rotation;
  }
  
  /**
   * Get absolute scale (including parent)
   */
  protected getAbsoluteScale(): Point {
    if (this.parent) {
      const parentScale = (this.parent as any).getAbsoluteScale();
      return {
        x: parentScale.x * this._scale.x,
        y: parentScale.y * this._scale.y,
        z: (parentScale.z || 1) * (this._scale.z || 1)
      };
    }
    return this._scale;
  }
  
  /**
   * Get absolute offset (including parent)
   */
  protected getAbsoluteOffset(): Point {
    if (this.parent) {
      const parentOffset = (this.parent as any).getAbsoluteOffset();
      return {
        x: parentOffset.x + this._offset.x,
        y: parentOffset.y + this._offset.y,
        z: (parentOffset.z || 0) + (this._offset.z || 0)
      };
    }
    return this._offset;
  }

  /**
   * Check if should be visible at current zoom
   */
  protected isVisibleAtZoom(zoom: number): boolean {
    if (this._minZoom !== null && zoom < this._minZoom) {
      return false;
    }
    if (this._maxZoom !== null && zoom > this._maxZoom) {
      return false;
    }
    return true;
  }

  /**
   * Draw the shape on the canvas
   */
  abstract draw(canvas: ICanvas): void;

  /**
   * Erase the shape from the canvas
   */
  abstract erase(): void;

  /**
   * Destroy the shape and clean up resources
   */
  destroy(): void {
    this.erase();
    this.eventHandlers.clear();
    this.parent = null;
    this.canvas = null;
  }

  /**
   * Attach an event handler
   */
  on(event: string, handler: Function): this {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
    return this;
  }

  /**
   * Detach an event handler
   */
  off(event: string, handler: Function): this {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
    return this;
  }

  /**
   * Emit an event
   */
  protected emit(event: string, data?: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for '${event}':`, error);
        }
      });
    }
  }

  /**
   * Get the Leaflet layer (if created)
   */
  getLayer(): L.Layer | null {
    return this.layer;
  }

  /**
   * Get the canvas (if attached)
   */
  getCanvas(): ICanvas | null {
    return this.canvas;
  }
}
