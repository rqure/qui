<template>
  <div class="faceplate-builder-app">
    <!-- Top toolbar -->
    <div class="top-toolbar">
      <div class="toolbar-section">
        <h2 class="app-title">Faceplate Builder</h2>
      </div>
      
      <div class="toolbar-section toolbar-actions">
        <!-- File actions -->
        <button @click="createNew" class="btn btn-secondary" title="New Faceplate">
          <span class="icon">📄</span> New
        </button>
        <button @click="loadFaceplate" class="btn btn-secondary" title="Load Existing">
          <span class="icon">📂</span> Load
        </button>
        <button @click="saveFaceplate" :disabled="!hasChanges" class="btn btn-primary" title="Save">
          <span class="icon">💾</span> Save
        </button>
        
        <div class="separator"></div>
        
        <!-- View controls -->
        <button @click="zoomIn" class="btn btn-secondary" title="Zoom In">
          <span class="icon">🔍+</span>
        </button>
        <button @click="zoomOut" class="btn btn-secondary" title="Zoom Out">
          <span class="icon">🔍-</span>
        </button>
        <button @click="resetZoom" class="btn btn-secondary" title="Reset Zoom">
          <span class="icon">⊡</span>
        </button>
        
        <div class="separator"></div>
        
        <!-- Grid/snap controls -->
        <label class="checkbox-label">
          <input type="checkbox" v-model="showGrid" />
          Grid
        </label>
        <label class="checkbox-label">
          <input type="checkbox" v-model="snapToGrid" :disabled="!showGrid" />
          Snap
        </label>
        
        <div class="separator"></div>
        
        <!-- Canvas config -->
        <button @click="showCanvasConfig = !showCanvasConfig" class="btn btn-secondary" title="Canvas Settings">
          <span class="icon">⚙️</span> Canvas
        </button>
      </div>
    </div>
    
    <!-- Canvas Configuration Panel -->
    <div v-if="showCanvasConfig" class="canvas-config-panel">
      <div class="config-group">
        <label>Width:</label>
        <input type="number" v-model.number="canvasWidth" @change="updateCanvasSize" min="100" max="4000" step="50" />
      </div>
      <div class="config-group">
        <label>Height:</label>
        <input type="number" v-model.number="canvasHeight" @change="updateCanvasSize" min="100" max="4000" step="50" />
      </div>
      <div class="config-group">
        <label>Background:</label>
        <input type="color" v-model="canvasBackground" @change="updateCanvasBackground" />
      </div>
    </div>
    
    <!-- Main content area -->
    <div class="main-content">
      <!-- Left sidebar - Tabs for Shapes and Layers -->
      <div class="sidebar sidebar-left">
        <div class="sidebar-tabs">
          <button 
            class="tab-button" 
            :class="{ active: activeTab === 'shapes' }"
            @click="activeTab = 'shapes'"
          >
            <span class="tab-icon">📐</span>
            Shapes
          </button>
          <button 
            class="tab-button" 
            :class="{ active: activeTab === 'layers' }"
            @click="activeTab = 'layers'"
          >
            <span class="tab-icon">📋</span>
            Layers
          </button>
        </div>
        
        <div class="tab-content">
          <ShapePalette 
            v-if="activeTab === 'shapes'"
            @shape-drag-start="onShapeDragStart" 
          />
          <LayerPanel 
            v-if="activeTab === 'layers'"
            :model="currentModel"
            :selected-index="selectedShapeIndex"
            @shape-select="onShapeSelect"
            @shape-update="onShapeUpdate"
          />
        </div>
      </div>
      
      <!-- Center - Canvas -->
      <div class="canvas-area">
        <CanvasEditor
          ref="canvasEditor"
          :model="currentModel"
          :selected-shape-index="selectedShapeIndex"
          :show-grid="showGrid"
          :snap-to-grid="snapToGrid"
          :canvas-width="canvasWidth"
          :canvas-height="canvasHeight"
          :canvas-background="canvasBackground"
          :update-trigger="shapeUpdateTrigger"
          @shape-select="onShapeSelect"
          @shape-update="onShapeUpdate"
          @shape-drop="onShapeDrop"
          @canvas-click="onCanvasClick"
        />
      </div>
      
      <!-- Right sidebar - Properties -->
      <div class="sidebar sidebar-right">
        <PropertiesPanel
          :selected-shape="selectedShape"
          :selected-index="selectedShapeIndex"
          :update-trigger="shapeUpdateTrigger"
          @update-property="onPropertyUpdate"
          @delete-shape="onDeleteShape"
        />
      </div>
    </div>
    
    <!-- Modals -->
    <LoadFaceplateModal
      v-if="showLoadModal"
      @close="showLoadModal = false"
      @load="onLoadFaceplate"
    />
    
    <SaveFaceplateModal
      v-if="showSaveModal"
      :current-config="currentConfig"
      @close="showSaveModal = false"
      @save="onSaveFaceplate"
    />

    <DeleteConfirmationModal
      v-if="showDeleteModal"
      @confirm="confirmDeleteShape"
      @cancel="showDeleteModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Model } from '@/core/canvas/model';
import type { Drawable } from '@/core/canvas/shapes/base';
import type { FaceplateConfig, FaceplateShapeConfig, FaceplateModelConfig } from './types';
import { createShape } from '@/core/canvas/shapes';
import ShapePalette from './components/ShapePalette.vue';
import CanvasEditor from './components/CanvasEditor.vue';
import PropertiesPanel from './components/PropertiesPanel.vue';
import LayerPanel from './components/LayerPanel.vue';
import LoadFaceplateModal from './components/LoadFaceplateModal.vue';
import SaveFaceplateModal from './components/SaveFaceplateModal.vue';
import DeleteConfirmationModal from './components/DeleteConfirmationModal.vue';

// State
const currentModel = ref<Model>(new Model());
const selectedShapeIndex = ref<number | null>(null);
const hasChanges = ref(false);
const showLoadModal = ref(false);
const showSaveModal = ref(false);
const showDeleteModal = ref(false);
const shapeUpdateTrigger = ref(0);
const activeTab = ref<'shapes' | 'layers'>('shapes');

// View controls
const showGrid = ref(true);
const snapToGrid = ref(true);

// Canvas configuration
const showCanvasConfig = ref(false);
const canvasWidth = ref(1000);
const canvasHeight = ref(600);
const canvasBackground = ref('#1a1a1a');

// Canvas ref
const canvasEditor = ref<InstanceType<typeof CanvasEditor> | null>(null);

// Computed
const selectedShape = computed((): Drawable | null => {
  if (selectedShapeIndex.value === null) return null;
  return currentModel.value.getShape(selectedShapeIndex.value) || null;
});

const currentConfig = computed((): FaceplateConfig => {
  return {
    targetEntityType: 'Object', // Default, can be edited in save modal
    model: modelToConfig(currentModel.value as any)
  };
});

// File actions
function createNew() {
  if (hasChanges.value) {
    const confirmed = confirm('You have unsaved changes. Create new faceplate?');
    if (!confirmed) return;
  }
  
  currentModel.value = new Model();
  selectedShapeIndex.value = null;
  hasChanges.value = false;
}

function loadFaceplate() {
  if (hasChanges.value) {
    const confirmed = confirm('You have unsaved changes. Load faceplate?');
    if (!confirmed) return;
  }
  
  showLoadModal.value = true;
}

function saveFaceplate() {
  showSaveModal.value = true;
}

async function onLoadFaceplate(config: FaceplateConfig) {
  try {
    currentModel.value = configToModel(config.model);
    selectedShapeIndex.value = null;
    hasChanges.value = false;
    showLoadModal.value = false;
  } catch (error) {
    console.error('Failed to load faceplate:', error);
    alert('Failed to load faceplate: ' + error);
  }
}

async function onSaveFaceplate(entityId: number, name: string, targetType: string) {
  try {
    // Save logic will be implemented in SaveFaceplateModal
    hasChanges.value = false;
    showSaveModal.value = false;
  } catch (error) {
    console.error('Failed to save faceplate:', error);
    alert('Failed to save faceplate: ' + error);
  }
}

// View controls
function zoomIn() {
  canvasEditor.value?.zoomIn();
}

function zoomOut() {
  canvasEditor.value?.zoomOut();
}

function resetZoom() {
  canvasEditor.value?.resetZoom();
}

// Shape operations
function onShapeDragStart(shapeType: string) {
  // Handled by CanvasEditor
}

function onShapeSelect(index: number) {
  selectedShapeIndex.value = index;
}

function onShapeUpdate() {
  hasChanges.value = true;
  shapeUpdateTrigger.value++;
}

function onShapeDrop(shapeType: string, location: { x: number; y: number }) {
  // Create new shape and add to model
  const shape = createDefaultShape(shapeType, location);
  if (shape) {
    currentModel.value.addShape(shape);
    selectedShapeIndex.value = currentModel.value.getShapes().length - 1;
    hasChanges.value = true;
    shapeUpdateTrigger.value++;
  }
}

function onCanvasClick() {
  // Deselect when clicking empty canvas
  selectedShapeIndex.value = null;
}

function onPropertyUpdate(property: string, value: any) {
  if (selectedShape.value) {
    // Apply property update to shape
    applyPropertyToShape(selectedShape.value, property, value);
    hasChanges.value = true;
    
    // Force canvas re-render
    canvasEditor.value?.renderModel();
    
    // Trigger UI updates
    shapeUpdateTrigger.value++;
  }
}

function onDeleteShape() {
  showDeleteModal.value = true;
}

function confirmDeleteShape() {
  if (selectedShapeIndex.value !== null) {
    const shapes = currentModel.value.getShapes();
    const shapeToDelete = shapes[selectedShapeIndex.value];
    
    // Properly destroy the shape to clean up Leaflet layers
    if (shapeToDelete) {
      shapeToDelete.destroy();
    }
    
    shapes.splice(selectedShapeIndex.value, 1);
    selectedShapeIndex.value = null;
    hasChanges.value = true;
    
    // Trigger canvas re-render
    canvasEditor.value?.renderModel();
    shapeUpdateTrigger.value++;
  }
  showDeleteModal.value = false;
}

// Canvas configuration methods
function updateCanvasSize() {
  if (canvasEditor.value) {
    const editor = canvasEditor.value as any;
    if (editor.updateBoundary) {
      editor.updateBoundary({ x: 0, y: 0 }, { x: canvasWidth.value, y: canvasHeight.value });
    }
  }
  hasChanges.value = true;
}

function updateCanvasBackground() {
  if (canvasEditor.value) {
    const editor = canvasEditor.value as any;
    if (editor.updateBackground) {
      editor.updateBackground(canvasBackground.value);
    }
  }
  hasChanges.value = true;
}

// Helper functions
function createDefaultShape(shapeType: string, location: { x: number; y: number }): Drawable | null {
  const shape = createShape(shapeType);
  
  if (!shape) return null;
  
  shape.setOffset(location);
  shape.setPivot({ x: 0, y: 0 });
  shape.setScale({ x: 1, y: 1 }); // Ensure scale is 1 for direct property manipulation
  
  // Set default properties based on type
  if (shapeType === 'Circle') {
    (shape as any).setRadius(50);
    (shape as any).setFillColor('#00ff88');
    (shape as any).setFillOpacity(0.5);
  } else if (shapeType === 'Polygon') {
    (shape as any).setEdges([
      { x: -40, y: -40 },
      { x: 40, y: -40 },
      { x: 0, y: 40 }
    ]);
    (shape as any).setFillColor('#0088ff');
    (shape as any).setFillOpacity(0.5);
  } else if (shapeType === 'Polyline') {
    (shape as any).setEdges([
      { x: -50, y: 0 },
      { x: 0, y: -30 },
      { x: 50, y: 0 }
    ]);
    (shape as any).setColor('#ff0088');
    (shape as any).setWeight(3);
  } else if (shapeType === 'Text') {
    (shape as any).setText('Text');
    (shape as any).setFontSize(16);
    (shape as any).setColor('#ffffff');
  } else if (shapeType === 'SvgText') {
    (shape as any).setText('SVG Text');
    (shape as any).setFontSize('1em');
    (shape as any).setWidth(100);
    (shape as any).setHeight(20);
    (shape as any).setFillColor('#000000');
  } else if (shapeType === 'Div') {
    (shape as any).setHtml('<div>Hello World</div>');
    (shape as any).setClassName('');
    (shape as any).setWidth(100);
    (shape as any).setHeight(100);
  } else if (shapeType === 'ImageOverlay') {
    (shape as any).setUrl('');
    (shape as any).setWidth(100);
    (shape as any).setHeight(100);
  }
  
  return shape;
}

function applyPropertyToShape(shape: Drawable, property: string, value: any) {
  const shapeAny = shape as any;
  
  if (property === 'x' || property === 'y' || property === 'z') {
    const offset = shape.getOffset();
    if (property === 'x') {
      shape.setOffset({ ...offset, x: value });
    } else if (property === 'y') {
      shape.setOffset({ ...offset, y: value });
    } else if (property === 'z') {
      shape.setOffset({ ...offset, z: value });
    }
  } else if (property === 'rotation') {
    shape.setRotation(value);
  } else if (property === 'scaleX' || property === 'scaleY' || property === 'scaleZ') {
    const scale = shape.getScale();
    if (property === 'scaleX') {
      shape.setScale({ ...scale, x: value });
    } else if (property === 'scaleY') {
      shape.setScale({ ...scale, y: value });
    } else if (property === 'scaleZ') {
      shape.setScale({ ...scale, z: value });
    }
  } else if (property === 'pivotX' || property === 'pivotY' || property === 'pivotZ') {
    const pivot = shape.getPivot();
    if (property === 'pivotX') {
      shape.setPivot({ ...pivot, x: value });
    } else if (property === 'pivotY') {
      shape.setPivot({ ...pivot, y: value });
    } else if (property === 'pivotZ') {
      shape.setPivot({ ...pivot, z: value });
    }
  } else if (property === 'minZoom') {
    shape.setMinZoom(value);
  } else if (property === 'maxZoom') {
    shape.setMaxZoom(value);
  } else if (property === 'paneName' || property === 'paneLevel') {
    const pane = shape.getPane() || { name: '', level: 0 };
    if (property === 'paneName') {
      shape.setPane({ ...pane, name: value });
    } else if (property === 'paneLevel') {
      shape.setPane({ ...pane, level: value });
    }
  } else if (property === 'radius' && shapeAny.setRadius) {
    shapeAny.setRadius(value);
  } else if (property === 'color' && shapeAny.setColor) {
    shapeAny.setColor(value);
  } else if (property === 'weight' && shapeAny.setWeight) {
    shapeAny.setWeight(value);
  } else if (property === 'fillColor' && shapeAny.setFillColor) {
    shapeAny.setFillColor(value);
  } else if (property === 'fillOpacity' && shapeAny.setFillOpacity) {
    shapeAny.setFillOpacity(value);
  } else if (property === 'opacity' && shapeAny.setOpacity) {
    shapeAny.setOpacity(value);
  } else if (property === 'edges' && shapeAny.setEdges) {
    shapeAny.setEdges(value);
  } else if (property === 'text' && shapeAny.setText) {
    shapeAny.setText(value);
  } else if (property === 'fontSize' && shapeAny.setFontSize) {
    shapeAny.setFontSize(value);
  } else if (property === 'direction' && shapeAny.setDirection) {
    shapeAny.setDirection(value);
  } else if (property === 'className' && shapeAny.setClassName) {
    shapeAny.setClassName(value);
  } else if (property === 'html' && shapeAny.setHtml) {
    shapeAny.setHtml(value);
  } else if (property === 'width' && shapeAny.setWidth) {
    shapeAny.setWidth(value);
  } else if (property === 'height' && shapeAny.setHeight) {
    shapeAny.setHeight(value);
  } else if (property === 'url' && shapeAny.setUrl) {
    shapeAny.setUrl(value);
  } else if (property === 'css' && shapeAny.setCss) {
    shapeAny.setCss(value);
  } else if (property === 'keyframes' && shapeAny.setKeyframes) {
    shapeAny.setKeyframes(value);
  }
}

function modelToConfig(model: Model): FaceplateModelConfig {
  const shapes = model.getShapes();
  return {
    type: 'Model',
    boundary: {
      from: { x: 0, y: 0 },
      to: { x: 1000, y: 600 }
    },
    shapes: shapes.map(shapeToConfig)
  };
}

function shapeToConfig(shape: Drawable): FaceplateShapeConfig {
  const config: FaceplateShapeConfig = {
    type: shape.constructor.name,
    location: shape.getOffset(),
    rotation: shape.getRotation(),
    scale: shape.getScale(),
    pivot: shape.getPivot()
  };
  
  // Add optional properties only if they have values
  const minZoom = shape.getMinZoom();
  if (minZoom !== null) config.minZoom = minZoom;
  
  const maxZoom = shape.getMaxZoom();
  if (maxZoom !== null) config.maxZoom = maxZoom;
  
  const pane = shape.getPane();
  if (pane) config.pane = pane;
  
  const shapeAny = shape as any;
  
  // Add shape-specific properties
  if (shapeAny.getRadius) config.radius = shapeAny.getRadius();
  if (shapeAny.getColor) config.color = shapeAny.getColor();
  if (shapeAny.getFillColor) config.fillColor = shapeAny.getFillColor();
  if (shapeAny.getFillOpacity) config.fillOpacity = shapeAny.getFillOpacity();
  if (shapeAny.getWeight) config.weight = shapeAny.getWeight();
  if (shapeAny.getOpacity) config.opacity = shapeAny.getOpacity();
  if (shapeAny.getText) config.text = shapeAny.getText();
  if (shapeAny.getFontSize) config.fontSize = shapeAny.getFontSize();
  if (shapeAny.getDirection) config.direction = shapeAny.getDirection();
  if (shapeAny.getEdges) config.edges = shapeAny.getEdges();
  if (shapeAny.getHtml) config.html = shapeAny.getHtml();
  if (shapeAny.getClassName) config.className = shapeAny.getClassName();
  if (shapeAny.getWidth) config.width = shapeAny.getWidth();
  if (shapeAny.getHeight) config.height = shapeAny.getHeight();
  if (shapeAny.getUrl) config.url = shapeAny.getUrl();
  if (shapeAny.getCss) config.css = shapeAny.getCss();
  if (shapeAny.getKeyframes) config.keyframes = shapeAny.getKeyframes();
  
  return config;
}

function configToModel(config: any): Model {
  const model = new Model();
  
  if (config.shapes) {
    for (const shapeConfig of config.shapes) {
      const shape = createShape(shapeConfig.type);
      if (shape) {
        // Apply config properties
        if (shapeConfig.location) shape.setOffset(shapeConfig.location);
        shape.setPivot(shapeConfig.pivot || { x: 0, y: 0 });
        shape.setScale(shapeConfig.scale || { x: 1, y: 1 });
        if (shapeConfig.rotation !== undefined) shape.setRotation(shapeConfig.rotation);
        if (shapeConfig.minZoom !== undefined) shape.setMinZoom(shapeConfig.minZoom);
        if (shapeConfig.maxZoom !== undefined) shape.setMaxZoom(shapeConfig.maxZoom);
        if (shapeConfig.pane) shape.setPane(shapeConfig.pane);
        
        const shapeAny = shape as any;
        if (shapeConfig.radius !== undefined && shapeAny.setRadius) {
          shapeAny.setRadius(shapeConfig.radius);
        }
        if (shapeConfig.fillColor && shapeAny.setFillColor) {
          shapeAny.setFillColor(shapeConfig.fillColor);
        }
        if (shapeConfig.fillOpacity !== undefined && shapeAny.setFillOpacity) {
          shapeAny.setFillOpacity(shapeConfig.fillOpacity);
        }
        if (shapeConfig.color && shapeAny.setColor) {
          shapeAny.setColor(shapeConfig.color);
        }
        if (shapeConfig.weight !== undefined && shapeAny.setWeight) {
          shapeAny.setWeight(shapeConfig.weight);
        }
        if (shapeConfig.opacity !== undefined && shapeAny.setOpacity) {
          shapeAny.setOpacity(shapeConfig.opacity);
        }
        if (shapeConfig.text && shapeAny.setText) {
          shapeAny.setText(shapeConfig.text);
        }
        if (shapeConfig.fontSize !== undefined && shapeAny.setFontSize) {
          shapeAny.setFontSize(shapeConfig.fontSize);
        }
        if (shapeConfig.direction && shapeAny.setDirection) {
          shapeAny.setDirection(shapeConfig.direction);
        }
        if (shapeConfig.edges && shapeAny.setEdges) {
          shapeAny.setEdges(shapeConfig.edges);
        }
        if (shapeConfig.html && shapeAny.setHtml) {
          shapeAny.setHtml(shapeConfig.html);
        }
        if (shapeConfig.className && shapeAny.setClassName) {
          shapeAny.setClassName(shapeConfig.className);
        }
        if (shapeConfig.width !== undefined && shapeAny.setWidth) {
          shapeAny.setWidth(shapeConfig.width);
        }
        if (shapeConfig.height !== undefined && shapeAny.setHeight) {
          shapeAny.setHeight(shapeConfig.height);
        }
        if (shapeConfig.url && shapeAny.setUrl) {
          shapeAny.setUrl(shapeConfig.url);
        }
        if (shapeConfig.css && shapeAny.setCss) {
          shapeAny.setCss(shapeConfig.css);
        }
        if (shapeConfig.keyframes && shapeAny.setKeyframes) {
          shapeAny.setKeyframes(shapeConfig.keyframes);
        }
        
        model.addShape(shape);
      }
    }
  }
  
  return model;
}

// Watch for changes
watch(() => currentModel.value.getShapes().length, () => {
  // Model changed
});
</script>

<style scoped>
.faceplate-builder-app {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--qui-color-background);
}

.top-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: var(--qui-titlebar-bg, #1e1e1e);
  border-bottom: 1px solid var(--qui-titlebar-border, rgba(255, 255, 255, 0.1));
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
  gap: 16px;
  min-height: 60px;
  flex-shrink: 0;
}

.toolbar-section {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-actions {
  flex: 1;
  justify-content: flex-end;
}

.app-title {
  margin: 0;
  font-size: var(--qui-font-size-large, 16px);
  font-weight: var(--qui-font-weight-bold, 600);
  color: var(--qui-text-primary, #fff);
  letter-spacing: -0.02em;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: var(--qui-font-size-base, 14px);
  font-weight: var(--qui-font-weight-medium, 500);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
  position: relative;
  overflow: hidden;
}

.btn::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  transform: translate(-50%, -50%);
  transition: width 0.4s, height 0.4s;
}

.btn:active::before {
  width: 200px;
  height: 200px;
}

.btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
  filter: grayscale(0.5);
}

.btn-primary {
  background: var(--qui-accent-color, #00ff88);
  color: var(--qui-bg-primary, #000);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2), 
              inset 0 1px 0 rgba(255, 255, 255, 0.2);
  font-weight: var(--qui-font-weight-bold, 600);
}

.btn-primary:hover:not(:disabled) {
  background: color-mix(in srgb, var(--qui-accent-color, #00ff88) 110%, white);
  box-shadow: 0 4px 12px rgba(0, 255, 136, 0.3), 
              inset 0 1px 0 rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

.btn-primary:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2), 
              inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.btn-secondary {
  background: var(--qui-bg-secondary, #2a2a2a);
  color: var(--qui-text-primary, #fff);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3), 
              inset 0 0 0 1px rgba(255, 255, 255, 0.1);
}

.btn-secondary:hover:not(:disabled) {
  background: color-mix(in srgb, var(--qui-bg-secondary, #2a2a2a) 90%, white);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4), 
              inset 0 0 0 1px rgba(255, 255, 255, 0.15);
  transform: translateY(-1px);
}

.btn-secondary:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3), 
              inset 0 0 0 1px rgba(255, 255, 255, 0.05);
}

.icon {
  font-size: 15px;
  line-height: 1;
  opacity: 0.9;
}

.separator {
  width: 1px;
  height: 28px;
  background: rgba(255, 255, 255, 0.15);
  margin: 0 8px;
  flex-shrink: 0;
}

.checkbox-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: var(--qui-font-size-small, 13px);
  color: var(--qui-text-primary, #fff);
  cursor: pointer;
  user-select: none;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background 0.15s ease;
}

.checkbox-label:hover {
  background: rgba(255, 255, 255, 0.05);
}

.checkbox-label input[type="checkbox"] {
  cursor: pointer;
  width: 16px;
  height: 16px;
  accent-color: var(--qui-accent-color, #00ff88);
}

.checkbox-label input[type="checkbox"]:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.canvas-config-panel {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 12px 20px;
  background: var(--qui-bg-secondary, #2a2a2a);
  border-bottom: 1px solid var(--qui-titlebar-border, rgba(255, 255, 255, 0.1));
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.2);
  flex-shrink: 0;
}

.config-group {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: var(--qui-font-size-small, 13px);
  color: var(--qui-text-primary, #fff);
}

.config-group label {
  font-weight: var(--qui-font-weight-medium, 500);
  min-width: 70px;
  color: var(--qui-text-secondary, #aaa);
}

.config-group input[type="number"] {
  width: 100px;
  padding: 7px 12px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  background: var(--qui-bg-primary, #1a1a1a);
  color: var(--qui-text-primary, #fff);
  font-size: var(--qui-font-size-small, 13px);
  transition: all 0.15s ease;
}

.config-group input[type="number"]:focus {
  outline: none;
  border-color: var(--qui-accent-color, #00ff88);
  box-shadow: 0 0 0 2px rgba(0, 255, 136, 0.2);
}

.config-group input[type="color"] {
  width: 60px;
  height: 32px;
  padding: 3px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  background: var(--qui-bg-primary, #1a1a1a);
  cursor: pointer;
  transition: all 0.15s ease;
}

.config-group input[type="color"]:hover {
  border-color: var(--qui-accent-color, #00ff88);
}

.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.sidebar {
  width: 300px;
  background: var(--qui-bg-secondary, #2a2a2a);
  border-right: 1px solid var(--qui-window-border, rgba(255, 255, 255, 0.1));
  overflow-y: auto;
  overflow-x: hidden;
  flex-shrink: 0;
  box-shadow: inset -1px 0 3px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
}

.sidebar-tabs {
  display: flex;
  border-bottom: 1px solid var(--qui-window-border, rgba(255, 255, 255, 0.1));
  background: var(--qui-bg-primary, #1a1a1a);
  flex-shrink: 0;
}

.tab-button {
  flex: 1;
  padding: 12px 16px;
  border: none;
  background: transparent;
  color: var(--qui-text-secondary, #aaa);
  font-size: var(--qui-font-size-small, 13px);
  font-weight: var(--qui-font-weight-medium, 500);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.15s ease;
  position: relative;
}

.tab-button::before {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--qui-accent-color, #00ff88);
  transform: scaleX(0);
  transition: transform 0.2s ease;
}

.tab-button:hover {
  background: rgba(255, 255, 255, 0.05);
  color: var(--qui-text-primary, #fff);
}

.tab-button.active {
  color: var(--qui-accent-color, #00ff88);
  background: rgba(0, 255, 136, 0.1);
}

.tab-button.active::before {
  transform: scaleX(1);
}

.tab-icon {
  font-size: 14px;
  line-height: 1;
}

.tab-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.tab-content::-webkit-scrollbar {
  width: 8px;
}

.tab-content::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
}

.tab-content::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
}

.tab-content::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

.sidebar::-webkit-scrollbar {
  width: 8px;
}

.sidebar::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
}

.sidebar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
}

.sidebar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

.sidebar-right {
  border-right: none;
  border-left: 1px solid var(--qui-window-border, rgba(255, 255, 255, 0.1));
  box-shadow: inset 1px 0 3px rgba(0, 0, 0, 0.1);
}

.canvas-area {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: #0a0a0a;
}
</style>
