/**
 * Div shape - HTML div marker
 *
 * Ported from qschematic's Div class
 */

import L from 'leaflet';
import { Drawable, type ICanvas } from './base';

export class Div extends Drawable {
  private _html: string = '';
  private _className: string = '';
  private _width: number = 100;
  private _height: number = 100;
  private _styles: Map<string, any> = new Map();
  private _animations: Map<string, any> = new Map();
  private _styleElement: HTMLStyleElement | null = null;

  /**
   * Set HTML content
   */
  setHtml(html: string): this {
    this._html = html;
    return this;
  }

  /**
   * Get HTML content
   */
  getHtml(): string {
    return this._html;
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
   * Set whether to scale with zoom
   */
  setScaleWithZoom(enabled: boolean): this {
    this._scaleWithZoom = enabled;
    return this;
  }

  /**
   * Get scale with zoom setting
   */
  getScaleWithZoom(): boolean {
    return this._scaleWithZoom;
  }

  /**
   * Set zoom level
   */
  setZoom(zoom: number): this {
    this._currentZoom = zoom;
    return this;
  }

  /**
   * Get zoom level
   */
  getZoom(): number {
    return this._currentZoom;
  }

  /**
   * Set CSS styles
   */
  setStyles(styles: Record<string, any>): this {
    if (styles) {
      this._styles = new Map(Object.entries(styles));
    }
    return this;
  }

  /**
   * Set CSS animations
   */
  setAnimations(animations: Record<string, any>): this {
    if (animations) {
      this._animations = new Map(Object.entries(animations));
    }
    return this;
  }

  /**
   * Get zoom scale factor
   */
  private getZoomScaleFactor(): number {
    if (!this._scaleWithZoom) {
      return 1;
    }
    return Math.pow(2, this._currentZoom - (this._minZoom || 0));
  }

  /**
   * Apply smooth scaling
   */
  private applySmoothScaling(): void {
    if (!this.layer) return;

    const element = (this.layer as any).getElement?.();
    if (!element) return;

    const scale = this.getZoomScaleFactor();
    element.style.transform = `scale(${scale})`;
    element.style.transformOrigin = 'center center';
  }

  /**
   * Apply CSS styles and animations
   */
  private applyStyles(): void {
    if (!this.layer) return;

    const element = (this.layer as any).getElement?.();
    if (!element || (this._styles.size === 0 && this._animations.size === 0)) return;

    // Create or get style element
    const styleId = `style-${Math.random().toString(36).substr(2, 9)}`;
    this._styleElement = document.getElementById(styleId) as HTMLStyleElement;
    if (!this._styleElement) {
      this._styleElement = document.createElement('style');
      this._styleElement.id = styleId;
      document.head.appendChild(this._styleElement);
    }

    // Build CSS content
    let css = '';

    // Add animations
    this._animations.forEach((keyframes: any, name: string) => {
      css += `@keyframes ${name} { ${keyframes} }\n`;
    });

    // Add styles
    this._styles.forEach((rules: any, selector: string) => {
      css += `${selector} { ${rules} }\n`;
    });

    this._styleElement.textContent = css;
  }

  /**
   * Draw the div marker
   */
  draw(canvas: ICanvas): void {
    this.canvas = canvas;

    // Check zoom visibility
    if (!this.isVisibleAtZoom(canvas.getZoom())) {
      return;
    }

    // Get effective position
    const pos = this.getEffectivePosition();

    // Create div icon
    const icon = L.divIcon({
      className: this._className,
      html: this._html,
      iconSize: [this._width, this._height],
      iconAnchor: [this._width / 2, this._height / 2]
    });

    // Create marker
    this.layer = L.marker([pos.y, pos.x], { icon });

    // Set pane if specified
    if (this._pane) {
      canvas.getOrCreatePane(this._pane.name, this._pane.level);
      (this.layer as any).options.pane = this._pane.name;
    }

    // Add to map
    this.layer.addTo(canvas.getMap());

    // Apply styles and scaling
    this.applyStyles();
    if (this._scaleWithZoom) {
      this.applySmoothScaling();
    }

    // Emit draw event
    this.emit('draw');
  }

  /**
   * Erase the div marker
   */
  erase(): void {
    if (this.layer && this.canvas) {
      this.canvas.getMap().removeLayer(this.layer);
      this.layer = null;
    }

    // Clean up style element
    if (this._styleElement) {
      const parent = this._styleElement.parentNode;
      if (parent) {
        parent.removeChild(this._styleElement);
      }
      this._styleElement = null;
    }

    // Emit erase event
    this.emit('erase');
  }
}