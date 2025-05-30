import { DrawableEvent } from "./event";
import { Shape, type IRenderableShape } from "./shape";
import L from "leaflet";

class Div extends Shape {
    private _html: string;
    private _styleSheet: string;
    private _width: number;
    private _height: number;
    private _scaleWithZoom: boolean;
    private _zoom: number;
    private _marker?: L.Marker<any>;
    private _onRender: DrawableEvent<void>;

    constructor() {
        super();

        this._html = "";
        this._styleSheet = "";
        this._width = 100;
        this._height = 100;
        this._scaleWithZoom = true;
        this._zoom = 0;

        this._onRender = new DrawableEvent<void>();
        this._onDraw.add(() => {
            if (this._scaleWithZoom) {
                // apply smooth scaling?
            }

            this._onRender.trigger();
        });

        this._shapeGenerator = this;
    }

    public generateShape(): IRenderableShape {
        const icon = L.divIcon({
            html: this._html,
            iconSize: [this._width, this._height],
            iconAnchor: [this._width / 2, this._height / 2],
        });

        if (!this._marker) {
            const interactive = true;
            this._marker = L.marker([this.location.y, this.location.x], { icon, interactive });
            this._marker.on("click", () => {
                this.onClick.trigger();
            });
        } else {
            this._marker.setIcon(icon);
        }

        return this._marker as unknown as IRenderableShape;
    }

    public get html(): string {
        return this._html;
    }

    public set html(value: string) {
        this._html = value;
    }

    public get width(): number {
        return this._width;
    }

    public set width(value: number) {
        this._width = value;
    }

    public get height(): number {
        return this._height;
    }

    public set height(value: number) {
        this._height = value;
    }

    public get scaleWithZoom(): boolean {
        return this._scaleWithZoom;
    }

    public set scaleWithZoom(value: boolean) {
        this._scaleWithZoom = value;
    }

    public get zoom(): number {
        return this._zoom;
    }

    public set zoom(value: number) {
        this._zoom = value;
    }
}