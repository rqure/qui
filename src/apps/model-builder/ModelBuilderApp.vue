<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import { useDataStore } from '@/stores/data';
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
const dataStore = useDataStore();
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

// Initialize the application
onMounted(async () => {
  try {
    // Initialize data connection
    if (!dataStore.isConnected) {
      await dataStore.initialize();
    }
    
    // Create model manager
    modelManager.value = new ModelManager(dataStore);
    
    // Load available models
    await modelManager.value.loadModels();
    
    // Done loading
    loading.value = false;
  } catch (err) {
    console.error('Failed to initialize Model Builder:', err);
    error.value = 'Failed to initialize the application. Please try again.';
    loading.value = false;
  }
  
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
  const newComponent = modelManager.value.createComponent(componentType, opts);
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
    modelComponents.value = model.components;
    selectedComponent.value = null;
    
    loading.value = false;
  } catch (err) {
    console.error('Failed to create model:', err);
    error.value = `Failed to create model: ${err}`;
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
  
  menuStore.showMenu(
    { x: event.clientX, y: event.clientY },
    [
      {
        id: 'new-model',
        label: 'New Model',
        action: createNewModel
      },
      {
        id: 'save-model',
        label: 'Save',
        disabled: !activeModel.value,
        action: saveModel
      },
      { type: 'separator' },
      {
        id: 'zoom-in',
        label: 'Zoom In',
        action: zoomIn
      },
      {
        id: 'zoom-out',
        label: 'Zoom Out',
        action: zoomOut
      },
      {
        id: 'reset-zoom',
        label: 'Reset Zoom',
        action: resetZoom
      }
    ]
  );
}
</script>

<template>
  <div class="model-builder" @contextmenu="showContextMenu">
    <div v-if="loading" class="loading-container">
      <LoadingIndicator />
      <span>Loading Model Builder...</span>
    </div>
    
    <div v-else-if="error" class="error-container">
      <div class="error-message">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
          <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
        </svg>
        <span>{{ error }}</span>
      </div>
      <button class="retry-button" @click="loading = true; error = null; dataStore.initialize()">
        Retry
      </button>
    </div>
    
    <div v-else class="app-container">
      <!-- Toolbar: New Model Button -->
      <div class="toolbar">
        <button class="new-model-button" @click="createNewModel">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
            <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
          New Model
        </button>
      </div>
      
      <!-- Left Panel: Toolbox -->
      <div class="left-panel" :style="{ width: `${panelWidth}px` }">
        <ModelToolbox 
          :categories="componentCategories" 
          @add-component="handleAddComponent" 
        />
        
        <!-- Resize Handle -->
        <div 
          class="resize-handle resize-handle-right" 
          @mousedown="startResizeLeft"
          :class="{ 'active': isResizingLeft }"
        ></div>
      </div>
      
      <!-- Middle Panel: Canvas -->
      <div class="middle-panel">
        <div class="canvas-container">
          <ModelCanvas 
            :components="modelComponents"
            :selected-component="selectedComponent"
            :zoom-level="zoomLevel"
            @select-component="handleComponentSelect"
            @add-component="handleAddComponent"
          />
          
          <!-- Zoom Controls -->
          <div class="mb-zoom-controls">
            <button class="mb-zoom-button" @click="zoomOut" title="Zoom Out">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
                <path fill="currentColor" d="M19 13h-14v-2h14v2z"/>
              </svg>
            </button>
            <div class="mb-zoom-value">{{ zoomLevel }}%</div>
            <button class="mb-zoom-button" @click="zoomIn" title="Zoom In">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
                <path fill="currentColor" d="M19 13h-6v6h-2v-6h-6v-2h6v-6h2v6h6v2z"/>
              </svg>
            </button>
            <button class="mb-zoom-button" @click="resetZoom" title="Reset Zoom">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
                <path fill="currentColor" d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
              </svg>
            </button>
          </div>
        </div>
        
        <!-- Bottom Panel: Explorer -->
        <div 
          class="bottom-panel"
          :style="{ height: `${explorerHeight}px` }"
        >
          <div 
            class="resize-handle resize-handle-top" 
            @mousedown="startResizeBottom"
            :class="{ 'active': isResizingBottom }"
          ></div>
          
          <ModelExplorer 
            :components="modelComponents"
            :selected-component="selectedComponent"
            @select-component="handleComponentSelect"
          />
        </div>
      </div>
      
      <!-- Right Panel: Properties -->
      <div class="right-panel" :style="{ width: `${panelWidth}px` }">
        <div 
          class="resize-handle resize-handle-left" 
          @mousedown="startResizeRight"
          :class="{ 'active': isResizingRight }"
        ></div>
        
        <ModelPropertyPanel
          :component="selectedComponent"
          :active-model="activeModel"
          @property-change="handlePropertyChange"
        />
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
</style>
