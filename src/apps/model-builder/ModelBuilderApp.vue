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

// Add model name editor state
const isEditingName = ref(false)
const editedName = ref('')

function startEditingName() {
  editedName.value = activeModel.value?.name || ''
  isEditingName.value = true
}

function saveModelName() {
  if (activeModel.value && editedName.value) {
    activeModel.value.name = editedName.value
    saveModel()
  }
  isEditingName.value = false
}
</script>

<template>
  <div class="model-builder">
    <!-- App Header -->
    <header class="mb-header">
      <div class="mb-header-left">
        <div v-if="activeModel" class="mb-model-info">
          <div v-if="!isEditingName" class="mb-model-name" @click="startEditingName">
            {{ activeModel.name }}
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24">
              <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
            </svg>
          </div>
          <div v-else class="mb-model-name-editor">
            <input 
              v-model="editedName" 
              @keyup.enter="saveModelName"
              @blur="saveModelName"
              ref="nameInput"
              class="mb-name-input"
            />
          </div>
          <div class="mb-model-id" v-if="activeModel.id">ID: {{ activeModel.id }}</div>
        </div>
      </div>

      <div class="mb-header-center">
        <!-- Model Selector -->
        <select 
          class="mb-model-select" 
          :value="activeModel?.id"
          @change="selectModel($event.target.value)"
        >
          <option value="" disabled>Select a model...</option>
          <option v-for="model in availableModels" :key="model.id" :value="model.id">
            {{ model.name }}
          </option>
        </select>
      </div>

      <div class="mb-header-right">
        <button class="mb-button" @click="createNewModel">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
            <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
          New Model
        </button>
        <button class="mb-button mb-button-primary" @click="saveModel" :disabled="!activeModel">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
            <path fill="currentColor" d="M17 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7l-4-4z"/>
          </svg>
          Save
        </button>
      </div>
    </header>

    <!-- Main Content -->
    <div class="mb-main">
      <!-- Loading State -->
      <div v-if="loading" class="mb-loading">
        <LoadingIndicator message="Loading model builder..." />
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="mb-error">
        <div class="error-message">
          {{ error }}
          <button class="retry-button" @click="createNewModel">Try Again</button>
        </div>
      </div>

      <!-- Editor Layout -->
      <div v-else class="mb-editor">
        <!-- Toolbox Panel -->
        <div class="mb-panel mb-panel-left" :style="{ width: `${panelWidth}px` }">
          <ModelToolbox 
            :categories="componentCategories"
            @add-component="handleAddComponent"
          />
          <div class="resize-handle resize-handle-right" @mousedown="startResizeRight"></div>
        </div>

        <!-- Canvas Area -->
        <div class="mb-panel mb-panel-center">
          <ModelCanvas 
            :components="modelComponents"
            :selected-component="selectedComponent"
            :zoom-level="zoomLevel"
            @select-component="handleComponentSelect"
            @add-component="handleAddComponent"
          />
          <!-- Zoom Controls -->
          <div class="mb-zoom-controls">
            <button class="mb-zoom-button" @click="zoomOut">-</button>
            <div class="mb-zoom-value">{{ zoomLevel }}%</div>
            <button class="mb-zoom-button" @click="zoomIn">+</button>
            <button class="mb-zoom-button" @click="resetZoom">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
                <path fill="currentColor" d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Properties Panel -->
        <div class="mb-panel mb-panel-right" :style="{ width: `${panelWidth}px` }">
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
}

.mb-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  background: var(--qui-bg-primary);
  border-bottom: 1px solid var(--qui-hover-border);
  height: 64px;
  flex-shrink: 0;
}

.mb-header-left, .mb-header-center, .mb-header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.mb-header-left {
  width: 300px;
}

.mb-header-center {
  flex: 1;
  justify-content: center;
}

.mb-header-right {
  width: 300px;
  justify-content: flex-end;
}

.mb-model-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mb-model-name {
  font-size: 18px;
  font-weight: 500;
  color: #00b0ff;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.mb-model-name svg {
  opacity: 0;
  transition: opacity 0.2s ease;
}

.mb-model-name:hover svg {
  opacity: 0.6;
}

.mb-model-id {
  font-size: 12px;
  color: var(--qui-text-secondary);
  font-family: var(--qui-font-family-mono);
}

.mb-name-input {
  font-size: 18px;
  font-weight: 500;
  color: #00b0ff;
  background: var(--qui-bg-secondary);
  border: 1px solid var(--qui-hover-border);
  border-radius: 4px;
  padding: 4px 8px;
  width: 200px;
}

.mb-model-select {
  min-width: 250px;
  padding: 8px 12px;
  background: var(--qui-bg-secondary);
  border: 1px solid var(--qui-hover-border);
  border-radius: 4px;
  color: var(--qui-text-primary);
  cursor: pointer;
}

.mb-main {
  flex: 1;
  display: flex;
  overflow: hidden;
  position: relative;
}

.mb-editor {
  display: flex;
  width: 100%;
  height: 100%;
}

.mb-panel {
  position: relative;
  height: 100%;
}

.mb-panel-left, .mb-panel-right {
  background: var(--qui-bg-primary);
  width: 300px;
  flex-shrink: 0;
}

.mb-panel-center {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: var(--qui-bg-secondary);
}

/* Toolbox styles */
.mb-toolbox {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mb-toolbox-category {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mb-toolbox-category-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--qui-text-primary);
}

.mb-toolbox-item {
  padding: 10px;
  border: 1px solid var(--qui-hover-border);
  border-radius: 4px;
  background: var(--qui-bg-secondary);
  color: var(--qui-text-primary);
  cursor: pointer;
  transition: background 0.2s ease;
}

.mb-toolbox-item:hover {
  background: var(--qui-primary-color);
  color: var(--qui-bg-primary);
}

/* Canvas styles */
.mb-canvas {
  position: relative;
  width: 100%;
  height: 100%;
  background: var(--qui-bg-secondary);
  overflow: hidden;
  border: 1px solid var(--qui-hover-border);
  border-radius: 4px;
}

.mb-canvas-zoom-controls {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
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

/* Property panel styles */
.mb-property-panel {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mb-property-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mb-property-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--qui-text-primary);
}

.mb-property-value {
  font-size: 14px;
  color: var(--qui-text-primary);
}

.mb-property-input {
  padding: 8px;
  border: 1px solid var(--qui-hover-border);
  border-radius: 4px;
  background: var(--qui-bg-secondary);
  color: var(--qui-text-primary);
}

/* Resize handle styles */
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