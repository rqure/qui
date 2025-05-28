
export interface QPoint {
    x: number;
    y: number;
    z: number;
}

export interface QBounds {
    bottomLeft: QPoint;
    topRight: QPoint;
}

export function addPoints(p1: QPoint, p2: QPoint): QPoint {
    return {
        x: p1.x + p2.x,
        y: p1.y + p2.y,
        z: p1.z + p2.z
    };
}

export function subtractPoints(p1: QPoint, p2: QPoint): QPoint {
    return {
        x: p1.x - p2.x,
        y: p1.y - p2.y,
        z: p1.z - p2.z
    };
}

export function multiplyPoint(p: QPoint, factor: number): QPoint {
    return {
        x: p.x * factor,
        y: p.y * factor,
        z: p.z * factor
    };
}

export function dividePoint(p: QPoint, factor: number): QPoint {
    if (factor === 0) {
        throw new Error("Cannot divide by zero");
    }
    return {
        x: p.x / factor,
        y: p.y / factor,
        z: p.z / factor
    };
}

export function getCenter(bounds: QBounds): QPoint {
    return {
        x: (bounds.bottomLeft.x + bounds.topRight.x) / 2,
        y: (bounds.bottomLeft.y + bounds.topRight.y) / 2,
        z: (bounds.bottomLeft.z + bounds.topRight.z) / 2
    };
}

export function getWidth(bounds: QBounds): number {
    return bounds.topRight.x - bounds.bottomLeft.x;
}

export function getHeight(bounds: QBounds): number {
    return bounds.topRight.y - bounds.bottomLeft.y;
}

export function as2dArray(point: QPoint): [number, number] {
    return [point.y, point.x];
}

export function as3dArray(point: QPoint): [number, number, number] {
    return [point.y, point.x, point.z];
}
