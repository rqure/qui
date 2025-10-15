/**
 * Circle shape
 * 
 * Ported from qschematic's Circle class
 */

import L from 'leaflet';
import { Drawable, type ICanvas } from './base';

export class Circle extends Drawable {
  private _radius: number = 1;
  private _color: string = 'red';
  private _fillColor: string = '#f03';
  private _fillOpacity: number = 0.5;
  private _weight: number = 1;

  /**
   * Set radius
   */
  setRadius(radius: number): this {
    this._radius = radius;
    return this;
  }

  /**
   * Get radius
   */
  getRadius(): number {
    return this._radius;
  }

  /**
   * Set stroke color
   */
  setColor(color: string): this {
    this._color = this.parseColor(color);
    return this;
  }

  /**
   * Get stroke color
   */
  getColor(): string {
    return this._color;
  }

  /**
   * Set fill color
   */
  setFillColor(color: string): this {
    this._fillColor = this.parseColor(color);
    return this;
  }

  /**
   * Get fill color
   */
  getFillColor(): string {
    return this._fillColor;
  }

  /**
   * Set fill opacity
   */
  setFillOpacity(opacity: number): this {
    this._fillOpacity = opacity;
    return this;
  }

  /**
   * Get fill opacity
   */
  getFillOpacity(): number {
    return this._fillOpacity;
  }

  /**
   * Set stroke weight
   */
  setWeight(weight: number): this {
    this._weight = weight;
    return this;
  }

  /**
   * Get stroke weight
   */
  getWeight(): number {
    return this._weight;
  }

  /**
   * Parse color (handle CSS variables)
   */
  private parseColor(color: string): string {
    if (color.startsWith('--')) {
      // Get CSS variable value
      const value = getComputedStyle(document.documentElement)
        .getPropertyValue(color)
        .trim();
      return value || color;
    }
    return color;
  }

  /**
   * Draw the circle
   */
  draw(canvas: ICanvas): void {
    this.canvas = canvas;

    // Check zoom visibility
    if (!this.isVisibleAtZoom(canvas.getZoom())) {
      return;
    }

    // Get effective position
    const pos = this.getEffectivePosition();

    // Create circle options
    const options: L.CircleMarkerOptions = {
      color: this._color,
      fillColor: this._fillColor,
      fillOpacity: this._fillOpacity,
      weight: this._weight,
      radius: this._radius * this.getAbsoluteScale().x
    };

    // Set pane if specified
    if (this._pane) {
      canvas.getOrCreatePane(this._pane.name, this._pane.level);
      options.pane = this._pane.name;
    }

    // Create the Leaflet circle
    this.layer = L.circle([pos.y, pos.x], options);

    // Add to map
    this.layer.addTo(canvas.getMap());

    // Apply rotation immediately
    const element = this.layer?.getElement();
    if (element && element.tagName === 'path') {
      const rotation = this.getAbsoluteRotation() * (180 / Math.PI); // Convert to degrees
      element.style.transform = `rotate(${rotation}deg)`;
      element.style.transformOrigin = 'center center';
    }

    // Emit draw event
    this.emit('draw');
  }

  /**
   * Erase the circle
   */
  erase(): void {
    if (this.layer && this.canvas) {
      this.canvas.getMap().removeLayer(this.layer);
      this.layer = null;
    }

    // Emit erase event
    this.emit('erase');
  }
}
