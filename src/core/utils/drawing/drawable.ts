import type { IRenderer, QCanvas } from "./canvas";
import { DrawableEvent } from "./event";
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

    private _onDestroy: DrawableEvent<void>;
    private _onClick: DrawableEvent<void>;
    private _onMouseOver: DrawableEvent<void>;
    private _onMouseOut: DrawableEvent<void>;

    constructor() {
        this._isVisible = false;
        this._offset = new Xyz();
        this._pivot = new Xyz();
        this._rotation = 0;
        this._scale = new Xyz(1, 1, 1);
        this._minZoom = 0;
        this._selected = false;

        this._onDestroy = new DrawableEvent<void>();
        this._onClick = new DrawableEvent<void>();
        this._onMouseOver = new DrawableEvent<void>();
        this._onMouseOut = new DrawableEvent<void>();
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

    public get selected(): boolean {
        return this._selected;
    }

    public set selected(value: boolean) {
        this._selected = value;
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
}