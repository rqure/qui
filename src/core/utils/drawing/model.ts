import type { IRenderer } from "./canvas";
import { Drawable, type ResizeHandle } from "./drawable";
import { Xyz } from "./xyz";


export class Model extends Drawable {
    private _submodels: Array<Drawable>;

    constructor() {
        super();
        this._submodels = [];
    }

    public addSubmodel(shape: Drawable): void {
        shape.parent = this;
        this._submodels.push(shape);
    }

    public removeSubmodel(shape: Drawable): void {
        const index = this._submodels.indexOf(shape);
        if (index !== -1) {
            this._submodels.splice(index, 1);
            shape.parent = undefined;
        }
    }

    public erase() {
        for (const shape of this._submodels) {
            shape.erase();
        }

        super.erase();
    }

    public get submodels(): Array<Drawable> {
        return this._submodels;
    }

    public set submodels(value: Array<Drawable>) {
        for (const shape of this._submodels) {
            shape.parent = undefined;
        }

        this._submodels = value;
        for (const shape of this._submodels) {
            shape.parent = this;
        }
    }

    public draw(r: IRenderer): void {
        super.draw(r);

        for (const shape of this._submodels) {
            shape.draw(r);
        }
    }

    public destroy(): void {
        for (const shape of this._submodels) {
            shape.destroy();
        }

        this._submodels = [];

        super.destroy();
    }
    
    // Override resize to propagate to children
    public override resize(handle: ResizeHandle, delta: Xyz): void {
        // Handle model-specific resizing if needed
        
        super.resize(handle, delta);
    }
    
    // Override move to propagate to children
    public override move(delta: Xyz): void {
        super.move(delta);
        // No need to manually move children since they use absoluteOffset
    }
}