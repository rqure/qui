/**
 * ImageOverlay shape
 *
 * Ported from qschematic's ImageOverlay class
 */

import L from 'leaflet';
import { Drawable, type ICanvas } from './base';

export class ImageOverlay extends Drawable {
  private _url: string = '';
  private _width: number = 100;
  private _height: number = 100;

  /**
   * Set image URL
   */
  setUrl(url: string): this {
    this._url = url;
    return this;
  }

  /**
   * Get image URL
   */
  getUrl(): string {
    return this._url;
  }

  /**
   * Set width
   */
  setWidth(width: number): this {
    this._width = width;
    return this;
  }

  /**
   * Get width
   */
  getWidth(): number {
    return this._width;
  }

  /**
   * Set height
   */
  setHeight(height: number): this {
    this._height = height;
    return this;
  }

  /**
   * Get height
   */
  getHeight(): number {
    return this._height;
  }

  /**
   * Draw the image overlay
   */
  draw(canvas: ICanvas): void {
    this.canvas = canvas;

    // Check zoom visibility
    if (!this.isVisibleAtZoom(canvas.getZoom())) {
      return;
    }

    // Get effective position
    const pos = this.getEffectivePosition();
    
    // Get scale
    const scale = this.getScale();

    // Create bounds for the overlay with scaling
    const scaledWidth = this._width * scale.x;
    const scaledHeight = this._height * scale.y;
    const bounds: L.LatLngBoundsExpression = [
      [pos.y, pos.x],
      [pos.y + scaledHeight, pos.x + scaledWidth]
    ];

    // Create the Leaflet image overlay
    this.layer = L.imageOverlay(this._url, bounds, {
      interactive: true
    });

    // Set pane if specified
    if (this._pane) {
      canvas.getOrCreatePane(this._pane.name, this._pane.level);
      (this.layer as any).options.pane = this._pane.name;
    }

    // Add to map
    this.layer.addTo(canvas.getMap());

    // Emit draw event
    this.emit('draw');
  }

  /**
   * Erase the image overlay
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