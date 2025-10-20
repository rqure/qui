/**
 * Div shape - HTML div marker
 *
 * Ported from qschematic's Div class
 */

import L from 'leaflet';
import { Drawable, type ICanvas } from './base';
import type { Point } from '../types';

export class Div extends Drawable {
    private _html: string = '';
    private _className: string = '';
    private _width: number = 100;
    private _height: number = 100;
    private _css: string = '';
    private _keyframes: string = '';
    private _styleElement: HTMLStyleElement | null = null;
    private _uniqueClass: string = '';

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
     * Set CSS styles as a string
     */
    setCss(css: string): this {
        this._css = css;
        return this;
    }

    /**
     * Get CSS styles as a string
     */
    getCss(): string {
        return this._css;
    }

    /**
     * Set CSS keyframes as a string
     */
    setKeyframes(keyframes: string): this {
        this._keyframes = keyframes;
        return this;
    }

    /**
     * Get CSS keyframes as a string
     */
    getKeyframes(): string {
        return this._keyframes;
    }

    /**
     * Get zoom scale factor
     */
    private getZoomScaleFactor(): number {
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
        const rotation = -this.getAbsoluteRotation() * (180 / Math.PI); // Convert to degrees and negate for CSS clockwise rotation

        // Find the leaflet-div-icon container
        const container = element.firstElementChild as HTMLElement;
        if (container) {
            // Set the base size
            container.style.width = `${this._width}px`;
            container.style.height = `${this._height}px`;

            container.style.transform = `scale(${scale}) rotate(${rotation}deg)`;
            container.style.transformOrigin = 'center center';
            container.style.transition = 'transform 0.3s ease-in-out';
        }
    }

    /**
     * Apply CSS styles and animations
     */
    private applyStyles(): void {
        if (!this.layer || (!this._css.trim() && !this._keyframes.trim())) return;

        const element = (this.layer as any).getElement?.();
        if (!element) return;

        // Generate unique class for this div instance
        if (!this._uniqueClass) {
            this._uniqueClass = `div-${Math.random().toString(36).substr(2, 9)}`;
        }

        // Find the leaflet-div-icon container
        const container = element.firstElementChild as HTMLElement;
        if (container) {
            // Add the unique class to the container
            container.classList.add(this._uniqueClass);
        }

        // Create or get style element
        const styleId = `style-${this._uniqueClass}`;
        this._styleElement = document.getElementById(styleId) as HTMLStyleElement;
        if (!this._styleElement) {
            this._styleElement = document.createElement('style');
            this._styleElement.id = styleId;
            document.head.appendChild(this._styleElement);
        }

        // Combine keyframes and scoped CSS
        const keyframesCss = this._keyframes.trim();
        const scopedCss = this._css.trim() ? `.${this._uniqueClass} { ${this._css} }` : '';

        this._styleElement.textContent = `${keyframesCss}\n${scopedCss}`.trim();
    }



    /**
     * Draw the div marker
     */
    draw(canvas: ICanvas): void {
        this.canvas = canvas;
        
        // Update current zoom level
        this._currentZoom = canvas.getZoom();

        // Check zoom visibility
        if (!this.isVisibleAtZoom(canvas.getZoom())) {
            return;
        }

        // Get effective position (without scaling applied to position)
        const pos = this.getEffectivePosition();

        // Use unscaled dimensions for Leaflet icon (scaling handled via CSS)
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

        // Apply styles, scaling, and rotation
        this.applyStyles();
        this.applySmoothScaling();

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