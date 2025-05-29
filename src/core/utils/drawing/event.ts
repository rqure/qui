export class DrawableEvent<Args> {
    public readonly callbacks: Array<(args: Args) => void> = []
    constructor() {
        this.callbacks = []
    }

    public add(callback: (args: Args) => void): void {
        this.callbacks.push(callback)
    }

    public remove(callback: (args: Args) => void): void {
        const index = this.callbacks.indexOf(callback)
        if (index !== -1) {
            this.callbacks.splice(index, 1)
        }
    }

    public clear(): void {
        this.callbacks.splice(0, this.callbacks.length)
    }

    public trigger(args: Args): void {
        for (const callback of this.callbacks) {
            callback(args)
        }
    }
}