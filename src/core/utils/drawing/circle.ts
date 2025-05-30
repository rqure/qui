import { Shape, type IRenderableShape } from "./shape";
import L from "leaflet";
import { cvar } from "./utils";

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
            color: this.selected ? cvar('--qui-accent-color') : cvar(this.color),
            fillColor: this.selected ? cvar('--qui-accent-color') : cvar(this.fillColor),
            fillOpacity: this.selected ? 0.2 : this.fillOpacity,
            radius: this.radius,
            weight: this.selected ? 2 : this.weight,
            pane: this.pane?.name,
        }

        const l = this.location;
        return L.circle([l.y, l.x], config) as unknown as IRenderableShape;
    }

    public contains(point: L.LatLng): boolean {
        const center = this.location;
        const latLng = L.latLng(point);
        const distance = latLng.distanceTo([center.y, center.x]);
        return distance <= this.radius;
    }

    public getBounds(): L.LatLngBounds {
        const center = this.location;
        const radiusInDegrees = this.radius / 111000; // Approximate conversion from meters to degrees
        return L.latLngBounds(
            [center.y - radiusInDegrees, center.x - radiusInDegrees],
            [center.y + radiusInDegrees, center.x + radiusInDegrees]
        );
    }
}