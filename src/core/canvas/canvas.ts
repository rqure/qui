/**
 * Canvas - Leaflet-based canvas wrapper
 * 
 * Provides a generic interface for the Leaflet map with CRS.Simple
 * for 2D coordinate-based drawing.
 */

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Point, CanvasOptions, CanvasEventType, CanvasEventHandler } from './types';
import type { ICanvas } from './shapes/base';

export class Canvas implements ICanvas {
  private map: L.Map;
  private mousePosition: Point = { x: 0, y: 0, z: 0 };
  private listeners: Map<string, Set<CanvasEventHandler>> = new Map();
  private containerId: string;
  private panes: Map<string, HTMLElement> = new Map();
  private boundsInitialized = false;

  constructor(containerId: string, options?: CanvasOptions) {
    this.containerId = containerId;

    // Default options matching qschematic
    const defaultOptions: L.MapOptions = {
      crs: L.CRS.Simple,
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: true,  // Enable mouse wheel zoom for better UX
      zoomSnap: 0.1,          // Allow fractional zoom levels (0.1 increments)
      zoomDelta: 0.25,        // Zoom in/out by 0.25 levels per click
      minZoom: 1,             // Minimum zoom level
      doubleClickZoom: false,
      ...options
    };

    // Create the map
    this.map = L.map(containerId, defaultOptions);

    // Set default zoom level to 2 for better initial view
    this.map.setView([300, 500], 2);

    // Set up event handlers
    this.setupEventHandlers();

    // Apply background color if specified
    const container = document.getElementById(containerId);
    if (container) {
      container.style.backgroundColor = options?.canvasBackground || 'var(--qui-bg-primary, #1a1a1a)';
    }
  }

  /**
   * Set up internal event handlers
   */
  private setupEventHandlers(): void {
    // Mouse move
    this.map.on('mousemove', (event: L.LeafletMouseEvent) => {
      const latlng = event.latlng;
      this.mousePosition = {
        x: parseFloat(latlng.lng.toFixed(5)),
        y: parseFloat(latlng.lat.toFixed(5)),
        z: this.getZoom()
      };
      this.notifyListeners('mousemove', event);
    });

    // Zoom
    this.map.on('zoom', (event: L.LeafletEvent) => {
      this.mousePosition.z = this.getZoom();
      this.notifyListeners('zoom', event);
    });

    // Click
    this.map.on('click', (event: L.LeafletMouseEvent) => {
      this.notifyListeners('click', event);
    });

    // Double click
    this.map.on('dblclick', (event: L.LeafletMouseEvent) => {
      this.notifyListeners('dblclick', event);
    });

    // Context menu
    this.map.on('contextmenu', (event: L.LeafletMouseEvent) => {
      this.notifyListeners('contextmenu', event);
    });
  }

  /**
   * Notify all listeners of an event
   */
  private notifyListeners(event: string, data: any): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in canvas event handler for '${event}':`, error);
        }
      });
    }
  }

  /**
   * Set canvas boundary
   */
  setBoundary(from: Point, to: Point): this {
    const bounds: L.LatLngBounds = L.latLngBounds(
      [from.y, from.x],
      [to.y, to.x]
    );

    // Preserve current zoom and center when adjusting bounds
    const currentCenter = this.map.getCenter();
    const currentZoom = this.map.getZoom();

    this.map.setMaxBounds(bounds);

    if (!this.boundsInitialized) {
      // Center the map within the bounds while respecting min zoom
      const center = bounds.getCenter();
      const minZoom = this.map.getMinZoom() ?? 1;
      this.map.setView(center, Math.max(currentZoom, minZoom));
      this.boundsInitialized = true;
    } else {
      // Restore previous view to avoid zoom resets
      this.map.setView(currentCenter, currentZoom, { animate: false });
    }

    return this;
  }

  /**
   * Set background color
   */
  setBackgroundColor(color: string): this {
    const container = document.getElementById(this.containerId);
    if (container) {
      container.style.backgroundColor = color;
    }
    return this;
  }

  /**
   * Set minimum zoom level
   */
  setMinZoom(zoom: number): this {
    this.map.setMinZoom(zoom);
    return this;
  }

  /**
   * Set maximum zoom level
   */
  setMaxZoom(zoom: number): this {
    this.map.setMaxZoom(zoom);
    return this;
  }

  /**
   * Move to a specific point and zoom level
   */
  moveTo(point: Point, zoom?: number): this {
    const targetZoom = zoom !== undefined ? zoom : (point.z !== undefined ? point.z : this.getZoom());
    this.map.flyTo([point.y, point.x], targetZoom);
    return this;
  }

  /**
   * Get current zoom level
   */
  getZoom(): number {
    return this.map.getZoom();
  }

  /**
   * Get current mouse position
   */
  getMousePosition(): Point {
    return { ...this.mousePosition };
  }

  /**
   * Get center point
   */
  getCenter(): Point {
    const center = this.map.getCenter();
    return {
      x: center.lng,
      y: center.lat,
      z: this.getZoom()
    };
  }

  /**
   * Get the underlying Leaflet map
   */
  getMap(): L.Map {
    return this.map;
  }

  /**
   * Create or get a pane for layering
   */
  getOrCreatePane(name: string, zIndex: number): HTMLElement {
    if (this.panes.has(name)) {
      return this.panes.get(name)!;
    }

    const pane = this.map.createPane(name);
    pane.style.zIndex = zIndex.toString();
    this.panes.set(name, pane);
    
    return pane;
  }

  /**
   * Attach an event listener
   */
  on(event: CanvasEventType, handler: CanvasEventHandler): this {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
    return this;
  }

  /**
   * Detach an event listener
   */
  off(event: CanvasEventType, handler: CanvasEventHandler): this {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
    return this;
  }

  /**
   * Get bounds
   */
  getBounds(): { from: Point; to: Point } {
    const bounds = this.map.getBounds();
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    
    return {
      from: { x: sw.lng, y: sw.lat },
      to: { x: ne.lng, y: ne.lat }
    };
  }

  /**
   * Invalidate size (call after container resize)
   */
  invalidateSize(): this {
    this.map.invalidateSize();
    return this;
  }

  /**
   * Destroy the canvas and clean up
   */
  destroy(): void {
    this.listeners.clear();
    this.panes.clear();
    this.map.remove();
  }
}
