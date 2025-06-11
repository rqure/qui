import type { IRenderer, QCanvas } from "./canvas";
import { DrawableEvent } from "./event";
import { EResizeHandle, MoveHandle, NEResizeHandle, NResizeHandle, NWResizeHandle, ResizeHandle, SEResizeHandle, SResizeHandle, SWResizeHandle, WResizeHandle, type Handle } from "./handles";
import { Xyz } from "./xyz";
import type { LatLng, LatLngBounds } from 'leaflet';
import L from 'leaflet';

export interface IDrawable {
    draw(r: IRenderer): void;
    erase(): void;
}

export interface Pane {
    name: string;
    zIndex: number;
}

export interface EditableProperty {
    name: string;
    type: 'number' | 'text' | 'color' | 'range';
    value: any;
    label: string;
    min?: number;
    max?: number;
    step?: number;
}

export class Drawable implements IDrawable {
    private _isVisible: boolean;
    private _offset: Xyz;
    private _pane?: Pane;
    private _pivot: Xyz;
    private _rotation: number;
    private _scale: Xyz;
    private _minZoom: number;
    private _parent?: Drawable;
    private _selected: boolean;
    private _isHovering: boolean;

    private _isHoverable: boolean;
    private _isSelectable: boolean;
    private _isMovable: boolean;
    private _isResizable: boolean;

    private _onDestroy: DrawableEvent<void>;
    private _onClick: DrawableEvent<void>;
    private _onMouseOver: DrawableEvent<void>;
    private _onMouseOut: DrawableEvent<void>;
    private _onResize: DrawableEvent<void>;
    private _onMove: DrawableEvent<void>;

    constructor() {
        this._isVisible = false;
        this._offset = new Xyz();
        this._pivot = new Xyz();
        this._rotation = 0;
        this._scale = new Xyz(1, 1, 1);
        this._minZoom = 0;
        this._selected = false;
        this._isHovering = false;
        
        this._isHoverable = true;
        this._isSelectable = true;
        this._isMovable = true;
        this._isResizable = true;

        this._onDestroy = new DrawableEvent<void>();
        this._onClick = new DrawableEvent<void>();
        this._onMouseOver = new DrawableEvent<void>();
        this._onMouseOut = new DrawableEvent<void>();
        this._onResize = new DrawableEvent<void>();
        this._onMove = new DrawableEvent<void>();
    }

    public get isVisible(): boolean {
        return this._isVisible;
    }

    public set isVisible(value: boolean) {
        this._isVisible = value;
    }

    public get parent(): Drawable | undefined {
        return this._parent;
    }

    public set parent(value: Drawable | undefined) {
        this._parent = value;
    }

    public get pivot(): Xyz {
        return this._pivot;
    }

    public set pivot(value: Xyz) {
        this._pivot = value;
    }

    public get rotation(): number {
        return this._rotation;
    }

    public set rotation(value: number) {
        this._rotation = value;
    }

    public get scale(): Xyz {
        return this._scale;
    }

    public set scale(value: Xyz) {
        this._scale = value;
    }

    public get offset(): Xyz {
        return this._offset;
    }

    public set offset(value: Xyz) {
        this._offset = value;
    }

    public get pane(): Pane | undefined {
        return this._pane;
    }

    public set pane(value: Pane | undefined) {
        this._pane = value;
    }

    public get minZoom(): number {
        return this._minZoom;
    }

    public set minZoom(value: number) {
        this._minZoom = value;
    }

    public get absoluteOffset(): Xyz {
        if (this.parent) {
            return this.parent.absoluteOffset.plus(this.offset);
        }
        return this.offset;
    }

    public get absoluteScale(): Xyz {
        if (this.parent) {
            return this.parent.absoluteScale.multiply(this.scale);
        }
        return this.scale;
    }

    public get absoluteRotation(): number {
        if (this.parent) {
            return this.parent.absoluteRotation + this.rotation;
        }
        return this.rotation;
    }

    public get location(): Xyz {
        return this.pivot.
            multiply(this.absoluteScale).
            rotate(this.absoluteRotation).
            plus(this.absoluteOffset);
    }

    public get onDestroy(): DrawableEvent<void> {
        return this._onDestroy;
    }

    public get onClick(): DrawableEvent<void> {
        return this._onClick;
    }

    public get onMouseOver(): DrawableEvent<void> {
        return this._onMouseOver;
    }

    public get onMouseOut(): DrawableEvent<void> {
        return this._onMouseOut;
    }

    public get onResize(): DrawableEvent<void> {
        return this._onResize;
    }

    public get onMove(): DrawableEvent<void> {
        return this._onMove;
    }

    public get selected(): boolean {
        return this._selected;
    }

    public set selected(value: boolean) {
        this._selected = value;
    }

    public get isHovering(): boolean {
        return this._isHovering;
    }

    public set isHovering(value: boolean) {
        this._isHovering = value;
    }

    public get isSelectable(): boolean {
        return this._isSelectable;
    }

    public set isSelectable(value: boolean) {
        this._isSelectable = value;
    }

    public get isMovable(): boolean {
        return this._isMovable;
    }

    public set isMovable(value: boolean) {
        this._isMovable = value;
    }

    public get isResizable(): boolean {
        return this._isResizable;
    }

    public set isResizable(value: boolean) {
        this._isResizable = value;
    }

    public get isHoverable(): boolean {
        return this._isHoverable;
    }

    public set isHoverable(value: boolean) {
        this._isHoverable = value;
    }

    public destroy(): void {
        this._onDestroy.trigger();
        this._onDestroy.clear();
        this._parent = undefined;
        this._pane = undefined;
        this._isVisible = false;
    }

    public draw(r: IRenderer): void {
        this._isVisible = true;
    }

    public erase(): void {
        this._isVisible = false;
    }

    public contains(point: L.LatLng): boolean {
        return false; // Default implementation returns false
    }

    public getBounds(): L.LatLngBounds {
        return new L.LatLngBounds([0, 0], [0, 0]); // Default implementation returns empty bounds
    }

    public getEditableProperties(): EditableProperty[] {
        return [
            {
                name: 'offset.x',
                type: 'number',
                value: this.offset.x,
                label: 'Position X'
            },
            {
                name: 'offset.y',
                type: 'number',
                value: this.offset.y,
                label: 'Position Y'
            },
            {
                name: 'rotation',
                type: 'number',
                value: this.rotation,
                label: 'Rotation'
            }
        ];
    }
    
    // New methods for resizing and moving
    public getHandles(): Handle[] {
        if (!this.selected) return [];
        
        const bounds = this.getBounds();
        const nw = bounds.getNorthWest();
        const ne = bounds.getNorthEast();
        const sw = bounds.getSouthWest();
        const se = bounds.getSouthEast();
        const n = L.latLng((nw.lat + ne.lat) / 2, (nw.lng + ne.lng) / 2);
        const e = L.latLng((ne.lat + se.lat) / 2, (ne.lng + se.lng) / 2);
        const s = L.latLng((sw.lat + se.lat) / 2, (sw.lng + se.lng) / 2);
        const w = L.latLng((nw.lat + sw.lat) / 2, (nw.lng + sw.lng) / 2);
        
        const handles: Handle[] = [];;
        
        handles.push(
            new NWResizeHandle(new Xyz(nw.lng, nw.lat)),
            new NEResizeHandle(new Xyz(ne.lng, ne.lat)),
            new SWResizeHandle(new Xyz(sw.lng, sw.lat)),
            new SEResizeHandle(new Xyz(se.lng, se.lat)),
            new NResizeHandle(new Xyz(n.lng, n.lat)),
            new EResizeHandle(new Xyz(e.lng, e.lat)),
            new SResizeHandle(new Xyz(s.lng, s.lat)),
            new WResizeHandle(new Xyz(w.lng, w.lat)),
            new MoveHandle(new Xyz(bounds.getCenter().lng, bounds.getCenter().lat))
        );
        
        return handles;
    }

    public resize(handle: ResizeHandle, delta: Xyz): void {
        // Override in derived classes for specific resize behavior
        if (!this.isResizable) return;
        this._onResize.trigger();
    }

    public move(delta: Xyz): void {
        if (!this.isMovable) return;
        this.offset = this.offset.plus(delta);
        this._onMove.trigger();
    }
}