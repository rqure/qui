import type { IRenderer } from "./canvas";
import { Drawable, type EditableProperty } from "./drawable";
import { DrawableEvent } from "./event";
import L from "leaflet";


export interface IRenderableShape {
    addTo(renderer: L.Map): any;
    remove(): void;
}

export interface IRenderableShapeGenerator {
    generateShape(): IRenderableShape;
}

export class Shape extends Drawable {
    private _color: string;
    private _fillColor: string;
    private _fillOpacity: number;
    private _weight: number;

    protected _shape?: IRenderableShape;
    protected _shapeGenerator?: IRenderableShapeGenerator;
    protected _onDraw: DrawableEvent<void> = new DrawableEvent<void>();
    protected _resizeHandles: L.CircleMarker[] = [];

    constructor() {
        super();
        this._color = "#000000"; // Default color
        this._fillColor = "#FFFFFF"; // Default fill color
        this._fillOpacity = 1.0; // Default fill opacity
        this._weight = 1; // Default weight
    }

    public get color(): string {
        return this._color;
    }

    public set color(value: string) {
        this._color = value;
    }

    public get fillColor(): string {
        return this._fillColor;
    }

    public set fillColor(value: string) {
        this._fillColor = value;
    }

    public get fillOpacity(): number {
        return this._fillOpacity;
    }

    public set fillOpacity(value: number) {
        this._fillOpacity = value;
    }

    public get weight(): number {
        return this._weight;
    }

    public set weight(value: number) {
        this._weight = value;
    }

    public override draw(r: IRenderer): void {
        this.erase();

        if (r.zoom < this.minZoom) {
            return;
        }

        super.draw(r);
        this._shape = this._shapeGenerator?.generateShape();

        if (this._shape) {
            if (this.pane && !r.impl.getPane(this.pane.name)) {
                r.impl.createPane(this.pane.name);
                const pane = r.impl.getPane(this.pane.name);
                if (pane) {
                    pane.style.zIndex = this.pane.zIndex.toString();
                }
            }

            this._shape.addTo(r.impl);
            this._onDraw.trigger();
            
            // Draw resize handles if selected
            this.drawResizeHandles(r);
        }
    }

    protected drawResizeHandles(r: IRenderer): void {
        // Remove any existing handles
        this.clearResizeHandles();
        
        if (this.selected) {
            const handles = this.getResizeHandles();
            handles.forEach(handle => {
                const markerOptions = {
                    radius: handle.handleType === 'move' ? 6 : 5,
                    color: handle.handleType === 'move' ? '#2196F3' : '#ffffff',
                    fillColor: handle.handleType === 'move' ? '#2196F3' : '#4CAF50',
                    fillOpacity: 1.0,
                    weight: 1.5,
                    interactive: true,
                    pane: 'overlayPane'
                };
                
                const marker = L.circleMarker(
                    [handle.position.y, handle.position.x], 
                    markerOptions
                );
                
                marker.addTo(r.impl);
                
                // Store custom data on the marker
                (marker as any).handleType = handle.handleType;
                (marker as any).cursorStyle = handle.cursor;
                
                marker.on('mouseover', (e) => {
                    document.body.style.cursor = handle.cursor;
                });
                
                marker.on('mouseout', () => {
                    document.body.style.cursor = '';
                });
                
                this._resizeHandles.push(marker);
            });
        }
    }

    protected clearResizeHandles(): void {
        this._resizeHandles.forEach(handle => handle.remove());
        this._resizeHandles = [];
    }

    public override erase(): void {
        this.clearResizeHandles();
        
        if (this._shape) {
            this._shape.remove();
            this._shape = undefined;
        }

        super.erase();
    }

    public override getEditableProperties(): EditableProperty[] {
        return [
            ...super.getEditableProperties(),
            {
                name: 'color',
                type: 'color',
                value: this.color,
                label: 'Color'
            },
            {
                name: 'fillColor',
                type: 'color',
                value: this.fillColor,
                label: 'Fill Color'
            },
            {
                name: 'fillOpacity',
                type: 'range',
                value: this.fillOpacity,
                label: 'Fill Opacity',
                min: 0,
                max: 1,
                step: 0.1
            }
        ];
    }
}