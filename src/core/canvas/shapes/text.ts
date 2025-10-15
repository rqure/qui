/**
 * Text shape
 * 
 * Ported from qschematic's Text class
 * Uses Leaflet tooltip for text display
 */

import L from 'leaflet';
import { Drawable, type ICanvas } from './base';

export class Text extends Drawable {
  private _text: string = '';
  private _fontSize: number = 14;
  private _color: string = '#ffffff';
  private _direction: 'center' | 'top' | 'bottom' | 'left' | 'right' = 'center';
  private _className: string = 'canvas-text-label';

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
  setFontSize(size: number): this {
    this._fontSize = size;
    return this;
  }

  /**
   * Get font size
   */
  getFontSize(): number {
    return this._fontSize;
  }

  /**
   * Set text color
   */
  setColor(color: string): this {
    this._color = this.parseColor(color);
    return this;
  }

  /**
   * Get text color
   */
  getColor(): string {
    return this._color;
  }

  /**
   * Set text direction/alignment
   */
  setDirection(direction: 'center' | 'top' | 'bottom' | 'left' | 'right'): this {
    this._direction = direction;
    return this;
  }

  /**
   * Get text direction
   */
  getDirection(): string {
    return this._direction;
  }

  /**
   * Set CSS class name
   */
  setClassName(className: string): this {
    this._className = className;
    return this;
  }

  /**
   * Get CSS class name
   */
  getClassName(): string {
    return this._className;
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
   * Draw the text
   */
  draw(canvas: ICanvas): void {
    this.canvas = canvas;

    // Check zoom visibility
    if (!this.isVisibleAtZoom(canvas.getZoom())) {
      return;
    }

    // Get effective position
    const pos = this.getEffectivePosition();

    // Create a transparent circle marker as anchor
    const marker = L.circleMarker([pos.y, pos.x], {
      radius: 0,
      opacity: 0,
      fillOpacity: 0,
      interactive: false
    });

    // Set pane if specified
    if (this._pane) {
      canvas.getOrCreatePane(this._pane.name, this._pane.level);
      marker.options.pane = this._pane.name;
    }

    // Bind tooltip with text
    marker.bindTooltip(this._text, {
      permanent: true,
      direction: this._direction,
      className: `${this._className} canvas-text-size-${this._fontSize}`,
      offset: [0, 0]
    });

    // Store reference and add to map
    this.layer = marker;
    this.layer.addTo(canvas.getMap());

    // Apply rotation immediately
    const rotation = -this.getAbsoluteRotation() * (180 / Math.PI); // Convert to degrees and negate for CSS clockwise rotation
    const tooltipEl = marker.getTooltip()?.getElement();
    if (tooltipEl) {
      tooltipEl.style.transform = `rotate(${rotation}deg)`;
      tooltipEl.style.transformOrigin = 'center center';
    }

    // Also apply on add event for safety
    marker.on('add', () => {
      const tooltipEl = marker.getTooltip()?.getElement();
      if (tooltipEl) {
        tooltipEl.style.color = this._color;
        tooltipEl.style.fontSize = `${this._fontSize * this.getAbsoluteScale().x}px`;
        const rotation = -this.getAbsoluteRotation() * (180 / Math.PI); // Convert to degrees and negate for CSS clockwise rotation
        tooltipEl.style.transform = `rotate(${rotation}deg)`;
        tooltipEl.style.transformOrigin = 'center center';
      }
    });

    // Emit draw event
    this.emit('draw');
  }

  /**
   * Erase the text
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
