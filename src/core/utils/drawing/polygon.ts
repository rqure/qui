import { extend, type LatLngExpression } from "leaflet";
import { Xyz } from "./xyz";
import { Shape, type IRenderableShape } from "./shape";
import L from "leaflet";
import { cvar } from "./utils";
import type { ResizeHandle } from "./handles";

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
            color: this.getColorForState(),
            fillColor: this.getFillColorForState(),
            fillOpacity: this.getFillOpacityForState(),
            weight: this.getWeightForState(),
            pane: this.pane?.name,
            interactive: this.isSelectable,
        };
        
        return L.polygon([...this.edgeLocations.map(edge => [edge.y, edge.x] as unknown as LatLngExpression)], config) as unknown as IRenderableShape;
    }

    private getColorForState(): string {
        if (this.isSelectable && this.selected) return cvar('--qui-accent-color');
        if (this.isHoverable && this.isHovering) return cvar('--qui-accent-secondary');
        return cvar(this.color);
    }

    private getFillColorForState(): string {
        if (this.isSelectable && this.selected) return cvar('--qui-accent-color');
        if (this.isHoverable && this.isHovering) return cvar('--qui-accent-secondary');
        return cvar(this.fillColor);
    }

    private getFillOpacityForState(): number {
        if (this.isSelectable && this.selected) return 0.1;  // Reduced from 0.2
        if (this.isHoverable && this.isHovering) return this.fillOpacity * 0.5;  // Reduced from 0.8
        return this.fillOpacity;
    }

    private getWeightForState(): number {
        if (this.isSelectable && this.selected) return Math.min(2, this.weight + 0.5);  // More subtle increase
        if (this.isHoverable && this.isHovering) return Math.min(this.weight * 1.2, this.weight + 0.5);  // Reduced from 1.5
        return this.weight;
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
    
    // Override resize to handle polygon specific resizing
    public override resize(handle: ResizeHandle, delta: Xyz): void {
        const bounds = this.getBounds();
        const oldWidth = bounds.getEast() - bounds.getWest();
        const oldHeight = bounds.getNorth() - bounds.getSouth();
        
        let scaleX = 1, scaleY = 1;
        let anchorX = 0, anchorY = 0;
        
        switch(handle.handleType) {
            case 'topleft':
                anchorX = bounds.getEast();
                anchorY = bounds.getSouth();
                scaleX = (oldWidth - delta.x) / oldWidth;
                scaleY = (oldHeight + delta.y) / oldHeight;
                break;
            case 'topright':
                anchorX = bounds.getWest();
                anchorY = bounds.getSouth();
                scaleX = (oldWidth + delta.x) / oldWidth;
                scaleY = (oldHeight + delta.y) / oldHeight;
                break;
            case 'bottomleft':
                anchorX = bounds.getEast();
                anchorY = bounds.getNorth();
                scaleX = (oldWidth - delta.x) / oldWidth;
                scaleY = (oldHeight - delta.y) / oldHeight;
                break;
            case 'bottomright':
                anchorX = bounds.getWest();
                anchorY = bounds.getNorth();
                scaleX = (oldWidth + delta.x) / oldWidth;
                scaleY = (oldHeight - delta.y) / oldHeight;
                break;
            case 'left':
                anchorX = bounds.getEast();
                anchorY = (bounds.getNorth() + bounds.getSouth()) / 2;
                scaleX = (oldWidth - delta.x) / oldWidth;
                break;
            case 'right':
                anchorX = bounds.getWest();
                anchorY = (bounds.getNorth() + bounds.getSouth()) / 2;
                scaleX = (oldWidth + delta.x) / oldWidth;
                break;
            case 'top':
                anchorX = (bounds.getWest() + bounds.getEast()) / 2;
                anchorY = bounds.getSouth();
                scaleY = (oldHeight + delta.y) / oldHeight;
                break;
            case 'bottom':
                anchorX = (bounds.getWest() + bounds.getEast()) / 2;
                anchorY = bounds.getNorth();
                scaleY = (oldHeight - delta.y) / oldHeight;
                break;
        }
        
        scaleX = Math.max(0.1, scaleX);
        scaleY = Math.max(0.1, scaleY);
        
        const anchor = new Xyz(anchorX, anchorY);
        const newEdges = this._edges.map(edge => {
            const localPos = edge.minus(this.offset);
            const scaledPos = new Xyz(
                localPos.x * scaleX,
                localPos.y * scaleY,
                localPos.z
            );
            return scaledPos.plus(this.offset);
        });
        
        this._edges = newEdges;
        super.resize(handle, delta);
    }
}