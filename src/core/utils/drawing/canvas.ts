import type { IDrawable } from "./drawable"
import { DrawableEvent } from "./event"
import { Xyz } from "./xyz"

export interface IRenderer {
    render(drawable: IDrawable): void
    zoom: number
    impl: L.Map
}

export class QCanvas implements IRenderer {
    private _implementation: L.Map
    private _bottomLeft: Xyz
    private _topRight: Xyz
    private _mousePosition: Xyz
    private _onMouseMove: DrawableEvent<Xyz>
    private _onZoom: DrawableEvent<Xyz>

    constructor(implementation: L.Map) {
        this._implementation = implementation
        this._bottomLeft = new Xyz()
        this._topRight = new Xyz()
        this._mousePosition = new Xyz()
        this._onMouseMove = new DrawableEvent<Xyz>()
        this._onZoom = new DrawableEvent()

        this._implementation.on("mousemove", (event: L.LeafletMouseEvent) => {
            this._mousePosition = new Xyz(event.latlng.lng, event.latlng.lat, 0)
            this._onMouseMove.trigger(this._mousePosition)
        })

        this._implementation.on("zoom", () => {
            this._onZoom.trigger(this._mousePosition)
        })

        this._implementation.doubleClickZoom.disable()
    }

    public get mousePosition(): Xyz {
        return this._mousePosition
    }

    public moveTo(l: Xyz, zoom: number = 0): void {
        this._implementation.flyTo([l.y, l.x], zoom)
    }

    public setBoundry(from: Xyz, to: Xyz): void {
        this._bottomLeft = from
        this._topRight = to
        this._implementation.fitBounds([[from.y, from.x], [to.y, to.x]])
        this._implementation.setMaxBounds([[from.y, from.x], [to.y, to.x]])
    }

    public get boundaryHeight(): number {
        return Math.abs(this._topRight.y - this._bottomLeft.y)
    }

    public get boundaryWidth(): number {
        return Math.abs(this._topRight.x - this._bottomLeft.x)
    }

    get center(): Xyz {
        return this._bottomLeft.midpoint(this._topRight)
    }

    public render(drawable: IDrawable): void {
        drawable.draw(this)
    }

    public get zoom(): number {
        return this._implementation.getZoom()
    }

    public get impl(): L.Map {
        return this._implementation
    }
}