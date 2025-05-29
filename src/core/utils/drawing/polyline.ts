import { Shape, type IRenderableShape } from "./shape";
import { Xyz } from "./xyz";
import L from "leaflet";

export class Polyline extends Shape {
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
            return edge.multiply(this.absoluteScale)
                .rotate(this.absoluteRotation)
                .plus(this.absoluteOffset);
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
            color: this.color,
            opacity: this.fillOpacity,
            weight: this.weight,
            pane: this.pane?.name,
        };

        const edgeLocations = this.edges.map(edge => {
            return edge.multiply(this.absoluteScale)
                .rotate(this.absoluteRotation)
                .plus(this.absoluteOffset);
        });

        return L.polyline(
            [...edgeLocations.map(edge => [edge.y, edge.x] as unknown as L.LatLngExpression)],
            config
        ) as unknown as IRenderableShape;
    }
}