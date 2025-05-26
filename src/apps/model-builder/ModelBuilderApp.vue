<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import { useMenuStore } from '@/stores/menu';
import { useWindowStore } from '@/stores/windows';
import ModelToolbox from './components/ModelToolbox.vue';
import ModelCanvas from './components/ModelCanvas.vue';
import ModelPropertyPanel from './components/ModelPropertyPanel.vue';
import ModelExplorer from './components/ModelExplorer.vue';
import LoadingIndicator from '@/components/common/LoadingIndicator.vue';

// Import model types and utilities
import { type ModelComponent, type ModelConfig, type UIModelEntity } from './types';
import { ModelManager } from './services/ModelManager';

// Store instances
const menuStore = useMenuStore();
const windowStore = useWindowStore();

// Application state
const loading = ref(true);
const error = ref<string | null>(null);
const activeModel = ref<UIModelEntity | null>(null);
const modelComponents = ref<ModelComponent[]>([]);
const selectedComponent = ref<ModelComponent | null>(null);
const panelWidth = ref(260); // Width of toolbox and property panels
const explorerHeight = ref(200); // Height of explorer panel
const modelManager = ref<ModelManager | null>(null);
const isResizingLeft = ref(false);
const isResizingRight = ref(false);
const isResizingBottom = ref(false);
const resizeStartX = ref(0);
const resizeStartY = ref(0);
const resizeStartWidth = ref(0);
const resizeStartHeight = ref(0);

// Constants for resizing panels
const MIN_PANEL_WIDTH = 200;
const MAX_PANEL_WIDTH = 400;
const MIN_EXPLORER_HEIGHT = 100;
const MAX_EXPLORER_HEIGHT = 400;

// Current zoom level for the canvas
const zoomLevel = ref(100); // percentage

// Component library categories
const componentCategories = ref([
  { id: 'basic', label: 'Basic' },
  { id: 'indicators', label: 'Indicators' },
  { id: 'controls', label: 'Controls' },
  { id: 'charts', label: 'Charts' },
  { id: 'containers', label: 'Containers' }
]);

// Track available models
const availableModels = ref<UIModelEntity[]>([]);

// Load available models
async function loadAvailableModels() {
  if (!modelManager.value) return;
  
  try {
    loading.value = true;
    error.value = null;
    availableModels.value = await modelManager.value.loadModels();
    loading.value = false;
  } catch (err) {
    console.error('Failed to load models:', err);
    error.value = 'Failed to load models';
    loading.value = false;
  }
}

// Initialize the application
onMounted(async () => {
  // Initialize model manager
  modelManager.value = new ModelManager();
  
  // Load available models
  await loadAvailableModels();

  // Add global event listeners for resizing
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);
});

onBeforeUnmount(() => {
  // Remove global event listeners
  window.removeEventListener('mousemove', handleMouseMove);
  window.removeEventListener('mouseup', handleMouseUp);
});

// Handle component selection
function handleComponentSelect(component: ModelComponent | null) {
  selectedComponent.value = component;
}

// Handle adding new component to the model
function handleAddComponent(componentType: string, x?: number, y?: number) {
  if (!modelManager.value) return;
  
  const opts = typeof x === 'number' && typeof y === 'number'
    ? { x, y }
    : undefined;
  
  const newComponent = modelManager.value.createComponent(componentType);
  if (!newComponent) {
    console.error(`Failed to create component of type: ${componentType}`);
    return;
  }

  newComponent.x = opts?.x || newComponent.x || 0;
  newComponent.y = opts?.y || newComponent.y || 0;
  modelComponents.value.push(newComponent);
  selectedComponent.value = newComponent;
}

// Open a model for editing
async function openModel(modelId: string) {
  if (!modelManager.value) return;
  
  try {
    loading.value = true;
    error.value = null;
    
    const model = await modelManager.value.loadModel(modelId);
    activeModel.value = model;
    modelComponents.value = model.components;
    
    loading.value = false;
  } catch (err) {
    console.error('Failed to open model:', err);
    error.value = `Failed to open model: ${err}`;
    loading.value = false;
  }
}

// Save the current model
async function saveModel() {
  if (!modelManager.value || !activeModel.value) return;
  
  try {
    loading.value = true;
    
    // Update the model components
    activeModel.value.components = modelComponents.value;
    
    // Save the model
    await modelManager.value.saveModel(activeModel.value);
    
    loading.value = false;
  } catch (err) {
    console.error('Failed to save model:', err);
    error.value = `Failed to save model: ${err}`;
    loading.value = false;
  }
}

// Create a new model
async function createNewModel() {
  if (!modelManager.value) return;
  
  try {
    loading.value = true;
    error.value = null;
    
    const model = await modelManager.value.createModel('New Model');
    activeModel.value = model;
    modelComponents.value = [];
    selectedComponent.value = null;
    
    loading.value = false;
  } catch (err) {
    console.error('Failed to create model:', err);
    error.value = `Failed to create model: ${err}`;
    loading.value = false;
  }
}

// Handle model selection
async function selectModel(modelId: string) {
  if (!modelManager.value) return;
  
  try {
    loading.value = true;
    error.value = null;
    
    const model = await modelManager.value.loadModel(modelId);
    activeModel.value = model;
    modelComponents.value = model.components;
    selectedComponent.value = null;
    
    loading.value = false;
  } catch (err) {
    console.error('Failed to load model:', err);
    error.value = 'Failed to load model';
    loading.value = false;
  }
}

// Handle component property changes
function handlePropertyChange(componentId: string, property: string, value: any) {
  const component = modelComponents.value.find(c => c.id === componentId);
  if (!component) return;
  
  // Update the component property
  component.properties[property] = value;
  
  // If this is a binding property, update the binding
  if (property === 'binding' && modelManager.value) {
    modelManager.value.updateBinding(component, value);
  }
}

// Panel resize functionality
function startResizeLeft(event: MouseEvent) {
  event.preventDefault();
  isResizingLeft.value = true;
  resizeStartX.value = event.clientX;
  resizeStartWidth.value = panelWidth.value;
}

function startResizeRight(event: MouseEvent) {
  event.preventDefault();
  isResizingRight.value = true;
  resizeStartX.value = event.clientX;
  resizeStartWidth.value = panelWidth.value;
}

function startResizeBottom(event: MouseEvent) {
  event.preventDefault();
  isResizingBottom.value = true;
  resizeStartY.value = event.clientY;
  resizeStartHeight.value = explorerHeight.value;
}

function handleMouseMove(event: MouseEvent) {
  if (isResizingLeft.value) {
    const diff = event.clientX - resizeStartX.value;
    panelWidth.value = Math.max(MIN_PANEL_WIDTH, Math.min(MAX_PANEL_WIDTH, resizeStartWidth.value + diff));
  } else if (isResizingRight.value) {
    const diff = resizeStartX.value - event.clientX;
    panelWidth.value = Math.max(MIN_PANEL_WIDTH, Math.min(MAX_PANEL_WIDTH, resizeStartWidth.value + diff));
  } else if (isResizingBottom.value) {
    const diff = resizeStartY.value - event.clientY;
    explorerHeight.value = Math.max(MIN_EXPLORER_HEIGHT, Math.min(MAX_EXPLORER_HEIGHT, resizeStartHeight.value + diff));
  }
}

function handleMouseUp() {
  isResizingLeft.value = false;
  isResizingRight.value = false;
  isResizingBottom.value = false;
}

// Zoom control functions
function zoomIn() {
  zoomLevel.value = Math.min(200, zoomLevel.value + 10);
}

function zoomOut() {
  zoomLevel.value = Math.max(50, zoomLevel.value - 10);
}

function resetZoom() {
  zoomLevel.value = 100;
}

// Show application menu on right click
function showContextMenu(event: MouseEvent) {
  event.preventDefault();
  
  menuStore.showMenu({
    x: event.clientX,
    y: event.clientY,
  }, [
      { id: 'new-model', label: 'New Model', action: createNewModel },
      { id: 'open-model', label: 'Open Model...', action: () => { /* prompt and call openModel(...) */ } },
      { id: 'save-model', label: 'Save Model', action: saveModel },
      { id: 'sep1', separator: true, label: '' },
      { id: 'close', label: 'Close', action: () => window.close() }
  ]);
}
</script>

<template>
  <div class="model-builder">
    <!-- Loading State -->
    <div v-if="loading" class="loading-container">
      <LoadingIndicator message="Loading model builder..." />
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-container">
      <div class="error-message">
        {{ error }}
        <button class="retry-button" @click="createNewModel">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
            <path fill="currentColor" d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
          </svg>
          Try Again
        </button>
      </div>
    </div>

    <!-- Main Content -->
    <div v-else class="app-container">
      <!-- Toolbar -->
      <div class="toolbar">
        <div class="toolbar-left">
          <button class="mb-button" @click="createNewModel">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
              <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
            New Model
          </button>
          
          <!-- Model Selector -->
          <select 
            class="mb-select" 
            :value="activeModel?.id"
            @change="selectModel($event.target.value)"
          >
            <option value="" disabled>Select a model...</option>
            <option v-for="model in availableModels" 
                    :key="model.id" 
                    :value="model.id"
            >
              {{ model.name }}
            </option>
          </select>
        </div>

        <div class="toolbar-right">
          <!-- Save button -->
          <button 
            class="mb-button mb-button-primary" 
            @click="saveModel"
            :disabled="!activeModel"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
              <path fill="currentColor" d="M17 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7l-4-4zm2 16H5V5h11.17L19 7.83V19z"/>
              <path fill="currentColor" d="M12 12c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
            </svg>
            Save Model
          </button>
        </div>
      </div>

      <!-- Content Area -->
      <div class="content-container">
        <!-- Toolbox -->
        <div class="left-panel" :style="{ width: `${panelWidth}px` }">
          <div class="resize-handle resize-handle-right" @mousedown="startResizeRight"></div>
          <ModelToolbox 
            :categories="componentCategories"
            @add-component="handleAddComponent"
          />
        </div>

        <!-- Canvas -->
        <div class="middle-panel">
          <ModelCanvas 
            :components="modelComponents"
            :selected-component="selectedComponent"
            :zoom-level="zoomLevel"
            @select-component="handleComponentSelect"
            @add-component="handleAddComponent"
          />
        </div>

        <!-- Properties Panel -->
        <div class="right-panel" :style="{ width: `${panelWidth}px` }">
          <div class="resize-handle resize-handle-left" @mousedown="startResizeLeft"></div>
          <ModelPropertyPanel 
            :component="selectedComponent"
            :active-model="activeModel"
            @property-change="handlePropertyChange"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.model-builder {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--qui-bg-secondary);
  color: var(--qui-text-primary);
  overflow: hidden;
}

.loading-container, .error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 20px;
}

.error-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  color: var(--qui-danger-color);
  text-align: center;
  max-width: 300px;
}

.retry-button {
  padding: 10px 18px;
  background: var(--qui-overlay-primary);
  border: 1px solid var(--qui-hover-border);
  border-radius: 20px;
  color: var(--qui-text-primary);
  cursor: pointer;
  transition: all 0.2s var(--qui-animation-bounce);
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: var(--qui-font-weight-medium);
}

.retry-button:hover {
  background: #00b0ff;
  color: var(--qui-bg-primary);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 176, 255, 0.2);
}

.app-container {
  display: flex;
  flex: 1;
  height: 100%;
  overflow: hidden;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: var(--qui-bg-primary);
  border-bottom: 1px solid var(--qui-hover-border);
}

.toolbar-left, .toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-title {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.toolbar-title h1 {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
  color: var(--qui-text-primary);
}

.model-status {
  font-size: 12px;
  color: var(--qui-text-secondary);
  margin-top: 2px;
}

.model-id {
  font-family: var(--qui-font-family-mono);
}

.content-container {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.panels-container {
  display: flex;
  flex: 1;
  height: calc(100% - 72px); /* Adjust for toolbar height */
  overflow: hidden;
}

.left-panel, .right-panel {
  height: 100%;
  background: var(--qui-bg-primary);
  position: relative;
  overflow: hidden;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
  z-index: 2;
  flex-shrink: 0;
}

.middle-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.canvas-container {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.bottom-panel {
  position: relative;
  background: var(--qui-bg-primary);
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.2);
  z-index: 1;
  overflow: hidden;
  flex-shrink: 0;
}

.resize-handle {
  position: absolute;
  background: transparent;
  z-index: 10;
  transition: background-color 0.2s ease;
}

.resize-handle-right {
  top: 0;
  right: 0;
  width: 4px;
  height: 100%;
  cursor: e-resize;
}

.resize-handle-left {
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  cursor: w-resize;
}

.resize-handle-top {
  top: 0;
  left: 0;
  width: 100%;
  height: 4px;
  cursor: n-resize;
}

.resize-handle:hover, .resize-handle.active {
  background-color: rgba(0, 176, 255, 0.3);
}

/* Add global styles for when resizing is happening */
:global(body.resizing-horizontal) {
  cursor: col-resize !important;
  user-select: none;
}

:global(body.resizing-vertical) {
  cursor: row-resize !important;
  user-select: none;
}

.toolbar {
  padding: 10px 20px;
  background: var(--qui-bg-primary);
  border-bottom: 1px solid var(--qui-divider-color);
  display: flex;
  align-items: center;
  gap: 10px;
}

.new-model-button {
  padding: 8px 16px;
  background: var(--qui-primary-color);
  border: none;
  border-radius: 4px;
  color: var(--qui-bg-primary);
  cursor: pointer;
  transition: background 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.new-model-button:hover {
  background: var(--qui-primary-color-hover);
}

.mb-zoom-controls {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
  z-index: 10;
}

.mb-zoom-button {
  background: var(--qui-bg-primary);
  border: 1px solid var(--qui-divider-color);
  border-radius: 4px;
  padding: 8px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.mb-zoom-button:hover {
  background: var(--qui-bg-secondary);
}

.mb-zoom-value {
  font-weight: var(--qui-font-weight-medium);
  color: var(--qui-text-primary);
}

.mb-select {
  min-width: 200px;
  padding: 6px 12px;
  border-radius: 4px;
  border: 1px solid var(--qui-hover-border);
  background: var(--qui-bg-secondary);
  color: var(--qui-text-primary);
  font-size: var(--qui-font-size-base);
  cursor: pointer;
}

.mb-select:focus {
  border-color: var(--qui-accent-color);
  outline: none;
  box-shadow: 0 0 0 2px rgba(0, 176, 255, 0.2);
}
</style>