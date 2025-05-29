import { Shape, type IRenderableShape } from "./shape";
import L from "leaflet";

export class Circle extends Shape {
    private _radius: number;

    constructor(radius: number = 1) {
        super();
        this._radius = radius;
        this._shapeGenerator = this;
    }

    public get radius(): number {
        return this._radius;
    }

    public set radius(value: number) {
        this._radius = value;
    }

    public generateShape(): IRenderableShape {
        const config = {
            color: this.color,
            fillColor: this.fillColor,
            fillOpacity: this.fillOpacity,
            radius: this.radius,
            pane: this.pane?.name,
        }

        const l = this.location;
        return L.circle([l.y, l.x], config) as unknown as IRenderableShape;
    }
}