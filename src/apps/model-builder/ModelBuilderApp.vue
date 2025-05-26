<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, nextTick } from 'vue';
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

// Ref for name input auto-focus
const nameInput = ref<HTMLInputElement | null>(null);

// Load available models
async function loadAvailableModels() {
  if (!modelManager.value) return;
  loading.value = true;
  error.value = null;
  try {
    availableModels.value = await modelManager.value.loadModels();
  } catch (err: any) {
    console.error('Failed to load models:', err);
    error.value = err.message || 'Failed to load models.';
  } finally {
    loading.value = false;
  }
}

// Initialize the application
onMounted(async () => {
  modelManager.value = new ModelManager();
  await loadAvailableModels();

  // If no models and no error, perhaps create a default or set activeModel to null
  if (availableModels.value.length === 0 && !error.value) {
    // Optionally select first model or leave activeModel as null
    // activeModel.value = null; // Explicitly
  } else if (availableModels.value.length > 0) {
    // Optionally auto-select the first model
    // await selectModel(availableModels.value[0].id);
  }

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
  loading.value = true;
  error.value = null;
  try {
    const model = await modelManager.value.loadModel(modelId);
    activeModel.value = model;
    modelComponents.value = model.components || [];
    selectedComponent.value = null;
  } catch (err: any) {
    console.error('Failed to open model:', err);
    error.value = err.message || `Failed to open model ${modelId}.`;
    activeModel.value = null; // Clear active model on error
  } finally {
    loading.value = false;
  }
}

// Save the current model
async function saveModel() {
  if (!modelManager.value || !activeModel.value) return;
  loading.value = true; // Or a different "saving" state
  error.value = null;
  try {
    activeModel.value.components = modelComponents.value; // Ensure components are up-to-date
    await modelManager.value.saveModel(activeModel.value);
    // Optionally: refresh available models if names might change, or update current model in list
    const index = availableModels.value.findIndex(m => m.id === activeModel.value!.id);
    if (index !== -1) {
      availableModels.value[index] = { ...activeModel.value };
    }
  } catch (err: any) {
    console.error('Failed to save model:', err);
    error.value = err.message || 'Failed to save model.';
  } finally {
    loading.value = false;
  }
}

// Create a new model
async function createNewModel() {
  if (!modelManager.value) return;
  loading.value = true;
  error.value = null;
  try {
    const newName = `New Model ${availableModels.value.length + 1}`;
    const model = await modelManager.value.createModel(newName);
    availableModels.value.push(model);
    await selectModel(model.id); // Select the new model
  } catch (err: any) {
    console.error('Failed to create model:', err);
    error.value = err.message || 'Failed to create model.';
  } finally {
    loading.value = false;
  }
}

// Handle model selection
async function selectModel(modelId: string) {
  if (modelId) {
    await openModel(modelId);
  } else {
    activeModel.value = null;
    modelComponents.value = [];
    selectedComponent.value = null;
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
  isResizingLeft.value = true;
  resizeStartX.value = event.clientX;
  resizeStartWidth.value = panelWidth.value;
  document.body.classList.add('resizing-ew');
}

function startResizeRight(event: MouseEvent) {
  isResizingRight.value = true;
  resizeStartX.value = event.clientX;
  resizeStartWidth.value = panelWidth.value;
  document.body.classList.add('resizing-ew');
}

function startResizeBottom(event: MouseEvent) {
  isResizingBottom.value = true;
  resizeStartY.value = event.clientY;
  resizeStartHeight.value = explorerHeight.value;
  document.body.classList.add('resizing-ns');
}

function handleMouseMove(event: MouseEvent) {
  if (!isResizingLeft.value && !isResizingRight.value && !isResizingBottom.value) return;
  event.preventDefault(); // Prevent text selection during drag

  if (isResizingLeft.value) {
    const newWidth = resizeStartWidth.value - (event.clientX - resizeStartX.value);
    panelWidth.value = Math.max(MIN_PANEL_WIDTH, Math.min(MAX_PANEL_WIDTH, newWidth));
  } else if (isResizingRight.value) {
    const newWidth = resizeStartWidth.value + (event.clientX - resizeStartX.value);
    panelWidth.value = Math.max(MIN_PANEL_WIDTH, Math.min(MAX_PANEL_WIDTH, newWidth));
  } else if (isResizingBottom.value) {
    const newHeight = resizeStartHeight.value + (event.clientY - resizeStartY.value);
    explorerHeight.value = Math.max(MIN_EXPLORER_HEIGHT, Math.min(MAX_EXPLORER_HEIGHT, newHeight));
  }
}

function handleMouseUp() {
  isResizingLeft.value = false;
  isResizingRight.value = false;
  isResizingBottom.value = false;
  document.body.classList.remove('resizing-ew');
  document.body.classList.remove('resizing-ns');
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
  nextTick(() => {
    nameInput.value?.focus();
    nameInput.value?.select();
  });
}

async function saveModelName() {
  if (!activeModel.value || !editedName.value.trim() || editedName.value.trim() === activeModel.value.name) {
    isEditingName.value = false;
    return;
  }
  const oldName = activeModel.value.name;
  activeModel.value.name = editedName.value.trim();
  isEditingName.value = false; // Optimistically update UI
  try {
    await saveModel(); // This will save the entire model, including the new name
  } catch (err) {
    activeModel.value.name = oldName; // Revert on error
    console.error('Failed to save model name:', err);
    // Optionally show error to user
  }
}

// Handle model selection from dropdown
function handleModelSelect(event: Event) {
  const target = event.target as HTMLSelectElement;
  if (target && target.value) {
    selectModel(target.value);
  } else {
    selectModel(''); // No model selected
  }
}

// Helper to format model info
const modelInfo = computed(() => {
  if (!activeModel.value) return null;
  return {
    name: activeModel.value.name,
    id: activeModel.value.id,
    // lastModified: activeModel.value.lastModified?.toLocaleString() // Assuming lastModified is a Date
  };
});

// Computed for whether editing is enabled
const editingEnabled = computed(() => activeModel.value !== null);
</script>

<template>
  <div class="mb-app">
    <!-- Loading State -->
    <div v-if="loading && !error" class="mb-loading-overlay">
      <LoadingIndicator message="Loading Model Builder..." />
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="mb-error-overlay">
      <div class="mb-error-content">
        <h2>Error</h2>
        <p>{{ error }}</p>
        <button class="mb-button" @click="loadAvailableModels">Try Again</button>
      </div>
    </div>

    <!-- Main Application Layout -->
    <template v-else>
      <header class="mb-header">
        <div class="mb-header-content">
          <div class="mb-header-left">
            <div class="model-select-container">
              <div class="model-select-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/></svg>
              </div>
              <select
                class="model-select"
                :value="activeModel?.id || ''"
                @change="handleModelSelect"
              >
                <option value="" :disabled="!!activeModel">Select a model...</option>
                <option v-for="model in availableModels" :key="model.id" :value="model.id">
                  {{ model.name }}
                </option>
              </select>
            </div>

            <div v-if="modelInfo" class="mb-model-info">
              <div v-if="!isEditingName" class="mb-model-name" @click="startEditingName" title="Click to edit name">
                {{ modelInfo.name }}
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"><path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
              </div>
              <input
                v-else
                ref="nameInput"
                v-model="editedName"
                class="mb-model-name-input"
                @keyup.enter="saveModelName"
                @blur="saveModelName"
                @keyup.esc="isEditingName = false"
              />
              <div class="mb-model-id">ID: {{ modelInfo.id }}</div>
            </div>
          </div>

          <div class="mb-header-right">
            <button class="mb-button" @click="createNewModel" title="Create a new model">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
              New
            </button>
            <button class="mb-button mb-button-primary" @click="saveModel" :disabled="!editingEnabled" title="Save current model">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M17 3H5c-1.11 0-2 .89-2 2v14c0 1.11.89 2 2 2h14c1.11 0 2-.89 2-2V7l-4-4zm2 16H5V5h11.17L19 7.83V19zm-7-7c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zM6 6h9v4H6V6z" /></svg>
              Save
            </button>
          </div>
        </div>
      </header>

      <div class="mb-main-wrapper">
        <div v-if="!activeModel" class="mb-empty-state">
          <div class="mb-empty-content">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24"><path fill="currentColor" d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm3 16H7v-2h10v2zm0-4H7v-2h10v2zm-3-4H7V8h7v2z"/></svg>
            <h2>No Model Selected</h2>
            <p>Select an existing model from the dropdown or create a new one to begin.</p>
             <button class="mb-button mb-button-primary" @click="createNewModel">Create New Model</button>
          </div>
        </div>
        <template v-else>
          <div class="mb-content">
            <aside class="mb-panel mb-panel-left" :style="{ width: panelWidth + 'px' }">
              <div class="mb-panel-header">Components</div>
              <ModelToolbox
                :categories="componentCategories"
                @add-component="handleAddComponent"
              />
              <div class="resize-handle resize-handle-right" @mousedown="startResizeRight"></div>
            </aside>

            <main class="mb-canvas-wrapper">
              <div class="mb-canvas">
                <ModelCanvas
                  :components="modelComponents"
                  :selected-component="selectedComponent"
                  :zoom-level="zoomLevel"
                  @select-component="handleComponentSelect"
                  @add-component="handleAddComponent"
                />
              </div>
              <div class="mb-canvas-zoom-controls">
                <button class="mb-zoom-button" @click="zoomOut" title="Zoom Out">-</button>
                <div class="mb-zoom-value">{{ zoomLevel }}%</div>
                <button class="mb-zoom-button" @click="zoomIn" title="Zoom In">+</button>
                <button class="mb-zoom-button" @click="resetZoom" title="Reset Zoom">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/></svg>
                </button>
              </div>
            </main>

            <aside class="mb-panel mb-panel-right" :style="{ width: panelWidth + 'px' }">
              <div class="mb-panel-header">Properties</div>
              <ModelPropertyPanel
                :component="selectedComponent"
                :active-model="activeModel"
                @property-change="handlePropertyChange"
              />
              <div class="resize-handle resize-handle-left" @mousedown="startResizeLeft"></div>
            </aside>
          </div>

          <footer class="mb-explorer" :style="{ height: explorerHeight + 'px' }">
            <div class="resize-handle resize-handle-top" @mousedown="startResizeBottom"></div>
            <div class="mb-panel-header">Explorer</div>
            <ModelExplorer
              :components="modelComponents"
              :selected-component="selectedComponent"
              @select-component="handleComponentSelect"
            />
          </footer>
        </template>
      </div>
    </template>
  </div>
</template>

<style scoped>
.mb-app {
  display: flex;
  flex-direction: column;
  height: 100vh; /* Full viewport height */
  overflow: hidden; /* Prevent main app scrollbars */
  background: var(--qui-bg-primary);
  color: var(--qui-text-primary);
}

.mb-loading-overlay, .mb-error-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.5);
  z-index: 1000;
}
.mb-error-content {
  background: var(--qui-bg-secondary);
  padding: 20px;
  border-radius: 8px;
  text-align: center;
  box-shadow: 0 4px 15px rgba(0,0,0,0.2);
}
.mb-error-content h2 { margin-top: 0; color: var(--qui-status-critical); }

.mb-header {
  flex-shrink: 0;
  background: var(--qui-bg-secondary);
  border-bottom: 1px solid var(--qui-hover-border);
  z-index: 10;
}

.mb-header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px; /* Reduced padding */
  gap: 16px;
  height: 48px; /* Fixed header height */
  box-sizing: border-box;
}
.mb-header-left {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0; /* Allow shrinking */
}
.model-select-container {
  position: relative;
  min-width: 180px; /* Adjusted */
  max-width: 250px; /* Added max-width */
}

.model-select-icon {
  position: absolute;
  left: 10px; /* Adjusted */
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
  height: 32px; /* Adjusted height */
  padding: 0 28px 0 36px;
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
  align-items: center; /* Align name and ID on the same line */
  gap: 8px; /* Smaller gap */
  min-width: 0; /* Allow shrinking */
  border-left: 1px solid var(--qui-hover-border);
  padding-left: 16px;
}

.mb-model-name {
  font-size: 1em; /* Adjusted font size */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px; /* Limit name width */
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
  font-size: 1em; /* Match display size */
  padding: 2px 6px; /* Smaller padding */
  max-width: 200px;
  background: var(--qui-bg-secondary);
  border: 1px solid var(--qui-hover-border);
  border-radius: 4px;
}

.mb-model-id {
  font-size: 0.75em; /* Smaller ID */
}

.mb-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mb-main-wrapper {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  overflow: hidden;
}

.mb-empty-state {
  flex-grow: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  text-align: center;
  color: var(--qui-text-secondary);
}
.mb-empty-content svg { margin-bottom: 16px; opacity: 0.5; }
.mb-empty-content h2 { font-size: 1.5em; color: var(--qui-text-primary); margin-bottom: 8px; }
.mb-empty-content p { margin-bottom: 16px; }


.mb-content {
  display: flex;
  flex-direction: row;
  flex-grow: 1;
  overflow: hidden;
  min-height: 0; /* Important for flex children in Firefox */
}

.mb-panel {
  flex-shrink: 0;
  overflow: hidden; /* Changed from auto to hidden, child will handle scroll */
  display: flex;
  flex-direction: column; /* For header + content structure */
  position: relative;
  background: var(--qui-bg-secondary);
}
.mb-panel-left {
  border-right: 1px solid var(--qui-hover-border);
}
.mb-panel-right {
  border-left: 1px solid var(--qui-hover-border);
}
.mb-panel-header {
  padding: 8px 12px; /* Reduced padding */
  font-size: 0.875em; /* Smaller font */
  font-weight: var(--qui-font-weight-medium);
  color: var(--qui-text-secondary);
  background: var(--qui-overlay-primary);
  border-bottom: 1px solid var(--qui-hover-border);
  flex-shrink: 0;
}

/* Ensure ModelToolbox, ModelPropertyPanel, ModelExplorer internal content is scrollable */
/* e.g., their root element or a specific list inside them should have overflow: auto; height: 100%; */
:deep(.toolbox), :deep(.property-panel-content), :deep(.explorer-content) {
  overflow-y: auto;
  height: 100%; /* Or flex-grow: 1 if parent is flex column */
}


.mb-canvas-wrapper {
  flex-grow: 1;
  position: relative;
  overflow: hidden;
  display: flex; /* To contain canvas and allow it to grow */
}
.mb-canvas {
  flex-grow: 1;
  position: relative; /* For positioning components on canvas */
  background-color: var(--qui-bg-primary); /* From model-builder.css, adapted to theme */
  background-image:
    linear-gradient(var(--qui-hover-border) 1px, transparent 1px),
    linear-gradient(90deg, var(--qui-hover-border) 1px, transparent 1px);
  background-size: 20px 20px;
  background-position: -1px -1px; /* Align grid nicely */
}

.mb-explorer {
  flex-shrink: 0;
  overflow: hidden; /* Changed from auto, child will handle scroll */
  display: flex;
  flex-direction: column;
  position: relative;
  border-top: 1px solid var(--qui-hover-border);
  background: var(--qui-bg-secondary);
}

.resize-handle {
  background: transparent; /* Make it invisible by default */
  z-index: 10;
  transition: background-color 0.1s ease;
}
.resize-handle:hover {
  background: var(--qui-accent-color-alpha); /* Use a theme variable for transparent accent */
}
.resize-handle-right {
  position: absolute; top: 0; right: -3px; width: 6px; height: 100%; cursor: col-resize;
}
.resize-handle-left {
  position: absolute; top: 0; left: -3px; width: 6px; height: 100%; cursor: col-resize;
}
.resize-handle-top {
  position: absolute; top: -3px; left: 0; width: 100%; height: 6px; cursor: row-resize;
}

:global(body.resizing-ew) { cursor: col-resize !important; user-select: none !important; }
:global(body.resizing-ns) { cursor: row-resize !important; user-select: none !important; }
:global(body.resizing-ew) .resize-handle,
:global(body.resizing-ns) .resize-handle {
  background: var(--qui-accent-color) !important;
}


.mb-canvas-zoom-controls {
  position: absolute;
  bottom: 10px; /* Adjusted */
  right: 10px;  /* Adjusted */
  display: flex;
  gap: 6px;     /* Adjusted */
  z-index: 5;
  background: var(--qui-overlay-primary);
  padding: 4px; /* Added padding */
  border-radius: 20px; /* Rounded container */
  box-shadow: var(--qui-shadow-1);
}
.mb-zoom-button {
  width: 28px; /* Adjusted */
  height: 28px;/* Adjusted */
  /* ... rest from model-builder.css, ensure theme variables are used ... */
  background: var(--qui-overlay-secondary);
  border: 1px solid var(--qui-hover-border);
  color: var(--qui-text-primary);
}
.mb-zoom-button:hover {
  background: var(--qui-accent-color);
  color: var(--qui-bg-primary); /* Ensure contrast */
}
.mb-zoom-value {
  min-width: 40px; /* Adjusted */
  height: 28px;   /* Adjusted */
  padding: 0 8px; /* Added padding */
  /* ... rest from model-builder.css, ensure theme variables are used ... */
  background: var(--qui-overlay-secondary);
  border: 1px solid var(--qui-hover-border);
  color: var(--qui-text-primary);
}
</style>