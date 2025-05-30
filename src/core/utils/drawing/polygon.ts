import { extend, type LatLngExpression } from "leaflet";
import type { Xyz } from "./xyz";
import { Shape, type IRenderableShape } from "./shape";
import L from "leaflet";
import { cvar } from "./utils";

export class Polygon extends Shape {
    private _edges: Xyz[];

    constructor() {
        super();
        this._edges = [];
        this._shapeGenerator = this;
    }

    public get edges(): Xyz[] {
        return this._edges;
    }

    public set edges(value: Xyz[]) {
        this._edges = value;
    }

    public get edgeLocations(): Xyz[] {
        return this._edges.map(edge => {
            return edge.multiply(this.absoluteScale).
                rotate(this.absoluteRotation).
                plus(this.absoluteOffset);
        });
    }

    public addEdge(value: Xyz) {
        this._edges.push(value);
    }

    public removeEdge(index: number) {
        if (index >= 0 && index < this._edges.length) {
            this._edges.splice(index, 1);
        }
    }

    public generateShape(): IRenderableShape {
        const config = {
            color: this.selected ? cvar('--qui-accent-color') : cvar(this.color),
            fillColor: this.selected ? cvar('--qui-accent-color') : cvar(this.fillColor),
            fillOpacity: this.selected ? 0.2 : this.fillOpacity,
            weight: this.selected ? 2 : this.weight,
            pane: this.pane?.name,
        };
        
        return L.polygon([...this.edgeLocations.map(edge => [edge.y, edge.x] as unknown as LatLngExpression)], config) as unknown as IRenderableShape;
    }

    public contains(point: L.LatLng): boolean {
        const poly = this.edgeLocations.map(edge => [edge.y, edge.x] as [number, number]);
        return this.pointInPolygon([point.lat, point.lng], poly);
    }

    public getBounds(): L.LatLngBounds {
        const edges = this.edgeLocations;
        if (edges.length === 0) {
            return new L.LatLngBounds([0, 0], [0, 0]);
        }

        let minX = edges[0].x, maxX = edges[0].x;
        let minY = edges[0].y, maxY = edges[0].y;

        for (const edge of edges) {
            minX = Math.min(minX, edge.x);
            maxX = Math.max(maxX, edge.x);
            minY = Math.min(minY, edge.y);
            maxY = Math.max(maxY, edge.y);
        }

        return L.latLngBounds([minY, minX], [maxY, maxX]);
    }

    private pointInPolygon(point: [number, number], polygon: Array<[number, number]>): boolean {
        let inside = false;
        const [x, y] = point;

        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const [xi, yi] = polygon[i];
            const [xj, yj] = polygon[j];

            const intersect = ((yi > y) !== (yj > y))
                && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }

        return inside;
    }
}