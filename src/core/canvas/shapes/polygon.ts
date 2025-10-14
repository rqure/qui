/**
 * Polygon shape
 * 
 * Ported from qschematic's Polygon class
 */

import L from 'leaflet';
import { Drawable, type ICanvas } from './base';
import type { Point } from '../types';

export class Polygon extends Drawable {
  private _edges: Point[] = [];
  private _color: string = 'red';
  private _fillColor: string = '#f03';
  private _fillOpacity: number = 0.5;
  private _weight: number = 1;

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
      const value = getComputedStyle(document.documentElement)
        .getPropertyValue(color)
        .trim();
      return value || color;
    }
    return color;
  }

  /**
   * Draw the polygon
   */
  draw(canvas: ICanvas): void {
    this.canvas = canvas;

    // Check zoom visibility
    if (!this.isVisibleAtZoom(canvas.getZoom())) {
      return;
    }

    // Need at least 3 points for a polygon
    if (this._edges.length < 3) {
      console.warn('Polygon requires at least 3 edges');
      return;
    }

    // Get effective position (offset applied to all edges)
    const offset = this.getEffectivePosition();

    // Convert edges to Leaflet LatLng format
    const latlngs: L.LatLngExpression[] = this._edges.map(edge => [
      edge.y + offset.y,
      edge.x + offset.x
    ] as L.LatLngExpression);

    // Create polygon options
    const options: L.PolylineOptions = {
      color: this._color,
      fillColor: this._fillColor,
      fillOpacity: this._fillOpacity,
      weight: this._weight
    };

    // Set pane if specified
    if (this._pane) {
      canvas.getOrCreatePane(this._pane.name, this._pane.level);
      options.pane = this._pane.name;
    }

    // Create the Leaflet polygon
    this.layer = L.polygon(latlngs, options);

    // Add to map
    this.layer.addTo(canvas.getMap());

    // Emit draw event
    this.emit('draw');
  }

  /**
   * Erase the polygon
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
