/**
 * Polyline shape
 * 
 * Ported from qschematic's Polyline class
 */

import L from 'leaflet';
import { Drawable, type ICanvas } from './base';
import type { Point } from '../types';

export class Polyline extends Drawable {
  private _edges: Point[] = [];
  private _color: string = 'red';
  private _weight: number = 2;
  private _opacity: number = 1.0;

  /**
   * Add an edge (vertex)
   */
  addEdge(point: Point): this {
    this._edges.push(point);
    return this;
  }

  /**
   * Set all edges
   */
  setEdges(edges: Point[]): this {
    this._edges = [...edges];
    return this;
  }

  /**
   * Get all edges
   */
  getEdges(): Point[] {
    return [...this._edges];
  }

  /**
   * Clear all edges
   */
  clearEdges(): this {
    this._edges = [];
    return this;
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
   * Set opacity
   */
  setOpacity(opacity: number): this {
    this._opacity = opacity;
    return this;
  }

  /**
   * Get opacity
   */
  getOpacity(): number {
    return this._opacity;
  }

  /**
   * Parse color (handle CSS variables)
   */
  private parseColor(color: string): string {
    if (color.startsWith('--')) {
      const value = getComputedStyle(document.documentElement)
        .getPropertyValue(color)
        .trim();
      return value || color;
    }
    return color;
  }

  /**
   * Draw the polyline
   */
  draw(canvas: ICanvas): void {
    this.canvas = canvas;

    // Check zoom visibility
    if (!this.isVisibleAtZoom(canvas.getZoom())) {
      return;
    }

    // Need at least 2 points for a line
    if (this._edges.length < 2) {
      console.warn('Polyline requires at least 2 edges');
      return;
    }

    // Get effective position (offset applied to all edges)
    const offset = this.getEffectivePosition();

    // Convert edges to Leaflet LatLng format
    const latlngs: L.LatLngExpression[] = this._edges.map(edge => [
      edge.y + offset.y,
      edge.x + offset.x
    ] as L.LatLngExpression);

    // Create polyline options
    const options: L.PolylineOptions = {
      color: this._color,
      weight: this._weight,
      opacity: this._opacity
    };

    // Set pane if specified
    if (this._pane) {
      canvas.getOrCreatePane(this._pane.name, this._pane.level);
      options.pane = this._pane.name;
    }

    // Create the Leaflet polyline
    this.layer = L.polyline(latlngs, options);

    // Add to map
    this.layer.addTo(canvas.getMap());

    // Emit draw event
    this.emit('draw');
  }

  /**
   * Erase the polyline
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
