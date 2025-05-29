export interface QXYZ {
    x: number;
    y: number;
    z: number;
}

export interface QBounds {
    bottomLeft: QXYZ;
    topRight: QXYZ;
}

export type QModelType = 'circle' | 'div' | 'imageOverlay' | 'polygon' | 'polyline' | 'text' | 'svgText' | 'model';

export interface QModelConfig {
    type: QModelType;
    parent?: QModelConfig | undefined;
    isVisible: boolean;
    offset: QXYZ;
    url?: string | undefined;
    pane?: string | undefined;
    pivot: QXYZ;
    rotation: number;
    scale: QXYZ;
    dimensions?: QXYZ | undefined;
    html?: string | undefined;
    stroke?: boolean | undefined;
    color?: string | undefined;
    weight?: number | undefined;
    opacity?: number | undefined;
    dashArray?: string | number[] | undefined;
    dashOffset?: string | undefined;
    fill?: boolean | undefined;
    fillColor?: string | undefined;
    fillOpacity?: number | undefined;
    className?: string | undefined;
    radius?: number | undefined;
    edges?: QXYZ[] | undefined;
}

export function addPoints(p1: QXYZ, p2: QXYZ): QXYZ {
    return {
        x: p1.x + p2.x,
        y: p1.y + p2.y,
        z: p1.z + p2.z
    };
}

export function subtractPoints(p1: QXYZ, p2: QXYZ): QXYZ {
    return {
        x: p1.x - p2.x,
        y: p1.y - p2.y,
        z: p1.z - p2.z
    };
}

export function multiplyPoint(p: QXYZ, factor: number): QXYZ {
    return {
        x: p.x * factor,
        y: p.y * factor,
        z: p.z * factor
    };
}

export function dividePoint(p: QXYZ, factor: number): QXYZ {
    if (factor === 0) {
        throw new Error("Cannot divide by zero");
    }
    return {
        x: p.x / factor,
        y: p.y / factor,
        z: p.z / factor
    };
}

export function getCenter(bounds: QBounds): QXYZ {
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

export function as2dArray(point: QXYZ): [number, number] {
    return [point.y, point.x];
}

export function as3dArray(point: QXYZ): [number, number, number?] {
    return [point.y, point.x, point.z];
}

export function newXYZ(x: number = 0, y: number = 0, z: number = 0): QXYZ {
    return { x, y, z };
}

export function newBounds(bottomLeft: QXYZ, topRight: QXYZ): QBounds {
    return { bottomLeft, topRight };
}

export function newModelConfig(
    type: QModelType,
    parent?: QModelConfig,
    isVisible: boolean = true,
    offset: QXYZ = newXYZ(),
    pane?: string,
    pivot: QXYZ = newXYZ(),
    rotation: number = 0,
    scale: QXYZ = newXYZ(1, 1, 1),
    stroke: boolean = true,
    color: string = '#3388ff',
    weight: number = 3,
    opacity: number = 1.0,
    dashArray?: string | number[],
    dashOffset?: string,
    fill: boolean = false,
    fillColor: string = '#3388ff',
    fillOpacity: number = 0.2,
    className?: string,
    radius?: number,
    dimensions?: QXYZ,
    edges?: QXYZ[],
    url?: string,
): QModelConfig {
    return {
        type,
        url,
        parent,
        isVisible,
        offset,
        pane,
        pivot,
        rotation,
        scale,
        stroke,
        color,
        weight,
        opacity,
        dashArray,
        dashOffset,
        fill,
        fillColor,
        fillOpacity,
        className,
        radius,
        dimensions,
        edges
    };
}

export function absoluteRotation(m: QModelConfig): number {
    // Calculate absolute rotation based on parent model's rotation
    if (m.parent) {
        return (m.parent.rotation + m.rotation) % 360;
    }

    return m.rotation % 360;
}

export function absoluteScale(m: QModelConfig): QXYZ {
    // Calculate absolute scale based on parent model's scale
    if (m.parent) {
        return {
            x: m.parent.scale.x * m.scale.x,
            y: m.parent.scale.y * m.scale.y,
            z: m.parent.scale.z * m.scale.z
        };
    }

    return m.scale;
}

export function absoluteOffset(m: QModelConfig): QXYZ {
    // Calculate absolute offset based on parent model's offset
    if (m.parent) {
        return addPoints(m.parent.offset, m.offset);
    }

    return m.offset;
}

export function locationOf(m: QModelConfig): QXYZ {
    const pivot = m.pivot || newXYZ();
    
    const scale = absoluteScale(m);
    const scaledX = pivot.x * scale.x;
    const scaledY = pivot.y * scale.y;

    const radians = absoluteRotation(m) * Math.PI / 180;
    const rotatedX = scaledX * Math.cos(radians) - scaledY * Math.sin(radians);
    const rotatedY = scaledX * Math.sin(radians) + scaledY * Math.cos(radians);

    const offset = absoluteOffset(m);
    const finalX = offset.x + rotatedX;
    const finalY = offset.y + rotatedY;

    return newXYZ(finalX, finalY, pivot.z + offset.z);
}

export function dimensionsOf(m: QModelConfig): QXYZ {
    if (m.dimensions) {
        return m.dimensions;
    }

    // If no dimensions are specified, return a default size
    return newXYZ(1, 1, 1);
}

export function centerOf(m: QModelConfig): QXYZ {
    const dimensions = dimensionsOf(m);
    const location = locationOf(m);
    
    return newXYZ(
        location.x + dimensions.x / 2,
        location.y + dimensions.y / 2,
        location.z + dimensions.z / 2
    );
}

export function edgesOf(m: QModelConfig): QXYZ[] {
    return (m.edges || []).map(edge => {
        const scale = absoluteScale(m);
        const scaledX = edge.x * scale.x;
        const scaledY = edge.y * scale.y;

        const radians = absoluteRotation(m) * Math.PI / 180;
        const rotatedX = scaledX * Math.cos(radians) - scaledY * Math.sin(radians);
        const rotatedY = scaledX * Math.sin(radians) + scaledY * Math.cos(radians);

        const offset = absoluteOffset(m);
        const finalX = offset.x + rotatedX;
        const finalY = offset.y + rotatedY;

        return newXYZ(finalX, finalY, edge.z + offset.z);
    });
}

export function boundsOf(m: QModelConfig): QBounds {
    const location = locationOf(m);
    const dimensions = dimensionsOf(m);

    return newBounds(
        location,
        newXYZ(
            location.x + dimensions.y, // dim.y is actually the width
            location.y + dimensions.x, // dim.x is actually the height
            location.z + dimensions.z
        )
    );
}

export function bounds2Array(bounds: QBounds): [number, number, number?][] {
    return [
        as3dArray(bounds.bottomLeft),
        as3dArray(bounds.topRight),
    ];
}

export function as2dArrays(points: QXYZ[]): [number, number][] {
    return points.map(p => as2dArray(p));
}