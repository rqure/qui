import { Shape, type IRenderableShape } from "./shape";
import L from "leaflet";
import { cvar } from "./utils";
import { Xyz } from "./xyz";
import type { EditableProperty } from "./drawable";
import type { ResizeHandle } from "./handles";

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
            color: this.getColorForState(),
            fillColor: this.getFillColorForState(),
            fillOpacity: this.getFillOpacityForState(),
            radius: this.radius,
            weight: this.getWeightForState(),
            pane: this.pane?.name,
            interactive: this.isSelectable,
        }

        const l = this.location;
        return L.circle([l.y, l.x], config) as unknown as IRenderableShape;
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
        if (this.isSelectable && this.selected) return 0.1;
        if (this.isHoverable && this.isHovering) return this.fillOpacity * 0.5;
        return this.fillOpacity;
    }

    private getWeightForState(): number {
        if (this.isSelectable && this.selected) return Math.min(2, this.weight + 0.5);
        if (this.isHoverable && this.isHovering) return Math.min(this.weight * 1.2, this.weight + 0.5);
        return this.weight;
    }

    public contains(point: L.LatLng): boolean {
        const center = this.location;
        const p = new Xyz(point.lng, point.lat, 0)
        const distance = p.distanceTo(center);
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

    public override getEditableProperties(): EditableProperty[] {
        return [
            ...super.getEditableProperties(),
            {
                name: 'radius',
                type: 'number',
                value: this.radius,
                label: 'Radius'
            }
        ];
    }
    
    // Override resize to handle circle specific resizing
    public override resize(handle: ResizeHandle, delta: Xyz): void {
        const center = this.location;
        const handlePos = handle.position;
        const distance = new Xyz(handlePos.x, handlePos.y).plus(delta).distanceTo(center);
        
        this.radius = Math.max(1, distance); // Ensure minimum radius of 1
        super.resize(handle, delta);
    }
}