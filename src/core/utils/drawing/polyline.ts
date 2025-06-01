import { Shape, type IRenderableShape } from "./shape";
import { Xyz } from "./xyz";
import L from "leaflet";
import { cvar } from "./utils";
import type { ResizeOrMoveHandle } from "./drawable";

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
            color: this.selected ? cvar('--qui-accent-color') : cvar(this.color),
            opacity: this.selected ? 0.8 : this.fillOpacity,
            weight: this.selected ? 2 : this.weight,
            pane: this.pane?.name,
        };

        return L.polyline(
            [...this.edgeLocations.map(edge => [edge.y, edge.x] as unknown as L.LatLngExpression)],
            config
        ) as unknown as IRenderableShape;
    }

    public contains(point: L.LatLng): boolean {
        const edges = this.edgeLocations;
        if (edges.length < 2) return false;

        const tolerance = 5; // pixels of tolerance for clicking near the line
        const latLng = L.latLng(point);

        for (let i = 1; i < edges.length; i++) {
            const start = L.latLng(edges[i - 1].y, edges[i - 1].x);
            const end = L.latLng(edges[i].y, edges[i].x);
            
            const distance = this.getDistanceToLine(latLng, start, end);
            if (distance <= tolerance) return true;
        }

        return false;
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

    private getDistanceToLine(point: L.LatLng, lineStart: L.LatLng, lineEnd: L.LatLng): number {
        const numerator = Math.abs(
            (lineEnd.lng - lineStart.lng) * (lineStart.lat - point.lat) -
            (lineStart.lng - point.lng) * (lineEnd.lat - lineStart.lat)
        );
        const denominator = Math.sqrt(
            Math.pow(lineEnd.lng - lineStart.lng, 2) +
            Math.pow(lineEnd.lat - lineStart.lat, 2)
        );
        return numerator / denominator;
    }
    
    // Override resize to handle polyline specific resizing
    public override resize(handle: ResizeOrMoveHandle, delta: Xyz): void {
        if (handle.handleType === 'move') return; // Movement is handled separately
        
        // Get bounds before resizing
        const oldBounds = this.getBounds();
        const oldWidth = oldBounds.getEast() - oldBounds.getWest();
        const oldHeight = oldBounds.getNorth() - oldBounds.getSouth();
        
        // Calculate scale factors based on handle type
        let scaleX = 1, scaleY = 1;
        let anchorX = 0, anchorY = 0;
        
        switch(handle.handleType) {
            case 'topleft':
                anchorX = oldBounds.getEast();
                anchorY = oldBounds.getSouth();
                scaleX = (oldWidth - delta.x) / oldWidth;
                scaleY = (oldHeight + delta.y) / oldHeight;
                break;
            case 'topright':
                anchorX = oldBounds.getWest();
                anchorY = oldBounds.getSouth();
                scaleX = (oldWidth + delta.x) / oldWidth;
                scaleY = (oldHeight + delta.y) / oldHeight;
                break;
            case 'bottomleft':
                anchorX = oldBounds.getEast();
                anchorY = oldBounds.getNorth();
                scaleX = (oldWidth - delta.x) / oldWidth;
                scaleY = (oldHeight - delta.y) / oldHeight;
                break;
            case 'bottomright':
                anchorX = oldBounds.getWest();
                anchorY = oldBounds.getNorth();
                scaleX = (oldWidth + delta.x) / oldWidth;
                scaleY = (oldHeight - delta.y) / oldHeight;
                break;
            case 'left':
                anchorX = oldBounds.getEast();
                anchorY = (oldBounds.getNorth() + oldBounds.getSouth()) / 2;
                scaleX = (oldWidth - delta.x) / oldWidth;
                break;
            case 'right':
                anchorX = oldBounds.getWest();
                anchorY = (oldBounds.getNorth() + oldBounds.getSouth()) / 2;
                scaleX = (oldWidth + delta.x) / oldWidth;
                break;
            case 'top':
                anchorX = (oldBounds.getWest() + oldBounds.getEast()) / 2;
                anchorY = oldBounds.getSouth();
                scaleY = (oldHeight + delta.y) / oldHeight;
                break;
            case 'bottom':
                anchorX = (oldBounds.getWest() + oldBounds.getEast()) / 2;
                anchorY = oldBounds.getNorth();
                scaleY = (oldHeight - delta.y) / oldHeight;
                break;
        }
        
        // Avoid negative or zero scaling
        scaleX = Math.max(0.1, scaleX);
        scaleY = Math.max(0.1, scaleY);
        
        // Apply scale to each edge
        const anchor = new Xyz(anchorX, anchorY);
        const newEdges = this._edges.map(edge => {
            const localPos = edge.minus(this.offset); // Get position relative to offset
            const scaledPos = new Xyz(
                localPos.x * scaleX,
                localPos.y * scaleY,
                localPos.z
            );
            return scaledPos.plus(this.offset);
        });
        
        this._edges = newEdges;
        
        // Trigger resize event
        super.resize(handle, delta);
    }
}