import type { IRenderer } from "./canvas";
import { Drawable } from "./drawable";


class Model extends Drawable {
    private _shapes: Drawable[];

    constructor() {
        super();
        this._shapes = [];
    }

    public addShape(shape: Drawable): void {
        shape.parent = this;
        this._shapes.push(shape);
    }

    public removeShape(shape: Drawable): void {
        const index = this._shapes.indexOf(shape);
        if (index !== -1) {
            this._shapes.splice(index, 1);
            shape.parent = undefined;
        }
    }

    public erase() {
        for (const shape of this._shapes) {
            shape.erase();
        }

        super.erase();
    }

    public get shapes(): Drawable[] {
        return this._shapes;
    }

    public draw(r: IRenderer): void {
        super.draw(r);

        for (const shape of this._shapes) {
            shape.draw(r);
        }
    }

    public destroy(): void {
        for (const shape of this._shapes) {
            shape.destroy();
        }

        this._shapes = [];

        super.destroy();
    }
}