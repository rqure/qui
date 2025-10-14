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
      </div>
    </div>
    
    <!-- Main content area -->
    <div class="main-content">
      <!-- Left sidebar - Shape palette -->
      <div class="sidebar sidebar-left">
        <ShapePalette @shape-drag-start="onShapeDragStart" />
      </div>
      
      <!-- Center - Canvas -->
      <div class="canvas-area">
        <CanvasEditor
          ref="canvasEditor"
          :model="currentModel"
          :selected-shape-index="selectedShapeIndex"
          :show-grid="showGrid"
          :snap-to-grid="snapToGrid"
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
import LoadFaceplateModal from './components/LoadFaceplateModal.vue';
import SaveFaceplateModal from './components/SaveFaceplateModal.vue';

// State
const currentModel = ref<Model>(new Model());
const selectedShapeIndex = ref<number | null>(null);
const hasChanges = ref(false);
const showLoadModal = ref(false);
const showSaveModal = ref(false);

// View controls
const showGrid = ref(true);
const snapToGrid = ref(true);

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
}

function onShapeDrop(shapeType: string, location: { x: number; y: number }) {
  // Create new shape and add to model
  const shape = createDefaultShape(shapeType, location);
  if (shape) {
    currentModel.value.addShape(shape);
    selectedShapeIndex.value = currentModel.value.getShapes().length - 1;
    hasChanges.value = true;
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
  }
}

function onDeleteShape() {
  if (selectedShapeIndex.value !== null) {
    const shapes = currentModel.value.getShapes();
    shapes.splice(selectedShapeIndex.value, 1);
    selectedShapeIndex.value = null;
    hasChanges.value = true;
  }
}

// Helper functions
function createDefaultShape(shapeType: string, location: { x: number; y: number }): Drawable | null {
  const shape = createShape(shapeType);
  
  if (!shape) return null;
  
  shape.setLocation(location);
  
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
  }
  
  return shape;
}

function applyPropertyToShape(shape: Drawable, property: string, value: any) {
  const shapeAny = shape as any;
  
  if (property === 'x' || property === 'y') {
    const loc = shape.getLocation();
    if (property === 'x') {
      shape.setLocation({ ...loc, x: value });
    } else {
      shape.setLocation({ ...loc, y: value });
    }
  } else if (property === 'rotation') {
    shape.setRotation(value);
  } else if (property === 'radius' && shapeAny.setRadius) {
    shapeAny.setRadius(value);
  } else if (property === 'fillColor' && shapeAny.setFillColor) {
    shapeAny.setFillColor(value);
  } else if (property === 'fillOpacity' && shapeAny.setFillOpacity) {
    shapeAny.setFillOpacity(value);
  } else if (property === 'color' && shapeAny.setColor) {
    shapeAny.setColor(value);
  } else if (property === 'weight' && shapeAny.setWeight) {
    shapeAny.setWeight(value);
  } else if (property === 'text' && shapeAny.setText) {
    shapeAny.setText(value);
  } else if (property === 'fontSize' && shapeAny.setFontSize) {
    shapeAny.setFontSize(value);
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
    location: shape.getLocation(),
    rotation: shape.getRotation()
  };
  
  const shapeAny = shape as any;
  
  // Add shape-specific properties
  if (shapeAny.getRadius) config.radius = shapeAny.getRadius();
  if (shapeAny.getColor) config.color = shapeAny.getColor();
  if (shapeAny.getFillColor) config.fillColor = shapeAny.getFillColor();
  if (shapeAny.getFillOpacity) config.fillOpacity = shapeAny.getFillOpacity();
  if (shapeAny.getWeight) config.weight = shapeAny.getWeight();
  if (shapeAny.getText) config.text = shapeAny.getText();
  if (shapeAny.getFontSize) config.fontSize = shapeAny.getFontSize();
  if (shapeAny.getEdges) config.edges = shapeAny.getEdges();
  
  return config;
}

function configToModel(config: any): Model {
  const model = new Model();
  
  if (config.shapes) {
    for (const shapeConfig of config.shapes) {
      const shape = createShape(shapeConfig.type);
      if (shape) {
        // Apply config properties
        if (shapeConfig.location) shape.setLocation(shapeConfig.location);
        if (shapeConfig.rotation !== undefined) shape.setRotation(shapeConfig.rotation);
        
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
        if (shapeConfig.text && shapeAny.setText) {
          shapeAny.setText(shapeConfig.text);
        }
        if (shapeConfig.fontSize !== undefined && shapeAny.setFontSize) {
          shapeAny.setFontSize(shapeConfig.fontSize);
        }
        if (shapeConfig.edges && shapeAny.setEdges) {
          shapeAny.setEdges(shapeConfig.edges);
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
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--qui-color-background-secondary);
  border-bottom: 1px solid var(--qui-color-border);
  gap: 16px;
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
  font-size: 16px;
  font-weight: 600;
  color: var(--qui-color-text);
}

.btn {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: background 0.2s;
  white-space: nowrap;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--qui-color-primary);
  color: var(--qui-color-text-on-primary);
}

.btn-primary:hover:not(:disabled) {
  background: var(--qui-color-primary-hover);
}

.btn-secondary {
  background: var(--qui-color-background);
  color: var(--qui-color-text);
  border: 1px solid var(--qui-color-border);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--qui-color-background-hover);
}

.icon {
  font-size: 14px;
}

.separator {
  width: 1px;
  height: 24px;
  background: var(--qui-color-border);
  margin: 0 4px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  color: var(--qui-color-text);
  cursor: pointer;
  user-select: none;
}

.checkbox-label input[type="checkbox"] {
  cursor: pointer;
}

.checkbox-label input[type="checkbox"]:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.sidebar {
  width: 280px;
  background: var(--qui-color-background-secondary);
  border-right: 1px solid var(--qui-color-border);
  overflow-y: auto;
  flex-shrink: 0;
}

.sidebar-right {
  border-right: none;
  border-left: 1px solid var(--qui-color-border);
}

.canvas-area {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: #0a0a0a;
}
</style>
