import { DrawableEvent } from "./event";
import type { ResizeHandle } from "./handles";
import { Shape, type IRenderableShape } from "./shape";
import L from "leaflet";
import type { Xyz } from "./xyz";

export class ImageOverlay extends Shape {
    private _url: string;
    private _width: number;
    private _height: number;


    constructor() {
        super();
        this._url = "";
        this._width = 100;
        this._height = 100;
        this._shapeGenerator = this;
    }

    public get url(): string {
        return this._url;
    }

    public set url(value: string) {
        this._url = value;
    }

    public get width(): number {
        return this._width;
    }

    public set width(value: number) {
        this._width = value;
    }

    public get height(): number {
        return this._height;
    }

    public set height(value: number) {
        this._height = value;
    }

    public override resize(handle: ResizeHandle, delta: Xyz): void {
        const bounds = this.getBounds();
        const oldWidth = bounds.getEast() - bounds.getWest();
        const oldHeight = bounds.getNorth() - bounds.getSouth();
        
        switch(handle.handleType) {
            case 'right':
            case 'bottomright':
            case 'topright':
                this._width = Math.max(10, oldWidth + delta.x);
                break;
            case 'left':
            case 'bottomleft':
            case 'topleft':
                this._width = Math.max(10, oldWidth - delta.x);
                break;
        }
        
        switch(handle.handleType) {
            case 'top':
            case 'topleft':
            case 'topright':
                this._height = Math.max(10, oldHeight + delta.y);
                break;
            case 'bottom':
            case 'bottomleft':
            case 'bottomright':
                this._height = Math.max(10, oldHeight - delta.y);
                break;
        }
        
        super.resize(handle, delta);
    }

    public generateShape(): IRenderableShape {
        const config = {
            pane: this.pane?.name,
            opacity: this.fillOpacity,
            interactive: true
        };

        const l = this.location;

        const overlay = L.imageOverlay(this._url, [
            [l.y, l.x, l.z],
            [this.height + l.y, this.width + l.x, l.z]
        ], config);

        overlay.on("click", () => {
            this.onClick.trigger();
        });

        return overlay as unknown as IRenderableShape;
    }
}