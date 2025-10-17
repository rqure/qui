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

// Shape default sizes in pixels (these remain constant pixel values)
export const DEFAULT_SHAPE_SIZES = {
  circle: {
    radius: 6
  },
  polygon: {
    edges: [
      { x: -5, y: -5 },
      { x: 5, y: -5 },
      { x: 0, y: 5 }
    ]
  },
  polyline: {
    edges: [
      { x: -6, y: 0 },
      { x: 0, y: -4 },
      { x: 6, y: 0 }
    ]
  },
  text: {
    fontSize: 16
  },
  svgText: {
    width: 12,
    height: 2,
    fontSize: '1em'
  },
  div: {
    width: 12,
    height: 12
  },
  imageOverlay: {
    width: 12,
    height: 12
  }
};

/**
 * Get default shape sizes in coordinate units for the current zoom level
 * @param map Leaflet map instance
 * @returns Default shape sizes in coordinate units
 */
export function getDefaultShapeSizes(map: any) {
  return {
    circle: {
      radius: p2crs(DEFAULT_SHAPE_SIZES.circle.radius, map)
    },
    polygon: {
      edges: DEFAULT_SHAPE_SIZES.polygon.edges.map(edge => ({
        x: p2crs(edge.x, map),
        y: p2crs(edge.y, map)
      }))
    },
    polyline: {
      edges: DEFAULT_SHAPE_SIZES.polyline.edges.map(edge => ({
        x: p2crs(edge.x, map),
        y: p2crs(edge.y, map)
      }))
    },
    text: {
      fontSize: p2crs(DEFAULT_SHAPE_SIZES.text.fontSize, map)
    },
    svgText: {
      width: p2crs(DEFAULT_SHAPE_SIZES.svgText.width, map),
      height: p2crs(DEFAULT_SHAPE_SIZES.svgText.height, map),
      fontSize: DEFAULT_SHAPE_SIZES.svgText.fontSize
    },
    div: {
      width: p2crs(DEFAULT_SHAPE_SIZES.div.width, map),
      height: p2crs(DEFAULT_SHAPE_SIZES.div.height, map)
    },
    imageOverlay: {
      width: p2crs(DEFAULT_SHAPE_SIZES.imageOverlay.width, map),
      height: p2crs(DEFAULT_SHAPE_SIZES.imageOverlay.height, map)
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