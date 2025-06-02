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
import type { Drawable, Handle } from '@/core/utils/drawing/drawable';
import CanvasInfo from './CanvasInfo.vue';
import { createGridLayer } from '../utils/CustomGridLayer';
import { Model } from '@/core/utils/drawing/model';

enum CanvasState {
  IDLE,
  SELECTING,
  RESIZING,
  MOVING
}

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

// Use state machine approach instead of multiple flags
const canvasState = ref<CanvasState>(CanvasState.IDLE);
const selectionStart = ref<{ x: number; y: number } | null>(null);
const selectionEnd = ref<{ x: number; y: number } | null>(null);
const activeHandle = ref<Handle | null>(null);  // Changed from ResizeOrMoveHandle to Handle
// Change to array of drawables for multi-selection
const activeDrawables = ref<Drawable[]>([]);
const lastMousePos = ref<Xyz | null>(null);

onMounted(() => {
    if (!mapRef.value) return;

    lmap = L.map(mapRef.value, {
        crs: L.CRS.Simple,
        zoomControl: false,
        attributionControl: false,
        preferCanvas: true,
        renderer: L.canvas(),
    });

    canvas = new QCanvas(lmap as L.Map);
    canvas.setBoundry(new Xyz(-1000, -1000), new Xyz(1000, 1000));
    canvas.moveTo(canvas.center);
    canvas.render(rootModel.value);

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

    // Update mousedown handler for selection, resize and move operations
    lmap.on('mousedown', (e: L.LeafletMouseEvent) => {
        // Ignore right mouse button clicks for selection
        if (e.originalEvent instanceof MouseEvent && e.originalEvent.button === 2) {
            return;
        }
        
        if (props.mode === 'select') {
            // Reset to idle state at start
            canvasState.value = CanvasState.IDLE;

            const rect = mapRef.value!.getBoundingClientRect();
            selectionStart.value = {
                x: e.originalEvent.clientX - rect.left,
                y: e.originalEvent.clientY - rect.top
            };
            selectionEnd.value = { ...selectionStart.value };

            // Check if we're clicking on a resize handle
            const target = e.originalEvent.target as HTMLElement;
            if (target && target.classList.contains('leaflet-interactive')) {
                // Find the nearest handle
                const latlng = e.latlng;
                const selectedDrawable = rootModel.value.submodels.find(m => m.selected);

                if (selectedDrawable) {
                    const handles = selectedDrawable.getResizeHandles();
                    const point = new Xyz(latlng.lng, latlng.lat);

                    // Find the closest handle
                    let minDistance = Infinity;
                    let closestHandle: Handle | null = null;

                    handles.forEach(handle => {
                        const distance = point.distanceTo(handle.position);
                        if (distance < minDistance) {
                            minDistance = distance;
                            closestHandle = handle;
                        }
                    });

                    if (closestHandle && minDistance < 10) {
                        // Reset selection points when starting resize/move
                        selectionStart.value = null;
                        selectionEnd.value = null;

                        const handleType = (closestHandle as Handle).handleType; // Access safely once

                        // Transition to appropriate state based on handle type
                        if (handleType === 'move') {
                            canvasState.value = CanvasState.MOVING;
                            // Get all selected drawables for multi-selection movement
                            activeDrawables.value = rootModel.value.submodels.filter(m => m.selected && m.isMovable);
                        } else {
                            // Handle is a resize handle
                            canvasState.value = CanvasState.RESIZING;
                            // Only the drawable with handles can be resized
                            if (selectedDrawable.isResizable) {
                                activeDrawables.value = [selectedDrawable];
                            }
                        }

                        activeHandle.value = closestHandle;
                        lastMousePos.value = new Xyz(latlng.lng, latlng.lat);
                        return;
                    }
                }
            }
            
            // Check if we clicked directly on a drawable (for moving without handles)
            const clickedModel = rootModel.value.submodels.find(m => m.contains(e.latlng));
            if (clickedModel) {
                // If the clicked model is already selected, or if Ctrl/Cmd key is pressed,
                // prepare for moving all selected models
                if (clickedModel.selected || (e.originalEvent && (e.originalEvent.ctrlKey || e.originalEvent.metaKey))) {
                    if (!clickedModel.selected) {
                        clickedModel.selected = true;
                    }
                    
                    canvasState.value = CanvasState.MOVING;
                    activeDrawables.value = rootModel.value.submodels.filter(m => m.selected);
                    lastMousePos.value = new Xyz(e.latlng.lng, e.latlng.lat);
                    selectionStart.value = null;
                    selectionEnd.value = null;
                    return;
                }
            }
        } else if (props.mode === 'pan') {
            mapRef.value!.style.cursor = 'grabbing';
        }
    });

    // Update mousemove for selection, resize and move operations
    document.addEventListener('mousemove', (e: MouseEvent) => {
        // Ignore right mouse button drags
        if (e.buttons === 2) {
            return;
        }
        
        if (!lmap || !mapRef.value) return;

        const rect = mapRef.value.getBoundingClientRect();
        const point = L.point(e.clientX - rect.left, e.clientY - rect.top);
        const latlng = lmap.containerPointToLatLng(point);
        mousePos.value = { x: latlng.lng, y: latlng.lat };

        // Handle different states
        switch (canvasState.value) {
            case CanvasState.RESIZING:
            case CanvasState.MOVING:
                if (activeDrawables.value.length > 0 && activeHandle.value && lastMousePos.value) {
                    // Calculate delta
                    const currentPos = new Xyz(latlng.lng, latlng.lat);
                    const delta = currentPos.minus(lastMousePos.value);

                    // Use polymorphic behavior via the apply method
                    if (canvasState.value === CanvasState.RESIZING) {
                        // For resize, only apply to the first drawable
                        activeHandle.value.apply(activeDrawables.value[0] as Drawable, delta);
                    } else {
                        // For moving, apply to all active drawables
                        activeDrawables.value.forEach(drawable => {
                            if (activeHandle.value) {
                                activeHandle.value.apply(drawable as Drawable, delta);
                            }
                        });
                    }

                    // Update last position
                    lastMousePos.value = currentPos;

                    // Redraw
                    canvas?.render(rootModel.value);
                }
                break;

            case CanvasState.IDLE:
                if (selectionStart.value && props.mode === 'select') {
                    selectionEnd.value = {
                        x: e.clientX - rect.left,
                        y: e.clientY - rect.top
                    };

                    // calculate distance from start to end
                    const distance = Math.sqrt(
                        Math.pow(selectionEnd.value.x - selectionStart.value.x, 2) +
                        Math.pow(selectionEnd.value.y - selectionStart.value.y, 2)
                    );
                    // If distance is more than 5 pixels, transition to selecting state
                    if (distance >= 5) {
                        canvasState.value = CanvasState.SELECTING;
                    }
                }
                break;

            case CanvasState.SELECTING:
                if (selectionStart.value && props.mode === 'select') {
                    selectionEnd.value = {
                        x: e.clientX - rect.left,
                        y: e.clientY - rect.top
                    };
                    
                    // Update mouse position for info display
                    const latlng = lmap.containerPointToLatLng(point);
                    mousePos.value = { x: latlng.lng, y: latlng.lat };
                }
                break;
        }
    });

    // Update mouseup handler to finalize operations based on state
    document.addEventListener('mouseup', (e: MouseEvent) => {
        switch (canvasState.value) {
            case CanvasState.RESIZING:
            case CanvasState.MOVING:
                // Update properties in the panel if needed
                if (activeDrawables.value.length === 1) {
                    emit('selection-change', activeDrawables.value[0] as Drawable);
                } else if (activeDrawables.value.length > 1) {
                    // Multiple items selected
                    emit('selection-change', undefined);
                }
                break;

            case CanvasState.SELECTING:
                if (selectionStart.value && selectionEnd.value && mapRef.value && lmap) {
                    const startPoint = lmap.containerPointToLatLng(
                        L.point(selectionStart.value.x, selectionStart.value.y)
                    );
                    const endPoint = lmap.containerPointToLatLng(
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

                    const selectedItems = rootModel.value.submodels.filter(m => m.selected);
                    if (selectedItems.length > 1) {
                        emit('selection-change', undefined);
                    } else if (selectedItems.length === 1) {
                        emit('selection-change', selectedItems[0] as Drawable);
                    } else {
                        emit('selection-change', undefined);
                    }
                }
                break;
            case CanvasState.IDLE:
                if (selectionStart.value && props.mode === 'select') {
                    // If neither Ctrl nor Shift are pressed, deselect everything first
                    if (!(e instanceof MouseEvent) || !(e.ctrlKey || e.shiftKey)) {
                        rootModel.value.submodels.forEach(model => {
                            model.selected = false;
                        });
                    }
                    
                    const endPoint = lmap!.containerPointToLatLng(
                        L.point(selectionEnd.value!.x, selectionEnd.value!.y)
                    );
                    const clickedModel = rootModel.value.submodels.find(m => m.contains(endPoint));
                    if (clickedModel) {
                        // Toggle selection if Ctrl/Cmd is pressed, otherwise select
                        if ((e instanceof MouseEvent) && (e.ctrlKey || e.metaKey)) {
                            clickedModel.selected = !clickedModel.selected;
                        } else {
                            clickedModel.selected = true;
                        }
                    }

                    canvas?.render(rootModel.value);
                    
                    // Emit the selected items
                    const selectedItems = rootModel.value.submodels.filter(m => m.selected);
                    if (selectedItems.length === 1) {
                        emit('selection-change', selectedItems[0] as Drawable);
                    } else {
                        emit('selection-change', undefined);
                    }
                    break;
                }
        }

        // Reset state machine to idle
        canvasState.value = CanvasState.IDLE;
        document.body.style.cursor = '';
        
        // Clear state data
        activeHandle.value = null;
        activeDrawables.value = [];
        lastMousePos.value = null;
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

    // Add event handlers for hover effects on shapes
    lmap.on('mouseover', (e: L.LeafletMouseEvent) => {
        if (!e.originalEvent.target) return;

        // Find the drawable that contains the point
        const hoveredModel = rootModel.value.submodels.find(model =>
            model.contains(e.latlng)
        );

        if (hoveredModel) {
            hoveredModel.isHovering = true;
            canvas?.render(rootModel.value);
            hoveredModel.onMouseOver.trigger();
        }
    });

    lmap.on('mouseout', (e: L.LeafletMouseEvent) => {
        rootModel.value.submodels.forEach(model => {
            if (model.isHovering) {
                model.isHovering = false;
                model.onMouseOut.trigger();
            }
        });
        canvas?.render(rootModel.value);
    });
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
    mode: 'pan' | 'select'
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
    <div class="canvas-container" @drop="handleDrop" @dragover="handleDragOver">
        <div class="canvas" ref="mapRef" 
             :class="{
                'resizing': canvasState === CanvasState.RESIZING,
                'moving': canvasState === CanvasState.MOVING
             }" 
             :style="{ 
                cursor: props.mode === 'pan' ? 'grab' : 'pointer'
             }">
            <!-- Only show selection box when in selecting state -->
            <div v-if="canvasState === CanvasState.SELECTING && selectionStart && selectionEnd" 
                 class="selection-box"
                 :style="{
                    position: 'absolute',
                    left: `${Math.min(selectionStart.x, selectionEnd.x)}px`,
                    top: `${Math.min(selectionStart.y, selectionEnd.y)}px`,
                    width: `${Math.abs(selectionEnd.x - selectionStart.x)}px`,
                    height: `${Math.abs(selectionEnd.y - selectionStart.y)}px`,
                 }"></div>
        </div>
        <CanvasInfo :zoom="zoomLevel" :mouse-x="mousePos.x" :mouse-y="mousePos.y" 
                    :canvas-width="canvasSize.width" :canvas-height="canvasSize.height" />
    </div>
</template>

<style>
.canvas-container {
    height: 100%;
    width: 100%;
    background-color: var(--qui-bg-primary);
    grid-area: canvas;
    position: relative;
    z-index: 0;
}

.canvas {
    height: 100%;
    width: 100%;
    position: relative;
    background-color: var(--qui-bg-secondary);
}

/* Style classes based on state machine values */
.canvas.resizing {
    cursor: crosshair !important;
}

.canvas.moving {
    cursor: move !important;
}

:deep(.leaflet-container) {
    height: 100%;
    width: 100%;
    background: var(--qui-bg-secondary);
    cursor: inherit !important;
}

:deep(.leaflet-interactive) {
    cursor: inherit !important;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
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
    border: 1px solid var(--qui-accent-color); /* Thin border for subtle appearance */
    background-color: rgba(33, 150, 243, 0.1); /* Subtle transparent background using hardcoded blue color */
    pointer-events: none;
    z-index: 10000;
}

/* Ensure Leaflet panes don't block selection box */
:deep(.leaflet-pane) {
    z-index: 400;
}

:deep(.resize-handle) {
    border: 1px solid white; /* Thin border */
    background-color: var(--qui-accent-color);
    opacity: 0.7; /* Slightly transparent */
    border-radius: 50%;
    box-shadow: 0 0 2px rgba(0, 0, 0, 0.2); /* Subtle shadow */
}

:deep(.move-handle) {
    border: 1px solid white; /* Thin border */
    background-color: var(--qui-accent-secondary);
    opacity: 0.7; /* Slightly transparent */
    border-radius: 50%;
}
</style>