import type { IRenderer } from "./canvas";
import { Drawable } from "./drawable";
import { DrawableEvent } from "./event";


export interface IRenderableShape {
    addTo(renderer: IRenderer): any;
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

            this._shape.addTo(r);

            this._onDraw.trigger();
        }
    }
}