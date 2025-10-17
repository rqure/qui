// Faceplate Builder Constants
// These constants define UI element sizes in pixels.
// They are converted to appropriate Leaflet coordinate units based on the current zoom level.

import L from 'leaflet';

export const DEFAULT_ZOOM_LEVEL = 9;

// Pixel sizes for UI elements (these remain constant)
export const SELECTION_HANDLE_SIZES = {
    resize: 3,      // Radius of corner resize handles in pixels (6px diameter)
    rotate: 4,      // Radius of rotate handle in pixels (8px diameter)
    edge: 3         // Radius of polygon edge handles in pixels (6px diameter)
};

// Pixel spacing for UI elements (these remain constant)
export const SELECTION_UI_SPACING = {
    rotateHandleOffset: 12,  // Distance above shape for rotate handle in pixels
    polygonRotateOffset: 18  // Distance above polygon for rotate handle in pixels
};

// Shape default sizes in coordinate units
export function getDefaultShapeSizes(map: any) {
    return {
        circle: {
            radius: p2crs(6, map)
        },
        polygon: {
            edges: [
                { x: p2crs(-5, map), y: p2crs(-5, map) },
                { x: p2crs(5, map), y: p2crs(-5, map) },
                { x: 0, y: p2crs(5, map) }
            ]
        },
        polyline: {
            edges: [
                { x: p2crs(-6, map), y: 0 },
                { x: 0, y: p2crs(-4, map) },
                { x: p2crs(6, map), y: 0 }
            ]
        },
        text: {
            fontSize: p2crs(16, map)
        },
        svgText: {
            width: p2crs(12, map),
            height: p2crs(2, map),
            fontSize: '1em'
        },
        div: {
            width: p2crs(12, map),
            height: p2crs(12, map)
        },
        imageOverlay: {
            width: p2crs(12, map),
            height: p2crs(12, map)
        }
    };
}

// Grid size in coordinate units (calibrated for zoom level 9)
export const GRID_SIZE = 20;

/**
 * Convert pixel size to Leaflet coordinate units (meters) at the given zoom level
 * @param pixelSize Size in pixels
 * @param map Leaflet map instance
 * @returns Size in coordinate units (meters)
 */
export function p2crs(pixelSize: number, map: any): number {
    // Get the center point of the map in LatLng
    const center = map.getCenter();

    // Convert center LatLng to pixel coordinates
    const pointC = map.latLngToContainerPoint(center);

    // Create a second point X pixels to the right
    const pointX = L.point(pointC.x + pixelSize, pointC.y);

    // Convert that back to LatLng
    const latLngX = map.containerPointToLatLng(pointX);

    // Compute the real-world distance between the two LatLngs (in meters)
    const distance = map.distance(center, latLngX);

    return distance;
}

/**
 * Get selection handle sizes in coordinate units for the current zoom level
 * @param map Leaflet map instance
 * @returns Handle sizes in coordinate units
 */
export function getSelectionHandleSizes(map: any) {
    return {
        resize: p2crs(SELECTION_HANDLE_SIZES.resize, map),
        rotate: p2crs(SELECTION_HANDLE_SIZES.rotate, map),
        edge: p2crs(SELECTION_HANDLE_SIZES.edge, map)
    };
}

/**
 * Get selection UI spacing in coordinate units for the current zoom level
 * @param map Leaflet map instance
 * @returns Spacing values in coordinate units
 */
export function getSelectionUISpacing(map: any) {
    return {
        rotateHandleOffset: p2crs(SELECTION_UI_SPACING.rotateHandleOffset, map),
        polygonRotateOffset: p2crs(SELECTION_UI_SPACING.polygonRotateOffset, map)
    };
}