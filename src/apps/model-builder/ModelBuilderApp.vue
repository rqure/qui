<script setup lang="ts">
import { ref, onMounted, watch, markRaw } from 'vue';
import { useDataStore } from '@/stores/data';
import { useWindowStore } from '@/stores/windows';
import type { EntityId } from '@/core/data/types';
import type { ShapeConfig, ModelConfig } from './utils/modelTypes';
import LoadingIndicator from '@/components/common/LoadingIndicator.vue';
import ModelEditor from './components/ModelEditor.vue';
import ModelLibrary from './components/ModelLibrary.vue';
import ModelPreview from './components/ModelPreview.vue';
import ModelProperties from './components/ModelProperties.vue';

// Additional imports to ensure Vue Konva is available
import VueKonva from 'vue-konva';

const dataStore = useDataStore();
const windowStore = useWindowStore();

// Track current state
const loading = ref(true);
const error = ref<string | null>(null);

// Model management
const currentModelId = ref<EntityId | null>(null);
const isModelChanged = ref(false);
const isNewModel = ref(false);

// UI state
const sidebarWidth = ref(280);
const propertiesPanelWidth = ref(300);
const isResizingSidebar = ref(false);
const isResizingProperties = ref(false);
const resizeStartX = ref(0);
const resizeStartWidth = ref(0);
const minPanelWidth = 200;
const maxPanelWidth = ref(500);

// Handle model selection from library
const handleModelSelect = (modelId: EntityId) => {
  // Check for unsaved changes first
  if (isModelChanged.value && currentModelId.value) {
    // Prompt for confirmation before changing models
    if (!confirm('You have unsaved changes. Discard them and switch models?')) {
      return;
    }
  }
  
  currentModelId.value = modelId;
  isModelChanged.value = false;
  isNewModel.value = false;
};

// Create a new model
const createNewModel = () => {
  // Check for unsaved changes
  if (isModelChanged.value && currentModelId.value) {
    if (!confirm('You have unsaved changes. Discard them and create a new model?')) {
      return;
    }
  }
  
  // Clear current model and start fresh
  currentModelId.value = null;
  isModelChanged.value = false;
  isNewModel.value = true;
};

// Save current model
const saveModel = async () => {
  try {
    // Saving will be implemented in the editor component
    isModelChanged.value = false;
  } catch (err) {
    error.value = 'Failed to save model: ' + (err as Error).message;
  }
};

// Resize handlers for sidebar
const startSidebarResize = (event: MouseEvent) => {
  event.preventDefault();
  isResizingSidebar.value = true;
  resizeStartX.value = event.clientX;
  resizeStartWidth.value = sidebarWidth.value;
  
  window.addEventListener('mousemove', handleSidebarResize);
  window.addEventListener('mouseup', endSidebarResize);
  
  document.body.classList.add('resizing-horizontal');
};

const handleSidebarResize = (event: MouseEvent) => {
  if (!isResizingSidebar.value) return;
  
  const delta = event.clientX - resizeStartX.value;
  sidebarWidth.value = Math.max(minPanelWidth, Math.min(maxPanelWidth.value, resizeStartWidth.value + delta));
};

const endSidebarResize = () => {
  isResizingSidebar.value = false;
  window.removeEventListener('mousemove', handleSidebarResize);
  window.removeEventListener('mouseup', endSidebarResize);
  document.body.classList.remove('resizing-horizontal');
};

// Resize handlers for properties panel
const startPropertiesResize = (event: MouseEvent) => {
  event.preventDefault();
  isResizingProperties.value = true;
  resizeStartX.value = event.clientX;
  resizeStartWidth.value = propertiesPanelWidth.value;
  
  window.addEventListener('mousemove', handlePropertiesResize);
  window.addEventListener('mouseup', endPropertiesResize);
  
  document.body.classList.add('resizing-horizontal');
};

const handlePropertiesResize = (event: MouseEvent) => {
  if (!isResizingProperties.value) return;
  
  const delta = resizeStartX.value - event.clientX;
  propertiesPanelWidth.value = Math.max(minPanelWidth, Math.min(maxPanelWidth.value, resizeStartWidth.value + delta));
};

const endPropertiesResize = () => {
  isResizingProperties.value = false;
  window.removeEventListener('mousemove', handlePropertiesResize);
  window.removeEventListener('mouseup', endPropertiesResize);
  document.body.classList.remove('resizing-horizontal');
};

// Add reactive refs for selected shape and model
const selectedShapeConfig = ref<ShapeConfig | null>(null);
const modelSettings = ref<ModelConfig | Record<string, any>>({});

// Open model in preview window
const openModelPreview = () => {
  // Create window icon as an SVG data URL
  const previewIconSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <path fill="#4CAF50" d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z" />
  </svg>
  `;
  
  const iconDataUrl = `data:image/svg+xml;base64,${btoa(previewIconSvg)}`;

  windowStore.createWindow({
    title: 'Model Preview',
    icon: iconDataUrl,
    component: markRaw(ModelPreview), // Use markRaw with the actual component
    props: {  // Fix: changed from componentProps to props
      modelId: currentModelId.value,
      standalone: true
    },
    minWidth: 600,
    minHeight: 400,
    width: 800,
    height: 600
  });
};

// Initialize data and connect to server
onMounted(async () => {
  try {
    loading.value = false;
  } catch (err: any) {
    error.value = 'Failed to connect to the data server: ' + (err as Error).message;
    loading.value = false;
  }
});

const retryLoading = () => {
  loading.value = true;
  error.value = null;
  
  try {
    // Remove unnecessary connection attempt - it happens elsewhere
    loading.value = false;
  } catch (err: any) {
    error.value = 'Failed to connect to the data server: ' + (err as Error).message;
    loading.value = false;
  }
};

// Watch for changes to model data
const handleModelChange = () => {
  isModelChanged.value = true;
};

// Update method signatures to accept proper shape config
const handleShapeUpdate = (shape: ShapeConfig | null) => {
  selectedShapeConfig.value = shape;
};

const handleModelUpdate = (model: ModelConfig) => {
  modelSettings.value = model;
};

// Add a global error handler for Konva-related errors
const handleKonvaError = (error: Error) => {
  console.warn('Konva operation error:', error);
  // Implement graceful error handling
};
</script>

<template>
  <div class="model-builder">
    <div v-if="loading" class="loading-container">
      <LoadingIndicator size="large" />
      <div class="loading-text">Loading Model Builder...</div>
    </div>
    <div v-else-if="error" class="error-container">
      <div class="error-message">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
          <path fill="#F44336" d="M12,2C17.53,2 22,6.47 22,12C22,17.53 17.53,22 12,22C6.47,22 2,17.53 2,12C2,6.47 6.47,2 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M11,7H13V13H11V7M11,15H13V17H11V15Z" />
        </svg>
        <span>{{ error }}</span>
      </div>
      <button class="retry-button" @click="retryLoading">
        <svg class="retry-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
          <path fill="currentColor" d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z" />
          <path fill="currentColor" d="M12,20V22A10,10 0 0,0 22,12H20A8,8 0 0,1 12,20Z" />
        </svg>
        Retry
      </button>
    </div>
    <div v-else class="model-builder-layout">
      <!-- Sidebar with model library -->
      <div class="sidebar" :style="{ width: sidebarWidth + 'px' }">
        <div class="sidebar-header">
          <h2 class="panel-title">Model Library</h2>
          <button class="action-button new-model-button" @click="createNewModel">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
              <path fill="currentColor" d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" />
            </svg>
            New
          </button>
        </div>
        <ModelLibrary @select-model="handleModelSelect" />
      </div>
      
      <!-- Resize handle for sidebar -->
      <div class="resize-handle sidebar-resize-handle" @mousedown="startSidebarResize">
        <div class="resize-handle-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
      
      <!-- Main content area with canvas -->
      <div class="main-content">
        <div class="main-header">
          <div class="model-info">
            <span class="model-status" :class="{ 'changed': isModelChanged }">
              {{ isModelChanged ? '•' : '' }}
            </span>
            <span class="model-name">
              {{ isNewModel ? 'Untitled Model' : (currentModelId ? 'Model Editor' : 'Select a Model') }}
            </span>
          </div>
          <div class="header-actions">
            <button class="action-button preview-button" @click="openModelPreview" :disabled="!currentModelId && !isNewModel">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
                <path fill="currentColor" d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z" />
              </svg>
              Preview
            </button>
            <button class="action-button save-button" :disabled="!isModelChanged" @click="saveModel">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
                <path fill="currentColor" d="M15,9H5V5H15M12,19A3,3 0 0,1 9,16A3,3 0 0,1 12,13A3,3 0 0,1 15,16A3,3 0 0,1 12,19M17,3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V7L17,3Z" />
              </svg>
              Save
            </button>
          </div>
        </div>
        
        <!-- Add the model editor with event handler -->
        <div class="editor-container">
          <ModelEditor 
            :model-id="currentModelId"
            :is-new-model="isNewModel"
            @model-change="handleModelChange"
            @update-shape="handleShapeUpdate"
            @update-model="handleModelUpdate"
          />
        </div>
      </div>
      
      <!-- Resize handle for properties panel -->
      <div class="resize-handle properties-resize-handle" @mousedown="startPropertiesResize">
        <div class="resize-handle-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
      
      <!-- Properties panel -->
      <div class="properties-panel" :style="{ width: propertiesPanelWidth + 'px' }">
        <div class="properties-header">
          <h2 class="panel-title">Properties</h2>
        </div>
        <!-- Pass correct props to ModelProperties -->
        <ModelProperties 
          :selected-shape="selectedShapeConfig" 
          :model-settings="modelSettings"
          @update-shape="(property, value) => {}"
          @update-model="(property, value) => {}"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.model-builder {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background: var(--qui-bg-primary);
  color: var(--qui-text-primary);
  overflow: hidden;
}

.model-builder-layout {
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.loading-container, .error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 16px;
}

.loading-text {
  font-size: var(--qui-font-size-large);
  color: var(--qui-text-secondary);
}

.error-message {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: var(--qui-font-size-large);
  color: #F44336;
}

.retry-button {
  background: rgba(255, 255, 255, 0.1);
  color: var(--qui-text-primary);
  border: 1px solid var(--qui-hover-border);
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s var(--qui-animation-bounce);
}

.retry-button:hover {
  background: rgba(255, 255, 255, 0.15);
  transform: translateY(-1px);
}

.retry-icon {
  animation: spin 1.5s linear infinite;
}

/* Sidebar styles */
.sidebar {
  height: 100%;
  border-right: 1px solid var(--qui-hover-border);
  background: var(--qui-bg-secondary);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  overflow: hidden;
}

.sidebar-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--qui-hover-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.panel-title {
  margin: 0;
  font-size: var(--qui-font-size-medium);
  font-weight: var(--qui-font-weight-medium);
}

.action-button {
  background: transparent;
  border: 1px solid var(--qui-hover-border);
  color: var(--qui-text-primary);
  border-radius: 4px;
  padding: 6px 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: all 0.2s var(--qui-animation-bounce);
}

.action-button:hover {
  background: rgba(255, 255, 255, 0.05);
}

.action-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.new-model-button {
  color: var(--qui-accent-color);
}

.save-button {
  color: var(--qui-accent-color);
}

.preview-button {
  color: #4CAF50;
}

/* Main content styles */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.main-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--qui-hover-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.model-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.model-status {
  font-size: 24px;
  line-height: 0;
}

.model-status.changed {
  color: var(--qui-accent-color);
}

.model-name {
  font-weight: var(--qui-font-weight-medium);
  font-size: var(--qui-font-size-medium);
}

.header-actions {
  display: flex;
  gap: 8px;
}

.editor-container {
  flex: 1;
  overflow: hidden;
  position: relative;
}

/* Properties panel styles */
.properties-panel {
  height: 100%;
  border-left: 1px solid var(--qui-hover-border);
  background: var(--qui-bg-secondary);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  overflow: hidden;
}

.properties-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--qui-hover-border);
}

/* Resize handle styles */
.resize-handle {
  width: 8px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: col-resize;
  z-index: 10;
  transition: background 0.2s;
}

.resize-handle:hover {
  background: rgba(0, 255, 136, 0.1);
}

.resize-handle-dots {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.resize-handle-dots span {
  width: 2px;
  height: 16px;
  background: var(--qui-hover-border);
  border-radius: 1px;
  transition: background 0.2s;
}

.resize-handle:hover .resize-handle-dots span {
  background: var(--qui-accent-color);
}

/* Handle global styling during resize */
:global(body.resizing-horizontal) {
  cursor: col-resize !important;
  user-select: none;
}

:global(body.resizing-horizontal *) {
  pointer-events: none;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

</style>
