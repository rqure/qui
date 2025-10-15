/**
 * ImageOverlay shape
 *
 * Ported from qschematic's ImageOverlay class
 */

import L from 'leaflet';
import { Div } from './div';
import type { ICanvas } from './base';

export class ImageOverlay extends Div {
    private _url: string = '';

    /**
     * Set image URL
     */
    setUrl(url: string): this {
        this._url = url;
        this.updateHtml();
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
        super.setWidth(width);
        this.updateHtml();
        return this;
    }

    /**
     * Set height
     */
    setHeight(height: number): this {
        super.setHeight(height);
        this.updateHtml();
        return this;
    }

    /**
     * Update the HTML content with the current image
     */
    private updateHtml(): void {
        const html = `<img src="${this._url}" style="width: 100%; height: 100%; object-fit: contain;" />`;
        this.setHtml(html);
    }

    /**
     * Draw the image overlay
     */
    draw(canvas: ICanvas): void {
        // Initialize HTML if not set
        if (!this.getHtml()) {
            this.updateHtml();
        }

        // Use parent Div draw method
        super.draw(canvas);
    }

    /**
     * Erase the image overlay
     */
    erase(): void {
        // Use parent Div erase method
        super.erase();
    }
}