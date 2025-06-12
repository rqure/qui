import type { Drawable } from "./drawable";
import type { Xyz } from "./xyz";

export type HandleType = 'topleft' | 'topright' | 'bottomleft' | 'bottomright' | 'top' | 'right' | 'bottom' | 'left' | 'move';
export type ResizeCursorType = 'nw-resize' | 'ne-resize' | 'sw-resize' | 'se-resize' | 'n-resize' | 'e-resize' | 's-resize' | 'w-resize';
export type MoveCursorType = 'move';

export interface Handle {
    position: Xyz;
    cursor: ResizeCursorType | MoveCursorType;
    handleType: HandleType;
    apply(drawable: Drawable, delta: Xyz): void;
    getDrawOpts(): Record<string, any>;
}

export class ResizeHandle implements Handle {
    position: Xyz;
    cursor: ResizeCursorType;
    handleType: HandleType;

    constructor(position: Xyz, cursor: ResizeCursorType, handleType: HandleType) {
        this.position = position;
        this.cursor = cursor;
        this.handleType = handleType;
    }

    apply(drawable: Drawable, delta: Xyz): void {
        drawable.resize(this, delta);
    }

    getDrawOpts(): Record<string, any> {
        return {
            radius: 4,
            color: '#ffffff',
            fillColor: '#4CAF50',
            fillOpacity: 0.7,
            weight: 1,
            interactive: true,
            pane: 'overlayPane'
        };
    }
}

export class NWResizeHandle extends ResizeHandle {
    constructor(position: Xyz) {
        super(position, 'nw-resize', 'topleft');
    }
}

export class NEResizeHandle extends ResizeHandle {
    constructor(position: Xyz) {
        super(position, 'ne-resize', 'topright');
    }
}

export class SWResizeHandle extends ResizeHandle {
    constructor(position: Xyz) {
        super(position, 'sw-resize', 'bottomleft');
    }
}

export class SEResizeHandle extends ResizeHandle {
    constructor(position: Xyz) {
        super(position, 'se-resize', 'bottomright');
    }
}

export class NResizeHandle extends ResizeHandle {
    constructor(position: Xyz) {
        super(position, 'n-resize', 'top');
    }
}

export class EResizeHandle extends ResizeHandle {
    constructor(position: Xyz) {
        super(position, 'e-resize', 'right');
    }
}

export class SResizeHandle extends ResizeHandle {
    constructor(position: Xyz) {
        super(position, 's-resize', 'bottom');
    }
}

export class WResizeHandle extends ResizeHandle {
    constructor(position: Xyz) {
        super(position, 'w-resize', 'left');
    }
}

export class MoveHandle implements Handle {
    position: Xyz;
    cursor: MoveCursorType;
    handleType: HandleType;

    constructor(position: Xyz) {
        this.position = position;
        this.cursor = 'move';
        this.handleType = 'move';
    }

    apply(drawable: Drawable, delta: Xyz): void {
        drawable.move(delta);
    }

    getDrawOpts(): Record<string, any> {
        return {
            radius: 5,
            color: '#2196F3',
            fillColor: '#2196F3',
            fillOpacity: 0.7,
            weight: 1,
            interactive: true,
            pane: 'overlayPane'
        };
    }
}