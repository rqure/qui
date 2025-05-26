<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import { useMenuStore } from '@/stores/menu';
import { useWindowStore } from '@/stores/windows';
import ModelToolbox from './components/ModelToolbox.vue';
import ModelCanvas from './components/ModelCanvas.vue';
import ModelPropertyPanel from './components/ModelPropertyPanel.vue';
import ModelExplorer from './components/ModelExplorer.vue';
import LoadingIndicator from '@/components/common/LoadingIndicator.vue';
import './styles/theme-extensions.css';

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

// Add model name editing state
const isEditingName = ref(false);
const editedName = ref('');

function startEditingName() {
  if (!activeModel.value) return;
  editedName.value = activeModel.value.name;
  isEditingName.value = true;
}

async function saveModelName() {
  if (!activeModel.value || !editedName.value.trim()) {
    isEditingName.value = false;
    return;
  }

  try {
    activeModel.value.name = editedName.value.trim();
    await saveModel();
    isEditingName.value = false;
  } catch (err) {
    console.error('Failed to save model name:', err);
  }
}

// Handle model selection with proper event typing
function handleModelSelect(event: Event) {
  const target = event.target as HTMLSelectElement;
  if (target && target.value) {
    selectModel(target.value);
  }
}

// Helper to format model info
const modelInfo = computed(() => {
  if (!activeModel.value) return null;
  return {
    name: activeModel.value.name,
    id: activeModel.value.id,
    modified: activeModel.value.lastModified?.toLocaleString()
  };
});

// Computed for whether editing is enabled
const editingEnabled = computed(() => activeModel.value !== null);
</script>

<template>
  <div class="model-builder">
    <!-- Header toolbar -->
    <header class="mb-header">
      <div class="mb-header-content">
        <div class="mb-header-left">
          <select 
            class="mb-select mb-input mb-hover-accent" 
            :value="activeModel?.id"
            @change="handleModelSelect"
          >
            <option value="" disabled>Select a model...</option>
            <option v-for="model in availableModels" 
                    :key="model.id" 
                    :value="model.id"
            >
              {{ model.name }}
            </option>
          </select>

          <div v-if="activeModel" class="mb-model-info">
            <!-- Editable model name -->
            <div v-if="!isEditingName" class="mb-model-name" @click="startEditingName">
              {{ activeModel.name }}
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24">
                <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z"/>
              </svg>
            </div>
            <input
              v-else
              v-model="editedName"
              class="mb-model-name-input"
              @keyup.enter="saveModelName"
              @blur="saveModelName"
              @keyup.esc="isEditingName = false"
              ref="nameInput"
              v-focus
            />
            <div class="mb-model-id">ID: {{ activeModel.id }}</div>
          </div>
        </div>

        <div class="mb-header-right">
          <button class="mb-button" @click="createNewModel">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
              <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
            New Model
          </button>
          <button 
            class="mb-button mb-button-primary" 
            @click="saveModel"
            :disabled="!editingEnabled"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
              <path fill="currentColor" d="M17 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7l-4-4z"/>
            </svg>
            Save
          </button>
        </div>
      </div>
    </header>

    <!-- Main editor panels -->
    <div class="mb-content">
      <!-- Toolbox -->
      <aside class="mb-panel mb-panel-left" :style="{ width: `${panelWidth}px` }">
        <ModelToolbox
          :categories="componentCategories"
          @add-component="handleAddComponent"
        />
        <div class="resize-handle resize-handle-right" @mousedown="startResizeRight"></div>
      </aside>

      <!-- Canvas -->
      <div class="mb-panel mb-panel-center">
        <ModelCanvas
          :components="modelComponents"
          :selected-component="selectedComponent"
          :zoom-level="zoomLevel"
          @select-component="handleComponentSelect"
          @add-component="handleAddComponent"
        />
      </div>

      <!-- Property panel -->
      <aside class="mb-panel mb-panel-right" :style="{ width: `${panelWidth}px` }">
        <ModelPropertyPanel
          :component="selectedComponent"
          :active-model="activeModel"
          @property-change="handlePropertyChange"
        />
        <div class="resize-handle resize-handle-left" @mousedown="startResizeLeft"></div>
      </aside>
    </div>

    <!-- Bottom explorer panel -->
    <div class="mb-explorer" :style="{ height: `${explorerHeight}px` }">
      <div class="resize-handle-top" @mousedown="startResizeBottom"></div>
      <ModelExplorer
        :components="modelComponents"
        :selected-component="selectedComponent"
        @select-component="handleComponentSelect"
      />
    </div>
  </div>
</template>

<style scoped>
.mb-app {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--qui-bg-primary);
}

.mb-header {
  flex: 0 0 auto;
  border-bottom: 1px solid var(--qui-hover-border);
  z-index: 10;
}

.mb-header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  gap: 16px;
  border-bottom: 1px solid var(--qui-hover-border);
}

.mb-header-left {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
}

.model-select-container {
  position: relative;
  min-width: 280px;
}

.model-select-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--qui-text-secondary);
  display: flex;
  align-items: center;
  opacity: 0.7;
  pointer-events: none;
}

.model-select {
  width: 100%;
  height: 36px;
  padding: 0 36px 0 36px;
  font-family: var(--qui-font-family);
  font-size: var(--qui-font-size-base);
  color: var(--qui-text-primary);
  background: var(--qui-overlay-primary);
  border: 1px solid var(--qui-hover-border);
  border-radius: 4px;
  cursor: pointer;
  appearance: none;
  transition: all 0.2s var(--qui-animation-bounce);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath fill='rgba(255,255,255,0.5)' d='M7 10l5 5 5-5z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
  background-size: 16px;
}

.model-select:hover {
  background-color: var(--qui-overlay-secondary);
  border-color: var(--qui-accent-color);
}

.model-select:focus {
  outline: none;
  border-color: var(--qui-accent-color);
  box-shadow: 0 0 0 2px var(--qui-overlay-primary);
}

.model-select option {
  background: var(--qui-bg-primary);
  color: var(--qui-text-primary);
  padding: 8px;
}

.mb-model-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 12px;
  border-left: 1px solid var(--qui-hover-border);
}

.mb-model-name {
  font-size: 16px;
  font-weight: 500;
  color: var(--qui-accent-color);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
}

.mb-model-name svg {
  opacity: 0;
  transition: opacity 0.2s ease;
}

.mb-model-name:hover svg {
  opacity: 0.6;
}

.mb-model-name-input {
  font-size: 16px;
  font-weight: 500;
  color: var(--qui-accent-color);
  background: var(--qui-bg-secondary);
  border: 1px solid var(--qui-hover-border);
  border-radius: 4px;
  padding: 4px 8px;
  width: 200px;
}

.mb-model-id {
  font-size: 12px;
  color: var(--qui-text-secondary);
  font-family: var(--qui-font-family-mono);
}

.mb-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.mb-panel {
  display: flex;
  flex-direction: column;
  background: var(--qui-bg-secondary);
  border-right: 1px solid var(--qui-hover-border);
  overflow: hidden;
}

.mb-panel-header {
  padding: 12px 16px;
  font-size: var(--qui-font-size-base);
  font-weight: var(--qui-font-weight-medium);
  color: var(--qui-text-secondary);
  background: linear-gradient(to bottom, var(--qui-overlay-primary), transparent);
  border-bottom: 1px solid var(--qui-hover-border);
}

.mb-panel-right {
  border-right: none;
  border-left: 1px solid var(--qui-hover-border);
}

.mb-canvas {
  flex: 1;
  position: relative;
  background: var(--qui-bg-primary);
  background-image: 
    linear-gradient(var(--qui-hover-border) 1px, transparent 1px),
    linear-gradient(90deg, var(--qui-hover-border) 1px, transparent 1px);
  background-size: 20px 20px;
  background-position: -1px -1px;
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
  top: 0;
  width: 4px;
  height: 100%;
  cursor: col-resize;
  background: transparent;
  transition: background-color 0.2s ease;
}

.resize-handle:hover {
  background: var(--qui-accent-color);
}

.resize-handle-left {
  left: 0;
}

.resize-handle-right {
  right: 0;
}

/* When resizing */
:global(body.resizing) .resize-handle {
  background: var(--qui-accent-color) !important;
}

:global(body.resizing) {
  cursor: col-resize !important;
  user-select: none;
}

/* Selected component highlight */
.mb-component-selected {
  outline: 2px solid var(--qui-accent-color) !important;
  outline-offset: 2px;
  box-shadow: 0 0 10px var(--qui-accent-glow) !important;
}
</style>