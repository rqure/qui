import type { Direction } from "leaflet";
import { Polygon } from "./polygon";
import { Shape, type IRenderableShape } from "./shape";

export class Text extends Polygon {
    private _text: string;
    private _direction: Direction;

    constructor() {
        super();
        this._text = "";
        this._direction = "center";

        this._shapeGenerator = this;
    }

    public get text(): string {
        return this._text;
    }

    public set text(value: string) {
        this._text = value;
    }

    public get direction(): Direction {
        return this._direction;
    }

    public set direction(value: Direction) {
        this._direction = value;
    }

    public generateShape(): IRenderableShape {
        const p = super.generateShape() as unknown as L.Polygon;

        p.bindTooltip(this._text, {
            permanent: true,
            direction: this._direction
        });

        return p as unknown as IRenderableShape;
    }
}
