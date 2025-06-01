<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import "leaflet/dist/leaflet.css";
import L from 'leaflet';
import { QCanvas } from '@/core/utils/drawing/canvas';
import { ModelRegistry } from '@/core/utils/drawing/registry';
import { Circle } from '@/core/utils/drawing/circle';
import { Polygon } from '@/core/utils/drawing/polygon';
import { Polyline } from '@/core/utils/drawing/polyline';
import { Xyz } from '@/core/utils/drawing/xyz';
import type { Drawable } from '@/core/utils/drawing/drawable'; // Add this import
import CanvasInfo from './CanvasInfo.vue';
import { createGridLayer } from '../utils/CustomGridLayer';
import { Model } from '@/core/utils/drawing/model';

const defaultStyle = {
    color: '--qui-text-primary',
    weight: 1,
    fillColor: '--qui-bg-secondary',
    fillOpacity: 0.5
};

const mapRef = ref<HTMLElement | null>(null);
let lmap: L.Map | null = null;
let canvas: QCanvas | null = null;
const registry = new ModelRegistry();
const rootModel = ref<Model>(new Model());
const showGrid = ref(true);
const mousePos = ref({ x: 0, y: 0 });
const zoomLevel = ref(0);
const canvasSize = ref({ width: 0, height: 0 });
const gridLayer = ref<L.GridLayer | null>(null);
const mode = ref<'pan' | 'select'>('pan');

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
    canvas.moveTo(canvas.center);
    canvas.render(rootModel.value);  // Render the root model

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

    // Update mode handling with proper types
    watch(() => props.mode, (newMode: 'pan' | 'select') => {
        if (!lmap) return;
        
        if (newMode === 'pan') {
            lmap.dragging.enable();
            lmap.boxZoom.enable();
            rootModel.value.submodels.forEach(drawable => {
                drawable.selected = false;
            });
            canvas?.render(rootModel.value);
        } else {
            lmap.dragging.disable();
            lmap.boxZoom.disable();
        }
        
        mapRef.value!.style.cursor = newMode === 'pan' ? 'grab' : 'pointer';
    }, { immediate: true });

    // Update click handler with proper types
    lmap.on('click', (e: L.LeafletMouseEvent) => {
        if (props.mode !== 'select') return;
        console.log('Canvas clicked at:', e.latlng);
        if (isSelecting.value) {
            isSelecting.value = false;
            return;
        }

        rootModel.value.submodels.forEach(model => {
            model.selected = false;
            if (model.contains(e.latlng)) {
                model.selected = true;
            }
        });
        canvas?.render(rootModel.value);
        emit('selection-change', rootModel.value.submodels.find(m => m.selected) as Drawable);
    });

    // Update mousedown handler to use client coordinates relative to canvas
    lmap.on('mousedown', (e: L.LeafletMouseEvent) => {
        if (props.mode === 'select') {
            const rect = mapRef.value!.getBoundingClientRect();
            selectionStart.value = {
                x: e.originalEvent.clientX - rect.left,
                y: e.originalEvent.clientY - rect.top
            };
            selectionEnd.value = { ...selectionStart.value };
        } else if (props.mode === 'pan') {
            mapRef.value!.style.cursor = 'grabbing';
        }
    });

    // Update mousemove to use client coordinates
    document.addEventListener('mousemove', (e: MouseEvent) => {
        if (selectionStart.value && props.mode === 'select') {
            const rect = mapRef.value!.getBoundingClientRect();
            selectionEnd.value = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };

            // calculate distance from start to end
            const distance = Math.sqrt(
                Math.pow(selectionEnd.value.x - selectionStart.value.x, 2) +
                Math.pow(selectionEnd.value.y - selectionStart.value.y, 2)
            );
            // If distance is less than 5 pixels, don't start selection
            if (distance >= 5) {
                isSelecting.value = true;
            }

            // Update mouse position for info display
            if (lmap && mapRef.value && isSelecting.value) {
                const point = L.point(e.clientX - rect.left, e.clientY - rect.top);
                const latlng = lmap.containerPointToLatLng(point);
                mousePos.value = { x: latlng.lng, y: latlng.lat };
            }
        }

        if (isSelecting.value && selectionStart.value && mapRef.value) {

        }
    });

    // Update mouseup handler with proper types
    document.addEventListener('mouseup', (e: MouseEvent) => {
        if (props.mode === 'select' && isSelecting.value) {
            if (selectionStart.value && selectionEnd.value && mapRef.value) {
                const startPoint = lmap!.containerPointToLatLng(
                    L.point(selectionStart.value.x, selectionStart.value.y)
                );
                const endPoint = lmap!.containerPointToLatLng(
                    L.point(selectionEnd.value.x, selectionEnd.value.y)
                );
                const bounds = L.latLngBounds(startPoint, endPoint);

                rootModel.value.submodels.forEach(model => {
                    model.selected = false;
                    if (bounds.contains(model.getBounds())) {
                        model.selected = true;
                    }
                });
                canvas?.render(rootModel.value);
            }
        }

        selectionStart.value = null;
        selectionEnd.value = null;
    });

    // Remove mouseout handler since we're using document events
    lmap.off('mouseout');

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

// Update handleDrop to add models to the root model
const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    if (!canvas || !lmap) return;

    const componentType = event.dataTransfer?.getData('componentType');
    const componentDefaults = JSON.parse(event.dataTransfer?.getData('componentDefaults') || '{}');

    if (!componentType) return;

    const modelGenerator = registry.get(componentType);
    if (!modelGenerator) return;

    const containerRect = mapRef.value!.getBoundingClientRect();
    const x = event.clientX - containerRect.left;
    const y = event.clientY - containerRect.top;
    const point = lmap.containerPointToLatLng([x, y]);

    const model = modelGenerator({
        type: componentType,
        offset: { x: point.lng, y: point.lat, z: 0 },
        ...defaultStyle,
        ...componentDefaults
    });

    // Add the new model as a submodel of the root model
    rootModel.value.addSubmodel(model);
    canvas.render(rootModel.value);
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
  'update:mode': [value: 'pan' | 'select'],
  'selection-change': [drawable?: Drawable]
}>();

watch(() => props.showGrid, (newValue: boolean) => {
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
          position: 'absolute',  // Change to absolute positioning
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
    background-color: var(--qui-overlay-primary);
    pointer-events: none;
    z-index: 10000;
}

/* Ensure Leaflet panes don't block selection box */
:deep(.leaflet-pane) {
    z-index: 400;
}
</style>