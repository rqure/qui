<script setup lang="ts">
import { ref, onMounted, toRaw, watch, computed } from 'vue';
import "leaflet/dist/leaflet.css";
import L from 'leaflet';
import { QCanvas } from '@/core/utils/drawing/canvas';
import { ModelRegistry } from '@/core/utils/drawing/registry';
import { Circle } from '@/core/utils/drawing/circle';
import { Polygon } from '@/core/utils/drawing/polygon';
import { Polyline } from '@/core/utils/drawing/polyline';
import { Xyz } from '@/core/utils/drawing/xyz';
import CanvasInfo from './CanvasInfo.vue';
import { createGridLayer } from '../utils/CustomGridLayer';

const mapRef = ref<HTMLElement | null>(null);
let lmap: L.Map | null = null;
let canvas: QCanvas | null = null;
const registry = new ModelRegistry();
const showGrid = ref(true);
const mousePos = ref({ x: 0, y: 0 });
const zoomLevel = ref(0);
const canvasSize = ref({ width: 0, height: 0 });
const gridLayer = ref<L.GridLayer | null>(null);
const mode = ref<'pan' | 'select'>('pan');
const selectedShapes = ref<Set<any>>(new Set());
const cursorStyle = computed(() => mode.value === 'select' ? 'pointer' : 'grab');

// Add style constants
const defaultStyle = {
    color: 'var(--qui-text-primary)',
    weight: 1,
    fillColor: 'var(--qui-bg-secondary)',
    fillOpacity: 0.5
};

const selectedStyle = {
    color: 'var(--qui-accent-color)',
    weight: 2,
    fillColor: 'var(--qui-accent-color)',
    fillOpacity: 0.2
};

const isSelecting = ref(false);
const selectionStart = ref<{ x: number; y: number } | null>(null);
const selectionEnd = ref<{ x: number; y: number } | null>(null);

onMounted(() => {
    if (!mapRef.value) return;

    lmap = L.map(mapRef.value, {
        crs: L.CRS.Simple,
        zoomControl: false,
        attributionControl: false,
        preferCanvas: true,  // 👈 Critical for vector performance
        renderer: L.canvas(), // 👈 Force canvas renderer
    });

    canvas = new QCanvas(lmap as L.Map);
    canvas.setBoundry(new Xyz(-1000, -1000), new Xyz(1000, 1000));
    canvas.moveTo(canvas.center)

    // Register available shape types
    registry.register('circle', (config) => {
        return registry.applyConfig(new Circle(), config);
    });

    registry.register('polygon', (config) => {
        return registry.applyConfig(new Polygon(), config);
    });

    registry.register('polyline', (config) => {
        return registry.applyConfig(new Polyline(), config);
    });

    // Add grid layer with proper reference
    if (showGrid.value) {
        gridLayer.value = createGridLayer();
        gridLayer.value.addTo(lmap);
    }

    // Ensure lmap exists before adding event listeners
    if (!lmap) return;

    // Update mode handling
    watch(() => props.mode, (newMode) => {
        if (!lmap) return;
        
        if (newMode === 'pan') {
            lmap.dragging.enable();
            lmap.boxZoom.enable();
            // Clear selection with proper style reset
            selectedShapes.value.forEach((layer: L.Path) => {
                layer.setStyle(defaultStyle);
            });
            selectedShapes.value.clear();
        } else {
            lmap.dragging.disable();
            lmap.boxZoom.disable();
        }
        
        mapRef.value!.style.cursor = newMode === 'pan' ? 'grab' : 'pointer';
    }, { immediate: true });

    // Improved click handling with proper style management
    lmap.on('click', (e: L.LeafletMouseEvent) => {
        if (props.mode !== 'select') return;
        
        // Reset styles of previously selected shapes
        selectedShapes.value.forEach((layer: L.Path) => {
            layer.setStyle(defaultStyle);
        });
        selectedShapes.value.clear();

        // Find clicked shapes with proper type checking
        canvas?.impl.eachLayer((layer: any) => {
            if (layer instanceof L.Path) {
                const bounds = layer.getBounds();
                if (bounds.contains(e.latlng)) {
                    selectedShapes.value.add(layer);
                    layer.setStyle(selectedStyle);
                }
            }
        });
    });

    // Add selection box handling
    lmap.on('mousedown', (e: L.LeafletMouseEvent) => {
        if (props.mode === 'select') {
            isSelecting.value = true;
            selectionStart.value = {
                x: e.containerPoint.x,
                y: e.containerPoint.y
            };
            selectionEnd.value = { ...selectionStart.value };
        } else if (props.mode === 'pan') {
            mapRef.value!.style.cursor = 'grabbing';
        }
    });

    lmap.on('mousemove', (e: L.LeafletMouseEvent) => {
        mousePos.value = { x: e.latlng.lng, y: e.latlng.lat };

        if (isSelecting.value && selectionStart.value) {
            selectionEnd.value = {
                x: e.containerPoint.x,
                y: e.containerPoint.y
            };
        }
    });

    lmap.on('mouseup', (e: L.LeafletMouseEvent) => {
        if (props.mode === 'select' && isSelecting.value) {
            // Find shapes in selection box
            if (selectionStart.value && selectionEnd.value) {
                const bounds = L.bounds(
                    L.point(selectionStart.value.x, selectionStart.value.y),
                    L.point(selectionEnd.value.x, selectionEnd.value.y)
                );

                // Reset previous selection
                selectedShapes.value.forEach((layer: L.Path) => {
                    layer.setStyle(defaultStyle);
                });
                selectedShapes.value.clear();

                // Select shapes that intersect with the selection box
                canvas?.impl.eachLayer((layer: any) => {
                    if (layer instanceof L.Path) {
                        const layerBounds = layer.getBounds();
                        const topLeft = lmap!.latLngToContainerPoint(layerBounds.getNorthWest());
                        const bottomRight = lmap!.latLngToContainerPoint(layerBounds.getSouthEast());
                        const layerScreenBounds = L.bounds(topLeft, bottomRight);

                        if (bounds.overlaps(layerScreenBounds)) {
                            selectedShapes.value.add(layer);
                            layer.setStyle(selectedStyle);
                        }
                    }
                });
            }

            // Reset selection box
            isSelecting.value = false;
            selectionStart.value = null;
            selectionEnd.value = null;
        } else if (props.mode === 'pan') {
            mapRef.value!.style.cursor = 'grab';
        }
    });

    // Clear selection box if mouse leaves the canvas
    lmap.on('mouseout', () => {
        isSelecting.value = false;
        selectionStart.value = null;
        selectionEnd.value = null;
    });

    // Track zoom with null checks
    lmap.on('zoom', () => {
        if (!lmap) return;
        zoomLevel.value = lmap.getZoom();
    });

    // Track canvas size with null checks
    const updateSize = () => {
        if (!lmap) return;
        const bounds = lmap.getBounds();
        canvasSize.value = {
            width: Math.abs(bounds.getEast() - bounds.getWest()),
            height: Math.abs(bounds.getNorth() - bounds.getSouth())
        };
    };

    lmap.on('resize', updateSize);
    lmap.on('move', updateSize);
    updateSize();
});

// Update handleDrop to apply default style to new shapes
const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    if (!canvas || !lmap) return;

    const componentType = event.dataTransfer?.getData('componentType');
    const componentDefaults = JSON.parse(event.dataTransfer?.getData('componentDefaults') || '{}');

    if (!componentType) return;

    const modelGenerator = registry.get(componentType);
    if (!modelGenerator) return;

    // Get the map container's bounds
    const containerRect = mapRef.value!.getBoundingClientRect();

    // Calculate position relative to the map container
    const x = event.clientX - containerRect.left;
    const y = event.clientY - containerRect.top;

    // Convert the container-relative point to map coordinates
    const point = lmap.containerPointToLatLng([x, y]);

    const model = modelGenerator({
        type: componentType,
        offset: { x: point.lng, y: point.lat, z: 0 },
        ...defaultStyle,  // Apply default style to new shapes
        ...componentDefaults
    });

    canvas.render(model);
};

const handleDragOver = (event: DragEvent) => {
    event.preventDefault();
};

const props = defineProps<{
  showGrid?: boolean,
  mode: 'pan' | 'select'  // Make mode required
}>();

const emit = defineEmits<{
  'centerCanvas': [],
  'update:mode': [value: 'pan' | 'select']
}>();

watch(() => props.showGrid, (newValue) => {
  if (!lmap) return;
    
  if (newValue && !gridLayer.value) {
    gridLayer.value = createGridLayer();
    gridLayer.value.addTo(lmap);
  } else if (!newValue && gridLayer.value) {
    gridLayer.value.removeFrom(lmap);
    gridLayer.value = null;
  }
}, { immediate: true });

const centerCanvas = () => {
  if (!canvas || !lmap) return;
  canvas.moveTo(canvas.center, 0); // Reset to center at default zoom
};

// Expose mode and centering method to parent
defineExpose({ centerCanvas, mode });
</script>

<template>
  <div 
    class="canvas-container" 
    @drop="handleDrop" 
    @dragover="handleDragOver"
  >
    <div 
      class="canvas" 
      ref="mapRef"
      :style="{ cursor: props.mode === 'pan' ? 'grab' : 'pointer' }"
    >
      <!-- Add selection box overlay -->
      <div
        v-if="isSelecting && selectionStart && selectionEnd"
        class="selection-box"
        :style="{
          left: `${Math.min(selectionStart.x, selectionEnd.x)}px`,
          top: `${Math.min(selectionStart.y, selectionEnd.y)}px`,
          width: `${Math.abs(selectionEnd.x - selectionStart.x)}px`,
          height: `${Math.abs(selectionEnd.y - selectionStart.y)}px`,
        }"
      ></div>
    </div>
    <CanvasInfo
      :zoom="zoomLevel"
      :mouse-x="mousePos.x"
      :mouse-y="mousePos.y"
      :canvas-width="canvasSize.width"
      :canvas-height="canvasSize.height"
    />
  </div>
</template>

<style>
.canvas-container {
    height: 100%;
    width: 100%;
    background-color: var(--qui-bg-primary);
}

.canvas {
    height: 100%;
    width: 100%;
    position: relative;
    background-color: var(--qui-bg-secondary);
}

:deep(.leaflet-container) {
    height: 100%;
    width: 100%;
    background: var(--qui-bg-secondary);
    /* Remove default cursors to use our custom ones */
    cursor: inherit !important;
}

:deep(.leaflet-interactive) {
    cursor: inherit !important;
}

/* Add theme styling for Leaflet controls */
:deep(.leaflet-control-zoom) {
    border: var(--qui-window-border) !important;
    background-color: var(--qui-bg-secondary) !important;
}

:deep(.leaflet-control-zoom a) {
    background-color: var(--qui-bg-primary) !important;
    color: var(--qui-text-primary) !important;
    border: var(--qui-window-border) !important;
    transition: all var(--qui-transition-speed) var(--qui-animation-bounce);
}

:deep(.leaflet-control-zoom a:hover) {
    background-color: var(--qui-overlay-hover) !important;
    transform: var(--qui-hover-lift);
}

.selection-box {
    position: absolute;
    border: 2px solid var(--qui-accent-color);
    background-color: rgba(0, 255, 136, 0.1);
    pointer-events: none;
    z-index: 1000;
}
</style>