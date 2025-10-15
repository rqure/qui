/**
 * SvgText shape
 *
 * Ported from qschematic's SvgText class
 */

import L from 'leaflet';
import { Drawable, type ICanvas } from './base';

export class SvgText extends Drawable {
  private _text: string = '';
  private _fontSize: string = '1em';
  private _width: number = 100;
  private _height: number = 20;
  private _fillColor: string = 'black';

  /**
   * Set text content
   */
  setText(text: string): this {
    this._text = text;
    return this;
  }

  /**
   * Get text content
   */
  getText(): string {
    return this._text;
  }

  /**
   * Set font size
   */
  setFontSize(size: string): this {
    this._fontSize = size;
    return this;
  }

  /**
   * Get font size
   */
  getFontSize(): string {
    return this._fontSize;
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
   * Draw the SVG text
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

    // Create SVG element
    const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svgElement.setAttribute('viewBox', `0 0 ${this._width} ${this._height}`);
    svgElement.innerHTML = `
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" style="font-size:${this._fontSize};" fill="${this._fillColor}">${this._text}</text>
    `;

    // Create bounds for the overlay with scaling, centered on position
    const scaledWidth = this._width * scale.x;
    const scaledHeight = this._height * scale.y;
    const bounds: L.LatLngBoundsExpression = [
      [pos.y - scaledHeight / 2, pos.x - scaledWidth / 2],
      [pos.y + scaledHeight / 2, pos.x + scaledWidth / 2]
    ];

    // Create the Leaflet SVG overlay
    this.layer = L.svgOverlay(svgElement, bounds);

    // Apply rotation to the SVG element
    this.layer.on('add', () => {
      const container = this.layer?.getContainer?.();
      if (container) {
        const svg = container.querySelector('svg');
        if (svg) {
          const rotation = -this.getAbsoluteRotation() * (180 / Math.PI); // Convert to degrees and negate for CSS clockwise rotation
          svg.style.transform = `rotate(${rotation}deg)`;
          svg.style.transformOrigin = 'center center';
        }
      }
    });

    // Add to map
    this.layer.addTo(canvas.getMap());

    // Apply rotation immediately
    setTimeout(() => {
      const container = this.layer?.getContainer?.();
      if (container) {
        const svg = container.querySelector('svg');
        if (svg) {
          const rotation = -this.getAbsoluteRotation() * (180 / Math.PI); // Convert to degrees and negate for CSS clockwise rotation
          svg.style.transform = `rotate(${rotation}deg)`;
          svg.style.transformOrigin = 'center center';
        }
      }
    }, 0);

    // Emit draw event
    this.emit('draw');
  }

  /**
   * Erase the SVG text
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