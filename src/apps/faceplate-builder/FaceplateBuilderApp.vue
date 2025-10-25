<template>
  <div class="faceplate-builder-app">
    <!-- Multi-Row Toolbar -->
    <div class="top-toolbar">
      <!-- ROW 1: Identity & Primary Actions -->
      <div class="toolbar-row toolbar-row-primary">
        <!-- Left: Faceplate Identity -->
        <div class="toolbar-section toolbar-identity">
          <span v-if="currentFaceplateId" class="faceplate-id">{{ currentFaceplateId }}</span>
          
          <!-- Name Editor -->
          <div class="identity-field identity-field-name">
            <div v-if="isEditingName" class="inline-editor">
              <input
                ref="nameInput"
                v-model="editNameValue"
                @blur="finishEditingName"
                @keyup.enter="finishEditingName"
                @keyup.escape="cancelEditingName"
                class="inline-input"
                type="text"
                placeholder="Faceplate name"
              />
            </div>
            <div v-else class="identity-display" @click="startEditingName" :title="currentFaceplateName || 'Click to set name'">
              <span v-if="currentFaceplateName" class="identity-text">{{ currentFaceplateName }}</span>
              <span v-else class="identity-placeholder">Untitled Faceplate</span>
            </div>
          </div>
          
          <!-- Description Editor -->
          <div v-if="currentFaceplateId || currentFaceplateName" class="identity-field identity-field-description">
            <span class="identity-separator">•</span>
            <div v-if="isEditingDescription" class="inline-editor">
              <input
                ref="descriptionInput"
                v-model="editDescriptionValue"
                @blur="finishEditingDescription"
                @keyup.enter="finishEditingDescription"
                @keyup.escape="cancelEditingDescription"
                class="inline-input"
                type="text"
                placeholder="Add description"
              />
            </div>
            <div v-else class="identity-display" @click="startEditingDescription" :title="currentFaceplateDescription || 'Click to add description'">
              <span v-if="currentFaceplateDescription" class="identity-text identity-text-muted">{{ currentFaceplateDescription }}</span>
              <span v-else class="identity-placeholder identity-placeholder-muted">Add description</span>
            </div>
          </div>
        </div>
        
        <!-- Right: Primary Actions -->
        <div class="toolbar-section toolbar-actions">
          <div class="button-group">
            <button @click="createNew" class="btn btn-secondary btn-compact" title="New Faceplate">
              <span class="icon">📄</span>
              <span class="btn-label">New</span>
            </button>
            <button @click="loadFaceplate" class="btn btn-secondary btn-compact" title="Load Existing">
              <span class="icon">📂</span>
              <span class="btn-label">Load</span>
            </button>
            <button @click="saveFaceplate" :disabled="!hasChanges && !currentFaceplateId" class="btn btn-primary btn-compact" title="Save">
              <span class="icon">💾</span>
              <span class="btn-label">Save</span>
            </button>
          </div>
          
          <div class="separator"></div>
          
          <div class="button-group">
            <button @click="undo" :disabled="!canUndo()" class="btn btn-secondary btn-compact" title="Undo (Ctrl+Z / Cmd+Z)">
              <span class="icon">↶</span>
              <span class="btn-label">Undo</span>
            </button>
            <button @click="redo" :disabled="!canRedo()" class="btn btn-secondary btn-compact" title="Redo (Ctrl+Shift+Z / Cmd+Shift+Z)">
              <span class="icon">↷</span>
              <span class="btn-label">Redo</span>
            </button>
          </div>
        </div>
      </div>
      
      <!-- ROW 2: Canvas Config & View Controls -->
      <div class="toolbar-row toolbar-row-secondary">
        <!-- Left: Canvas Configuration -->
        <div class="toolbar-section toolbar-canvas-config">
          <div class="config-group-inline">
            <div class="config-item">
              <label>W:</label>
              <input type="number" v-model.number="canvasWidth" @change="updateCanvasSize" min="100" max="4000" step="50" />
            </div>
            <div class="config-item">
              <label>H:</label>
              <input type="number" v-model.number="canvasHeight" @change="updateCanvasSize" min="100" max="4000" step="50" />
            </div>
            <div class="config-item config-item-color">
              <label>BG:</label>
              <input type="color" v-model="canvasBackground" @change="updateCanvasBackground" />
            </div>
          </div>
        </div>
        
        <div class="separator"></div>
        
        <!-- Center: View Controls -->
        <div class="toolbar-section toolbar-view-controls">
          <div class="button-group button-group-compact">
            <button @click="zoomIn" class="btn btn-icon" title="Zoom In">
              <span class="icon">🔍+</span>
            </button>
            <button @click="zoomOut" class="btn btn-icon" title="Zoom Out">
              <span class="icon">🔍-</span>
            </button>
            <button @click="resetZoom" class="btn btn-icon" title="Reset Zoom">
              <span class="icon">⊡</span>
            </button>
            <button @click="fitToView" class="btn btn-icon" title="Fit All Shapes">
              <span class="icon">⊞</span>
            </button>
          </div>
        </div>
        
        <div class="separator"></div>
        
        <!-- Right: Help & Toggles -->
        <div class="toolbar-section toolbar-toggles">
          <button @click="showKeyboardShortcuts = !showKeyboardShortcuts" class="btn btn-icon" :class="{ active: showKeyboardShortcuts }" title="Keyboard Shortcuts">
            <span class="icon">⌨️</span>
          </button>
          
          <div class="separator"></div>
          
          <label class="checkbox-label checkbox-label-compact">
            <input type="checkbox" v-model="showGrid" />
            <span>Grid</span>
          </label>
          <label class="checkbox-label checkbox-label-compact">
            <input type="checkbox" v-model="snapToGrid" :disabled="!showGrid" />
            <span>Snap</span>
          </label>
        </div>
      </div>
    </div>
    
    <!-- Keyboard Shortcuts Panel -->
    <div v-if="showKeyboardShortcuts" class="shortcuts-panel">
      <div class="shortcuts-header">
        <h4>Keyboard Shortcuts</h4>
      </div>
      <div class="shortcuts-grid">
        <div class="shortcut-item">
          <kbd>Ctrl/Cmd + Z</kbd>
          <span>Undo</span>
        </div>
        <div class="shortcut-item">
          <kbd>Ctrl/Cmd + Shift + Z</kbd>
          <span>Redo</span>
        </div>
        <div class="shortcut-item">
          <kbd>Ctrl/Cmd + Y</kbd>
          <span>Redo (Alt)</span>
        </div>
        <div class="shortcut-item">
          <kbd>Delete / Backspace</kbd>
          <span>Delete Selected Shape</span>
        </div>
        <div class="shortcut-item">
          <kbd>Ctrl/Cmd + S</kbd>
          <span>Save</span>
        </div>
        <div class="shortcut-item">
          <kbd>Esc</kbd>
          <span>Deselect Shape</span>
        </div>
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
            @shape-select="onLayerShapeSelect"
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
          :canvas-boundary="canvasBoundary"
          :canvas-background="canvasBackground"
          :update-trigger="shapeUpdateTrigger"
          @shape-select="onShapeSelect"
          @shape-update="onShapeUpdate"
          @shape-drop="onShapeDrop"
          @canvas-click="onCanvasClick"
          @zoom-change="onZoomChange"
          @mouse-move="onMouseMove"
        />
        
        <!-- Status bar -->
        <div class="status-bar">
          <div class="status-item">
            <span class="status-label">X:</span>
            <span class="status-value">{{ mouseX }}</span>
          </div>
          <div class="status-separator">|</div>
          <div class="status-item">
            <span class="status-label">Y:</span>
            <span class="status-value">{{ mouseY }}</span>
          </div>
          <div class="status-separator">|</div>
          <div class="status-item">
            <span class="status-label">Zoom:</span>
            <span class="status-value">{{ currentZoom.toFixed(2) }}</span>
          </div>
          <div class="status-separator">|</div>
          <div class="status-item">
            <span class="status-label">Shapes:</span>
            <span class="status-value">{{ currentModel.getShapes().length }}</span>
          </div>
          <div v-if="selectedShapeIndex !== null" class="status-separator">|</div>
          <div v-if="selectedShapeIndex !== null" class="status-item">
            <span class="status-label">Selected:</span>
            <span class="status-value">{{ selectedShape?.constructor.name || 'None' }}</span>
          </div>
        </div>
      </div>
      
      <!-- Right sidebar - Properties, Callbacks, Notifications -->
      <div class="sidebar sidebar-right">
        <div class="sidebar-tabs">
          <button 
            class="tab-button" 
            :class="{ active: rightSidebarTab === 'properties' }"
            @click="rightSidebarTab = 'properties'"
          >
            <span class="tab-icon">⚙️</span>
            Properties
          </button>
          <button 
            class="tab-button" 
            :class="{ active: rightSidebarTab === 'callbacks' }"
            @click="rightSidebarTab = 'callbacks'"
          >
            <span class="tab-icon">⚡</span>
            Callbacks
          </button>
          <button 
            class="tab-button" 
            :class="{ active: rightSidebarTab === 'notifications' }"
            @click="rightSidebarTab = 'notifications'"
          >
            <span class="tab-icon">📡</span>
            Notifications
          </button>
        </div>
        
        <div class="tab-content">
          <PropertiesPanel
            v-if="rightSidebarTab === 'properties'"
            :selected-shape="selectedShape"
            :selected-index="selectedShapeIndex"
            :update-trigger="shapeUpdateTrigger"
            @update-property="onPropertyUpdate"
            @delete-shape="onDeleteShape"
          />
          <CallbacksEditor
            v-if="rightSidebarTab === 'callbacks'"
            :selected-shape="selectedShape"
            :selected-index="selectedShapeIndex"
            :update-trigger="shapeUpdateTrigger"
            @update-callbacks="onCallbacksUpdate"
          />
          <NotificationsPanel
            v-if="rightSidebarTab === 'notifications'"
            :faceplate-config="faceplateConfig"
            @update-notifications="onNotificationsUpdate"
          />
        </div>
      </div>
    </div>
    
    <!-- Modals removed - now using separate windows -->
    
    <!-- Toast notifications -->
    <Toast
      v-model:visible="toastVisible"
      :message="toastMessage"
      :type="toastType"
      :duration="3000"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, markRaw, nextTick, onMounted, onBeforeUnmount } from 'vue';
import { Model } from '@/core/canvas/model';
import type { Drawable } from '@/core/canvas/shapes/base';
import type { FaceplateConfig, FaceplateShapeConfig, FaceplateModelConfig, NotificationChannel, UINotificationChannel } from './types';
import { createShape } from '@/core/canvas/shapes';
import ShapePalette from './components/ShapePalette.vue';
import CanvasEditor from './components/CanvasEditor.vue';
import PropertiesPanel from './components/PropertiesPanel.vue';
import LayerPanel from './components/LayerPanel.vue';
import CallbacksEditor from './components/CallbacksEditor.vue';
import NotificationsPanel from './components/NotificationsPanel.vue';
import LoadFaceplateWindow from './components/LoadFaceplateWindow.vue';
import UnsavedChangesWindow from './components/UnsavedChangesWindow.vue';
import ErrorWindow from './components/ErrorWindow.vue';
import Toast from '@/components/Toast.vue';
import type { EntityId } from '@/core/data/types';
import { useDataStore } from '@/stores/data';
import { useWindowStore } from '@/stores/windows';
import { ValueHelpers } from '@/core/data/types';

const props = defineProps<{
  windowId?: string
}>()
const currentModel = ref<Model>(new Model());
const selectedShapeIndex = ref<number | null>(null);
const hasChanges = ref(false);
const errorMessage = ref('');
const errorDetails = ref('');
const pendingAction = ref<(() => void) | null>(null);
const shapeUpdateTrigger = ref(0);
const activeTab = ref<'shapes' | 'layers'>('shapes');

// History management for undo/redo
interface HistoryEntry {
  modelConfig: FaceplateModelConfig;
  selectedIndex: number | null;
  timestamp: number;
}
const history = ref<HistoryEntry[]>([]);
const historyIndex = ref(-1);
const maxHistorySize = 50;

// Status bar state
const mouseX = ref(0);
const mouseY = ref(0);
const currentZoom = ref(0);

// Current faceplate state
const currentFaceplateId = ref<EntityId | null>(null);
const currentFaceplateName = ref<string>('');
const currentFaceplateDescription = ref<string>('');

// Editing state
const isEditingName = ref(false);
const isEditingDescription = ref(false);
const editNameValue = ref('');
const editDescriptionValue = ref('');

// View controls
const showGrid = ref(true);
const snapToGrid = ref(true);
const rightSidebarTab = ref<'properties' | 'callbacks' | 'notifications'>('properties');

// Canvas configuration
const showKeyboardShortcuts = ref(false);
const canvasBoundary = ref({ from: { x: 0, y: 0 }, to: { x: 1000, y: 600 } });
const canvasWidth = ref(1000);
const canvasHeight = ref(600);
const canvasBackground = ref('#1a1a1a');

// Toast notifications
const toastVisible = ref(false);
const toastMessage = ref('');
const toastType = ref<'success' | 'error' | 'info'>('info');

// Toast notifications
function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  toastMessage.value = message;
  toastType.value = type;
  toastVisible.value = true;
}

// History management functions
function saveHistory() {
  // Serialize the current model state
  const modelConfig = modelToConfig(currentModel.value as any);
  
  // If we're not at the end of history, remove all entries after current position
  if (historyIndex.value < history.value.length - 1) {
    history.value = history.value.slice(0, historyIndex.value + 1);
  }
  
  // Add new entry
  history.value.push({
    modelConfig: modelConfig,
    selectedIndex: selectedShapeIndex.value,
    timestamp: Date.now()
  });
  
  // Limit history size
  if (history.value.length > maxHistorySize) {
    history.value.shift();
  } else {
    historyIndex.value++;
  }
}

function undo() {
  if (!canUndo()) return;
  
  historyIndex.value--;
  restoreHistoryEntry(history.value[historyIndex.value]);
  showToast('Undo', 'info');
}

function redo() {
  if (!canRedo()) return;
  
  historyIndex.value++;
  restoreHistoryEntry(history.value[historyIndex.value]);
  showToast('Redo', 'info');
}

function canUndo(): boolean {
  return historyIndex.value > 0;
}

function canRedo(): boolean {
  return historyIndex.value < history.value.length - 1;
}

function restoreHistoryEntry(entry: HistoryEntry) {
  currentModel.value = configToModel(entry.modelConfig);
  selectedShapeIndex.value = entry.selectedIndex;
  
  // Force canvas re-render
  nextTick(() => {
    canvasEditor.value?.renderModel();
  });
}

function cloneModel(model: Model): Model {
  // Serialize and deserialize for deep clone
  const config = modelToConfig(model as any);
  return configToModel(config);
}

function handleKeydown(event: KeyboardEvent) {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const ctrlKey = isMac ? event.metaKey : event.ctrlKey;
  
  // Ctrl/Cmd + S = Save
  if (ctrlKey && event.key === 's') {
    event.preventDefault();
    saveFaceplate();
    return;
  }
  
  // Ctrl/Cmd + Z = Undo
  if (ctrlKey && event.key === 'z' && !event.shiftKey) {
    event.preventDefault();
    undo();
    return;
  }
  
  // Ctrl/Cmd + Shift + Z = Redo
  if (ctrlKey && event.key === 'z' && event.shiftKey) {
    event.preventDefault();
    redo();
    return;
  }
  
  // Ctrl/Cmd + Y = Redo (alternative)
  if (ctrlKey && event.key === 'y') {
    event.preventDefault();
    redo();
    return;
  }
  
  // Escape = Deselect
  if (event.key === 'Escape') {
    if (selectedShapeIndex.value !== null) {
      selectedShapeIndex.value = null;
      event.preventDefault();
    }
    return;
  }
  
  // Delete key = Delete selected shape
  if ((event.key === 'Delete' || event.key === 'Backspace') && selectedShapeIndex.value !== null) {
    // Don't delete if user is typing in an input field
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }
    event.preventDefault();
    handleDeleteShape();
    return;
  }
}

// Status bar update handlers
function onZoomChange(zoom: number) {
  currentZoom.value = zoom;
}

function onMouseMove(x: number, y: number) {
  mouseX.value = x;
  mouseY.value = y;
}

// Inline editing functions
function startEditingName() {
  if (!currentFaceplateId.value) return;
  isEditingName.value = true;
  editNameValue.value = currentFaceplateName.value;
  nextTick(() => {
    const input = nameInput.value as HTMLInputElement;
    if (input) {
      input.focus();
      input.select();
    }
  });
}

function finishEditingName() {
  if (!currentFaceplateId.value || !isEditingName.value) return;
  
  const newName = editNameValue.value.trim();
  if (newName && newName !== currentFaceplateName.value) {
    updateFaceplateName(newName);
  }
  
  isEditingName.value = false;
  editNameValue.value = '';
}

function cancelEditingName() {
  isEditingName.value = false;
  editNameValue.value = '';
}

function startEditingDescription() {
  if (!currentFaceplateId.value) return;
  isEditingDescription.value = true;
  editDescriptionValue.value = currentFaceplateDescription.value;
  nextTick(() => {
    const input = descriptionInput.value as HTMLInputElement;
    if (input) {
      input.focus();
      input.select();
    }
  });
}

function finishEditingDescription() {
  if (!currentFaceplateId.value || !isEditingDescription.value) return;
  
  const newDescription = editDescriptionValue.value.trim();
  if (newDescription !== currentFaceplateDescription.value) {
    updateFaceplateDescription(newDescription);
  }
  
  isEditingDescription.value = false;
  editDescriptionValue.value = '';
}

function cancelEditingDescription() {
  isEditingDescription.value = false;
  editDescriptionValue.value = '';
}

async function updateFaceplateName(newName: string) {
  if (!currentFaceplateId.value) return;
  
  try {
    // Check if the name already exists (excluding current faceplate)
    const uniqueName = await generateUniqueFaceplateName(newName, currentFaceplateId.value);
    
    // Update the name in the store
    const nameField = await dataStore.getFieldType('Name');
    await dataStore.write(
      currentFaceplateId.value,
      [nameField],
      { String: uniqueName },
      null,
      null,
      null,
      null
    );
    
    // Update local state
    currentFaceplateName.value = uniqueName;
    
    // Show warning if name was changed due to conflict
    if (uniqueName !== newName) {
      showToast(`"${newName}" already exists. Renamed to "${uniqueName}".`, 'info');
    }
  } catch (error) {
    console.error('Failed to update faceplate name:', error);
    showError('Failed to update faceplate name', error);
  }
}

async function updateFaceplateDescription(newDescription: string) {
  if (!currentFaceplateId.value) return;
  
  try {
    // Update the description in the store
    const descriptionField = await dataStore.getFieldType('Description');
    await dataStore.write(
      currentFaceplateId.value,
      [descriptionField],
      { String: newDescription },
      null,
      null,
      null,
      null
    );
    
    // Update local state
    currentFaceplateDescription.value = newDescription;
  } catch (error) {
    console.error('Failed to update faceplate description:', error);
    showError('Failed to update faceplate description', error);
  }
}

// Faceplate configuration
const faceplateConfig = ref<FaceplateConfig>({
  model: {
    type: 'Model',
    boundary: {
      from: { x: 0, y: 0 },
      to: { x: 1000, y: 600 }
    },
    shapes: []
  }
});

// Canvas ref
const canvasEditor = ref<InstanceType<typeof CanvasEditor> | null>(null);

// Input refs for inline editing
const nameInput = ref<HTMLInputElement | null>(null);
const descriptionInput = ref<HTMLInputElement | null>(null);

// Data store
const dataStore = useDataStore();

// Window store
const windowStore = useWindowStore();

// Child window tracking for parent-child relationships
const childWindowIds = ref<string[]>([]);

// Computed
const selectedShape = computed((): Drawable | null => {
  if (selectedShapeIndex.value === null) return null;
  return currentModel.value.getShape(selectedShapeIndex.value) || null;
});

const currentConfig = computed((): FaceplateConfig => {
  return {
    ...faceplateConfig.value,
    model: modelToConfig(currentModel.value as any)
  };
});

// File actions
function createNew() {
  if (hasChanges.value) {
    pendingAction.value = () => {
      currentModel.value = new Model();
      selectedShapeIndex.value = null;
      hasChanges.value = false;
      currentFaceplateId.value = null;
      currentFaceplateName.value = '';
      
      // Reset canvas boundary to defaults
      canvasBoundary.value = { from: { x: 0, y: 0 }, to: { x: 1000, y: 600 } };
      canvasWidth.value = 1000;
      canvasHeight.value = 600;
      canvasBackground.value = '#1a1a1a';
      
      history.value = [];
      historyIndex.value = -1;
      saveHistory();
      // Force canvas re-render with reset boundary
      nextTick(() => {
        const editor = canvasEditor.value as any;
        if (editor?.updateBoundary) {
          editor.updateBoundary(canvasBoundary.value.from, canvasBoundary.value.to);
        }
        if (editor?.updateBackground) {
          editor.updateBackground(canvasBackground.value);
        }
        canvasEditor.value?.renderModel();
      });
    };
    openUnsavedChangesWindow();
  } else {
    currentModel.value = new Model();
    selectedShapeIndex.value = null;
    hasChanges.value = false;
    currentFaceplateId.value = null;
    currentFaceplateName.value = '';
    
    // Reset canvas boundary to defaults
    canvasBoundary.value = { from: { x: 0, y: 0 }, to: { x: 1000, y: 600 } };
    canvasWidth.value = 1000;
    canvasHeight.value = 600;
    canvasBackground.value = '#1a1a1a';
    
    history.value = [];
    historyIndex.value = -1;
    saveHistory();
    // Force canvas re-render with reset boundary
    nextTick(() => {
      const editor = canvasEditor.value as any;
      if (editor?.updateBoundary) {
        editor.updateBoundary(canvasBoundary.value.from, canvasBoundary.value.to);
      }
      if (editor?.updateBackground) {
        editor.updateBackground(canvasBackground.value);
      }
      canvasEditor.value?.renderModel();
    });
  }
}

function loadFaceplate() {
  if (hasChanges.value) {
    pendingAction.value = () => {
      openLoadFaceplateWindow();
    };
    openUnsavedChangesWindow();
  } else {
    openLoadFaceplateWindow();
  }
}

function openLoadFaceplateWindow() {
  const window = windowStore.createWindow({
    title: 'Load Faceplate',
    component: markRaw(LoadFaceplateWindow),
    parentId: props.windowId,
    props: {
      windowId: undefined // Will be set after creation
    },
    width: 800,
    height: 600,
    minWidth: 600,
    minHeight: 500,
    onEvent: (event: string, ...args: any[]) => {
      const windowId = args[args.length - 1];
      if (event === 'load') {
        const [config, entityId, name] = args.slice(0, -1);
        onLoadFaceplate(config, entityId, name);
        // Close the window after processing the event
        if (windowId) {
          windowStore.closeWindow(windowId);
        }
      } else if (event === 'close') {
        // Close the window
        if (windowId) {
          windowStore.closeWindow(windowId);
        }
      }
    }
  });
  // Set the window ID in the props after creation
  window.props = { ...window.props, windowId: window.id };
  childWindowIds.value.push(window.id);
}

function saveFaceplate() {
  if (currentFaceplateId.value) {
    // Save to existing faceplate immediately
    saveToExistingFaceplate();
  } else {
    // No current faceplate, create a new one automatically
    createNewFaceplate();
  }
}

async function onLoadFaceplate(config: FaceplateConfig, entityId: EntityId, name: string) {
  try {
    currentModel.value = configToModel(config.model);
    selectedShapeIndex.value = null;
    hasChanges.value = false;
    
    // Set the current faceplate information
    currentFaceplateId.value = entityId;
    currentFaceplateName.value = name;
    
    // Load description
    const descriptionField = await dataStore.getFieldType('Description');
    try {
      const [descriptionValue] = await dataStore.read(entityId, [descriptionField]);
      currentFaceplateDescription.value = ValueHelpers.isString(descriptionValue) ? descriptionValue.String : '';
    } catch (error) {
      currentFaceplateDescription.value = '';
    }
    
    // Restore canvas boundary from config
    if (config.model.boundary) {
      const boundary = config.model.boundary;
      canvasBoundary.value = {
        from: { x: boundary.from.x, y: boundary.from.y },
        to: { x: boundary.to.x, y: boundary.to.y }
      };
      canvasWidth.value = boundary.to.x - boundary.from.x;
      canvasHeight.value = boundary.to.y - boundary.from.y;
      canvasBackground.value = config.model.canvasBackground || '#1a1a1a';
    }
    
    // Clear and initialize history
    history.value = [];
    historyIndex.value = -1;
    saveHistory();
    
    // Force canvas re-render with restored boundary
    nextTick(() => {
      if (canvasEditor.value && config.model.boundary) {
        const editor = canvasEditor.value as any;
        if (editor.updateBoundary) {
          editor.updateBoundary(canvasBoundary.value.from, canvasBoundary.value.to);
        }
        if (editor.updateBackground) {
          editor.updateBackground(canvasBackground.value);
        }
      }
      canvasEditor.value?.renderModel();
    });
  } catch (error) {
    console.error('Failed to load faceplate:', error);
    showError('Failed to load faceplate', error);
  }
}

async function saveToExistingFaceplate() {
  if (!currentFaceplateId.value) return;
  
  try {
    // Write configuration to existing faceplate
    const configField = await dataStore.getFieldType('Configuration');
    await dataStore.write(
      currentFaceplateId.value,
      [configField],
      { String: JSON.stringify(currentConfig.value, null, 2) },
      null,
      null,
      null,
      null
    );
    
    hasChanges.value = false;
    
    showToast('Faceplate saved successfully', 'success');
  } catch (error) {
    console.error('Failed to save faceplate:', error);
    showError('Failed to save faceplate', error);
  }
}

async function generateUniqueFaceplateName(desiredName?: string, excludeEntityId?: EntityId): Promise<string> {
  // Get all existing faceplate names
  const faceplateType = await dataStore.getEntityType('Faceplate');
  const faceplateEntities = await dataStore.findEntities(faceplateType);
  
  const nameField = await dataStore.getFieldType('Name');
  const existingNames = new Set<string>();
  
  for (const entityId of faceplateEntities) {
    // Skip the entity we're excluding (for renaming existing faceplates)
    if (excludeEntityId && entityId === excludeEntityId) continue;
    
    try {
      const [nameValue] = await dataStore.read(entityId, [nameField]);
      if (ValueHelpers.isString(nameValue)) {
        existingNames.add(nameValue.String);
      }
    } catch (error) {
      // Skip entities that can't be read
      console.warn(`Failed to read name for faceplate ${entityId}:`, error);
    }
  }
  
  // If no desired name provided, use "Untitled Faceplate" as base
  const baseName = desiredName || 'Untitled Faceplate';
  
  // Generate unique name starting with the desired/base name
  let counter = 0;
  let candidateName: string;
  
  do {
    candidateName = counter === 0 ? baseName : `${baseName} ${counter}`;
    counter++;
  } while (existingNames.has(candidateName));
  
  return candidateName;
}

async function createNewFaceplate() {
  try {
    // Generate a unique name starting with "Untitled Faceplate"
    const uniqueName = await generateUniqueFaceplateName();
    
    // Find the Faceplate Builder folder to use as parent
    const faceplateBuilderFolderId = await dataStore.resolvePath('QOS/Faceplate Builder');
    
    // Create new faceplate entity
    const faceplateType = await dataStore.getEntityType('Faceplate');
    const entityId = await dataStore.createEntity(faceplateType, faceplateBuilderFolderId, uniqueName);

    // Write configuration
    const configField = await dataStore.getFieldType('Configuration');
    await dataStore.write(
      entityId,
      [configField],
      { String: JSON.stringify(currentConfig.value, null, 2) },
      null,
      null,
      null,
      null
    );

    // Set as current faceplate
    currentFaceplateId.value = entityId;
    currentFaceplateName.value = uniqueName;
    
    hasChanges.value = false;
    
    showToast('Faceplate created and saved successfully', 'success');
  } catch (error) {
    console.error('Failed to create faceplate:', error);
    showError('Failed to create faceplate', error);
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

function fitToView() {
  // Calculate bounding box of all shapes
  const shapes = currentModel.value.getShapes();
  if (shapes.length === 0) {
    resetZoom();
    return;
  }
  
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  
  for (const shape of shapes) {
    const offset = shape.getOffset();
    const shapeAny = shape as any;
    
    // Get shape bounds based on type
    let shapeBounds = { minX: offset.x, minY: offset.y, maxX: offset.x, maxY: offset.y };
    
    if (shapeAny.getRadius) {
      const radius = shapeAny.getRadius();
      shapeBounds = {
        minX: offset.x - radius,
        minY: offset.y - radius,
        maxX: offset.x + radius,
        maxY: offset.y + radius
      };
    } else if (shapeAny.getEdges) {
      const edges = shapeAny.getEdges();
      if (edges.length > 0) {
        const xs = edges.map((e: any) => offset.x + e.x);
        const ys = edges.map((e: any) => offset.y + e.y);
        shapeBounds = {
          minX: Math.min(...xs),
          minY: Math.min(...ys),
          maxX: Math.max(...xs),
          maxY: Math.max(...ys)
        };
      }
    } else if (shapeAny.getWidth && shapeAny.getHeight) {
      const width = shapeAny.getWidth();
      const height = shapeAny.getHeight();
      shapeBounds = {
        minX: offset.x - width / 2,
        minY: offset.y - height / 2,
        maxX: offset.x + width / 2,
        maxY: offset.y + height / 2
      };
    }
    
    minX = Math.min(minX, shapeBounds.minX);
    minY = Math.min(minY, shapeBounds.minY);
    maxX = Math.max(maxX, shapeBounds.maxX);
    maxY = Math.max(maxY, shapeBounds.maxY);
  }
  
  // Add padding
  const padding = 50;
  minX -= padding;
  minY -= padding;
  maxX += padding;
  maxY += padding;
  
  // Calculate center and zoom to fit
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const width = maxX - minX;
  const height = maxY - minY;
  
  // Tell canvas editor to fit this bounds
  if (canvasEditor.value) {
    const editor = canvasEditor.value as any;
    if (editor.fitBounds) {
      editor.fitBounds({ minX, minY, maxX, maxY });
    }
  }
}

// Shape operations
function onShapeDragStart(shapeType: string) {
  // Handled by CanvasEditor
}

function onShapeSelect(index: number) {
  selectedShapeIndex.value = index;
}

function onLayerShapeSelect(index: number) {
  onShapeSelect(index);
  nextTick(() => {
    const editor = canvasEditor.value as any;
    if (editor?.focusOnShape) {
      editor.focusOnShape(index, { zoom: currentZoom.value });
    }
  });
}

function onShapeUpdate() {
  hasChanges.value = true;
  shapeUpdateTrigger.value++;
  saveHistory();
}

function onShapeDrop(shapeType: string, location: { x: number; y: number }) {
  // Create new shape and add to model
  const shape = createDefaultShape(shapeType, location);
  if (shape) {
    currentModel.value.addShape(shape);
    selectedShapeIndex.value = currentModel.value.getShapes().length - 1;
    hasChanges.value = true;
    shapeUpdateTrigger.value++;
    saveHistory();
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
    saveHistory();
  }
}

function onDeleteShape() {
  handleDeleteShape();
}

function handleDeleteShape() {
  if (selectedShapeIndex.value !== null) {
    const shape = currentModel.value.getShape(selectedShapeIndex.value);
    if (shape) {
      currentModel.value.removeShape(shape);
      selectedShapeIndex.value = null;
      canvasEditor.value?.renderModel();
      hasChanges.value = true;
      shapeUpdateTrigger.value++;
      saveHistory();
    }
  }
}

function onCallbacksUpdate(callbacks: { handlers?: Record<string, string>; methods?: Record<string, string>; contextMenu?: Record<string, string> }) {
  if (selectedShape.value) {
    // Apply callbacks to shape
    const shapeAny = selectedShape.value as any;
    
    if (callbacks.handlers && shapeAny.setHandlers) {
      shapeAny.setHandlers(callbacks.handlers);
    }
    if (callbacks.methods && shapeAny.setMethods) {
      shapeAny.setMethods(callbacks.methods);
    }
    if (callbacks.contextMenu && shapeAny.setContextMenu) {
      shapeAny.setContextMenu(callbacks.contextMenu);
    }
    
    hasChanges.value = true;
    shapeUpdateTrigger.value++;
  }
}

function onNotificationsUpdate(notificationChannels: UINotificationChannel[]) {
  // Convert UI channels to NotificationChannel format
  const channels: NotificationChannel[] = notificationChannels.map(uiChannel => ({
    name: uiChannel.name,
    config: uiChannel.type === 'EntityId' ? {
      EntityId: {
        entity_id: uiChannel.entityId || 0,
        field_type: uiChannel.fieldName as any, // Will be converted to FieldType at runtime
        trigger_on_change: uiChannel.triggerOnChange,
        context: uiChannel.contextFields.map((field: string) => field.split('->').map((s: string) => s.trim())) as any
      }
    } : {
      EntityType: {
        entity_type: uiChannel.entityType || '',
        field_type: uiChannel.fieldName as any, // Will be converted to FieldType at runtime
        trigger_on_change: uiChannel.triggerOnChange,
        context: uiChannel.contextFields.map((field: string) => field.split('->').map((s: string) => s.trim())) as any
      }
    } as any,
    callback: uiChannel.callback
  }));

  faceplateConfig.value.notificationChannels = channels;
  hasChanges.value = true;
}

function confirmUnsavedChanges() {
  if (pendingAction.value) {
    pendingAction.value();
    pendingAction.value = null;
  }
}

function cancelUnsavedChanges() {
  pendingAction.value = null;
}

function openUnsavedChangesWindow() {
  const window = windowStore.createWindow({
    title: 'Unsaved Changes',
    component: markRaw(UnsavedChangesWindow),
    parentId: props.windowId,
    props: {
      windowId: undefined, // Will be set after creation
      message: "Do you want to proceed? Your current changes will be lost.",
      confirmText: "Proceed"
    },
    width: 400,
    height: 200,
    minWidth: 350,
    minHeight: 150,
    onEvent: (event: string, ...args: any[]) => {
      const windowId = args[args.length - 1];
      if (event === 'confirm') {
        confirmUnsavedChanges();
        // Close the window after processing
        if (windowId) {
          windowStore.closeWindow(windowId);
        }
      } else if (event === 'cancel') {
        // Just close the window
        if (windowId) {
          windowStore.closeWindow(windowId);
        }
      }
    }
  });
  // Set the window ID in the props after creation
  window.props = { ...window.props, windowId: window.id };
  childWindowIds.value.push(window.id);
}

// Error handling
function showError(message: string, error?: any) {
  const errorDetails = error ? String(error) : '';
  openErrorWindow(message, errorDetails);
}

function openErrorWindow(message: string, details: string) {
  const window = windowStore.createWindow({
    title: 'Error',
    component: markRaw(ErrorWindow),
    parentId: props.windowId,
    props: {
      windowId: undefined, // Will be set after creation
      message,
      details
    },
    width: 500,
    height: 300,
    minWidth: 400,
    minHeight: 200
  });
  // Set the window ID in the props after creation
  window.props = { ...window.props, windowId: window.id };
  childWindowIds.value.push(window.id);
}

// Canvas configuration methods
function updateCanvasSize() {
  if (canvasEditor.value) {
    const editor = canvasEditor.value as any;
    if (editor.updateBoundary) {
      // Calculate current dimensions
      const currentWidth = canvasBoundary.value.to.x - canvasBoundary.value.from.x;
      const currentHeight = canvasBoundary.value.to.y - canvasBoundary.value.from.y;
      
      // Calculate deltas
      const deltaWidth = canvasWidth.value - currentWidth;
      const deltaHeight = canvasHeight.value - currentHeight;
      
      // Adjust boundary maintaining center position
      const newBoundary = {
        from: {
          x: canvasBoundary.value.from.x - deltaWidth / 2,
          y: canvasBoundary.value.from.y - deltaHeight / 2
        },
        to: {
          x: canvasBoundary.value.to.x + deltaWidth / 2,
          y: canvasBoundary.value.to.y + deltaHeight / 2
        }
      };
      
      // Update stored boundary
      canvasBoundary.value = newBoundary;
      
      // Apply to canvas
      editor.updateBoundary(newBoundary.from, newBoundary.to);
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
function generateUniqueId(): string {
  return 'shape_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function createDefaultShape(shapeType: string, location: { x: number; y: number }): Drawable | null {
  const shape = createShape(shapeType);
  
  if (!shape) return null;
  
  shape.setId(generateUniqueId());
  shape.setOffset(location);
  shape.setPivot({ x: 0, y: 0 });
  shape.setScale({ x: 1, y: 1 }); // Ensure scale is 1 for direct property manipulation
  
  // Set default properties based on type
  if (shapeType === 'Circle') {
    (shape as any).setRadius(5.0);
    (shape as any).setFillColor('#00ff88');
    (shape as any).setFillOpacity(0.5);
  } else if (shapeType === 'Polygon') {
    (shape as any).setEdges([
      { x: -4.5, y: -4.5 },
      { x: 4.5, y: -4.5 },
      { x: 0, y: 5.5 }
    ]);
    (shape as any).setFillColor('#0088ff');
    (shape as any).setFillOpacity(0.5);
  } else if (shapeType === 'Polyline') {
    (shape as any).setEdges([
      { x: -5.0, y: 0 },
      { x: 0, y: -3.5 },
      { x: 5.0, y: 0 }
    ]);
    (shape as any).setColor('#ff0088');
    (shape as any).setWeight(4.0);
  } else if (shapeType === 'Text') {
    (shape as any).setText('Text');
    (shape as any).setFontSize('2.8em');
    (shape as any).setWidth(60);
    (shape as any).setHeight(35);
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
  
  if (property === 'id') {
    shape.setId(value);
  } else if (property === 'x' || property === 'y' || property === 'z') {
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
      from: { x: canvasBoundary.value.from.x, y: canvasBoundary.value.from.y },
      to: { x: canvasBoundary.value.to.x, y: canvasBoundary.value.to.y }
    },
    canvasBackground: canvasBackground.value,
    shapes: shapes.map(shapeToConfig)
  };
}

function shapeToConfig(shape: Drawable): FaceplateShapeConfig {
  const config: FaceplateShapeConfig = {
    type: shape.constructor.name,
    id: shape.getId() || undefined,
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
  
  // Add callback properties
  const handlers = shapeAny.getHandlers?.();
  if (handlers && Object.keys(handlers).length > 0) config.handlers = handlers;
  
  const methods = shapeAny.getMethods?.();
  if (methods && Object.keys(methods).length > 0) config.methods = methods;
  
  const contextMenu = shapeAny.getContextMenu?.();
  if (contextMenu && Object.keys(contextMenu).length > 0) config.contextMenu = contextMenu;
  
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
        if (shapeConfig.id) shape.setId(shapeConfig.id);
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
        
        // Restore callback properties
        if (shapeConfig.handlers && shapeAny.setHandlers) {
          shapeAny.setHandlers(shapeConfig.handlers);
        }
        if (shapeConfig.methods && shapeAny.setMethods) {
          shapeAny.setMethods(shapeConfig.methods);
        }
        if (shapeConfig.contextMenu && shapeAny.setContextMenu) {
          shapeAny.setContextMenu(shapeConfig.contextMenu);
        }
        
        model.addShape(shape);
      }
    }
  }
  
  return model;
}

// Lifecycle hooks
onMounted(() => {
  // Register keyboard shortcuts
  window.addEventListener('keydown', handleKeydown);
  
  // Initialize history with first entry
  saveHistory();
});

onBeforeUnmount(() => {
  // Cleanup keyboard shortcuts
  window.removeEventListener('keydown', handleKeydown);
});

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

/* ===== MULTI-ROW TOOLBAR ===== */
.top-toolbar {
  display: flex;
  flex-direction: column;
  background: var(--qui-titlebar-bg, #1e1e1e);
  border-bottom: 1px solid var(--qui-titlebar-border, rgba(255, 255, 255, 0.1));
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
  flex-shrink: 0;
  position: relative;
  z-index: 100;
}

/* ----- ROW STRUCTURE ----- */
.toolbar-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  gap: 16px;
  position: relative;
}

.toolbar-row-primary {
  height: 48px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: linear-gradient(180deg, 
    var(--qui-titlebar-bg, #1e1e1e) 0%, 
    color-mix(in srgb, var(--qui-titlebar-bg, #1e1e1e) 97%, black) 100%
  );
}

.toolbar-row-secondary {
  height: 44px;
  background: color-mix(in srgb, var(--qui-titlebar-bg, #1e1e1e) 95%, black);
}

/* ----- TOOLBAR SECTIONS ----- */
.toolbar-section {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* ===== ROW 1: IDENTITY SECTION ===== */
.toolbar-identity {
  flex: 1 1 auto;
  min-width: 0;
  max-width: 50%;
  gap: 10px;
  overflow: hidden;
}

.faceplate-id {
  flex: 0 0 auto;
  font-family: 'JetBrains Mono', 'Courier New', monospace;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.03em;
  color: var(--qui-accent-color, #00ff88);
  background: rgba(0, 255, 136, 0.12);
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid rgba(0, 255, 136, 0.25);
  box-shadow: 0 1px 3px rgba(0, 255, 136, 0.15);
  white-space: nowrap;
}

.identity-field {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex-shrink: 1;
}

.identity-field-name {
  flex: 1 1 auto;
  min-width: 120px;
}

.identity-field-description {
  flex: 0 1 auto;
  min-width: 100px;
  max-width: 280px;
}

.identity-separator {
  flex: 0 0 auto;
  color: rgba(255, 255, 255, 0.25);
  font-weight: 300;
  font-size: 14px;
  user-select: none;
}

.identity-display {
  min-width: 0;
  overflow: hidden;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid transparent;
  position: relative;
}

.identity-display:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.12);
}

.identity-display:active {
  background: rgba(255, 255, 255, 0.08);
  transform: scale(0.98);
}

.identity-text {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: var(--qui-text-primary, #ffffff);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: -0.01em;
}

.identity-text-muted {
  font-size: 14px;
  font-weight: 400;
  color: var(--qui-text-secondary, #a0a0a0);
}

.identity-placeholder {
  display: block;
  font-size: 15px;
  font-weight: 500;
  color: var(--qui-text-secondary, #666666);
  font-style: italic;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.identity-placeholder-muted {
  font-size: 13px;
  color: var(--qui-text-secondary, #555555);
}

.inline-editor {
  min-width: 0;
  flex: 1 1 auto;
}

.inline-input {
  width: 100%;
  min-width: 0;
  background: var(--qui-bg-primary, #1a1a1a);
  border: 2px solid var(--qui-accent-color, #00ff88);
  border-radius: 6px;
  color: var(--qui-text-primary, #fff);
  font-size: 15px;
  font-weight: 600;
  padding: 6px 10px;
  outline: none;
  box-shadow: 0 0 0 3px rgba(0, 255, 136, 0.15), 
              0 2px 8px rgba(0, 255, 136, 0.2);
  transition: all 0.2s ease;
}

.inline-input:focus {
  box-shadow: 0 0 0 4px rgba(0, 255, 136, 0.25), 
              0 4px 12px rgba(0, 255, 136, 0.3);
}

.inline-input::placeholder {
  color: var(--qui-text-secondary, #888888);
  font-style: italic;
  font-weight: 500;
}

/* ===== ROW 1: ACTIONS SECTION ===== */
.toolbar-actions {
  flex: 0 0 auto;
  gap: 12px;
}

.button-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-compact {
  padding: 7px 12px;
  font-size: 13px;
  gap: 5px;
  min-width: 70px;
}

.btn-label {
  font-weight: 600;
  letter-spacing: 0.01em;
}

/* ===== ROW 2: CANVAS CONFIG ===== */
.toolbar-canvas-config {
  flex: 0 0 auto;
}

.config-group-inline {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 12px;
  border-radius: 8px;
}

.config-item {
  display: flex;
  align-items: center;
  gap: 6px;
  position: relative;
}

.config-item label {
  font-size: 12px;
  font-weight: 600;
  color: var(--qui-text-secondary, #999999);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  min-width: 18px;
}

.config-item input[type="number"] {
  width: 68px;
  height: 24px;
  padding: 2px 8px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 5px;
  background: var(--qui-bg-primary, #1a1a1a);
  color: var(--qui-text-primary, #fff);
  font-size: 13px;
  font-weight: 500;
  font-family: 'JetBrains Mono', monospace;
  transition: all 0.18s ease;
  text-align: center;
}

.config-item input[type="number"]:hover {
  border-color: rgba(255, 255, 255, 0.25);
  background: color-mix(in srgb, var(--qui-bg-primary, #1a1a1a) 95%, white);
}

.config-item input[type="number"]:focus {
  outline: none;
  border-color: var(--qui-accent-color, #00ff88);
  box-shadow: 0 0 0 2px rgba(0, 255, 136, 0.2);
  background: var(--qui-bg-primary, #1a1a1a);
}

.config-item-color input[type="color"] {
  width: 48px;
  height: 24px;
  padding: 2px 8px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 5px;
  background: var(--qui-bg-primary, #1a1a1a);
  cursor: pointer;
  transition: all 0.18s ease;
}

.config-item-color input[type="color"]:hover {
  border-color: var(--qui-accent-color, #00ff88);
  box-shadow: 0 0 0 2px rgba(0, 255, 136, 0.15);
  transform: scale(1.05);
}

/* ===== ROW 2: VIEW CONTROLS ===== */
.toolbar-view-controls {
  flex: 0 0 auto;
}

.button-group-compact {
  gap: 4px;
  padding: 4px;
  border-radius: 8px;
}

.btn-icon {
  width: 34px;
  height: 34px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: transparent;
  color: var(--qui-text-primary, #fff);
  cursor: pointer;
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.1);
}

.btn-icon:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.15);
  transform: translateY(-1px);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.15);
}

.btn-icon:active:not(:disabled) {
  transform: translateY(0) scale(0.95);
  background: rgba(255, 255, 255, 0.08);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
}

.btn-icon.active {
  background: var(--qui-accent-color, #00ff88);
  color: var(--qui-bg-primary, #000);
  border-color: var(--qui-accent-color, #00ff88);
  box-shadow: 0 0 10px rgba(0, 255, 136, 0.4);
}

/* ===== ROW 2: TOGGLES ===== */
.toolbar-toggles {
  flex: 1 1 auto;
  justify-content: flex-end;
  gap: 10px;
}

.checkbox-label {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  user-select: none;
}

.checkbox-label-compact {
  padding: 6px 10px;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  border-radius: 6px;
  transition: all 0.15s ease;
  border: 1px solid transparent;
}

.checkbox-label-compact:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.1);
}

.checkbox-label-compact input[type="checkbox"] {
  width: 17px;
  height: 17px;
  cursor: pointer;
  accent-color: var(--qui-accent-color, #00ff88);
  border-radius: 4px;
}

/* ===== SHARED BUTTON STYLES ===== */
.btn {
  border: none;
  border-radius: 7px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
  position: relative;
  overflow: hidden;
  letter-spacing: 0.01em;
}

.btn::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.25);
  transform: translate(-50%, -50%);
  transition: width 0.4s, height 0.4s;
  pointer-events: none;
}

.btn:active:not(:disabled)::before {
  width: 200px;
  height: 200px;
}

.btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
  filter: grayscale(0.6);
}

.btn-primary {
  background: linear-gradient(135deg, 
    var(--qui-accent-color, #00ff88) 0%, 
    color-mix(in srgb, var(--qui-accent-color, #00ff88) 90%, white) 100%
  );
  color: var(--qui-bg-primary, #000);
  box-shadow: 0 2px 6px rgba(0, 255, 136, 0.25), 
              inset 0 1px 0 rgba(255, 255, 255, 0.3);
  font-weight: 700;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.btn-primary:hover:not(:disabled) {
  background: linear-gradient(135deg, 
    color-mix(in srgb, var(--qui-accent-color, #00ff88) 110%, white) 0%, 
    var(--qui-accent-color, #00ff88) 100%
  );
  box-shadow: 0 4px 14px rgba(0, 255, 136, 0.4), 
              inset 0 1px 0 rgba(255, 255, 255, 0.4);
  transform: translateY(-1px);
}

.btn-primary:active:not(:disabled) {
  transform: translateY(0) scale(0.98);
  box-shadow: 0 1px 4px rgba(0, 255, 136, 0.3), 
              inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.btn-secondary {
  background: linear-gradient(180deg, 
    color-mix(in srgb, var(--qui-bg-secondary, #2a2a2a) 105%, white) 0%, 
    var(--qui-bg-secondary, #2a2a2a) 100%
  );
  color: var(--qui-text-primary, #fff);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3), 
              inset 0 0 0 1px rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.btn-secondary:hover:not(:disabled) {
  background: linear-gradient(180deg, 
    color-mix(in srgb, var(--qui-bg-secondary, #2a2a2a) 110%, white) 0%, 
    color-mix(in srgb, var(--qui-bg-secondary, #2a2a2a) 95%, white) 100%
  );
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4), 
              inset 0 0 0 1px rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.15);
  transform: translateY(-1px);
}

.btn-secondary:active:not(:disabled) {
  transform: translateY(0) scale(0.98);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3), 
              inset 0 0 0 1px rgba(255, 255, 255, 0.08);
}

.icon {
  font-size: 15px;
  line-height: 1;
  opacity: 0.95;
  flex-shrink: 0;
}

.separator {
  width: 1px;
  height: 24px;
  background: linear-gradient(180deg, 
    transparent 0%, 
    rgba(255, 255, 255, 0.18) 50%, 
    transparent 100%
  );
  flex-shrink: 0;
}

/* ===== RESPONSIVE BEHAVIOR ===== */
@media (max-width: 1400px) {
  .toolbar-identity {
    max-width: 45%;
  }
  
  .identity-field-description {
    max-width: 220px;
  }
  
  .btn-label {
    display: none;
  }
  
  .btn-compact {
    min-width: auto;
    padding: 7px 10px;
  }
}

@media (max-width: 1100px) {
  .toolbar-identity {
    max-width: 40%;
  }
  
  .identity-field-description {
    display: none;
  }
}

@media (max-width: 900px) {
  .toolbar-row {
    padding: 0 12px;
    gap: 10px;
  }
  
  .faceplate-id {
    font-size: 10px;
    padding: 3px 7px;
  }
  
  .config-group-inline {
    padding: 4px 8px;
    gap: 8px;
  }
}

/* Shortcuts panel */
.shortcuts-panel {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 12px 20px;
  background: var(--qui-bg-secondary, #2a2a2a);
  border-bottom: 1px solid var(--qui-titlebar-border, rgba(255, 255, 255, 0.1));
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.2);
  flex-shrink: 0;
  flex-wrap: wrap;
}

.shortcuts-header {
  width: 100%;
  margin-bottom: 8px;
}

.shortcuts-header h4 {
  margin: 0;
  font-size: var(--qui-font-size-base, 14px);
  font-weight: var(--qui-font-weight-bold, 600);
  color: var(--qui-text-primary, #fff);
}

.shortcuts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 12px;
  width: 100%;
}

.shortcut-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: var(--qui-bg-primary, #1a1a1a);
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.shortcut-item kbd {
  font-family: monospace;
  font-size: var(--qui-font-size-small, 12px);
  font-weight: var(--qui-font-weight-bold, 600);
  padding: 4px 8px;
  background: var(--qui-bg-secondary, #2a2a2a);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  color: var(--qui-accent-color, #00ff88);
  min-width: 80px;
  text-align: center;
  box-shadow: 0 2px 0 rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.shortcut-item span {
  font-size: var(--qui-font-size-small, 13px);
  color: var(--qui-text-secondary, #aaa);
}

.config-group {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--qui-font-size-small, 13px);
  color: var(--qui-text-primary, #fff);
  flex-shrink: 0;
}

.config-group label {
  font-weight: var(--qui-font-weight-medium, 500);
  min-width: auto;
  color: var(--qui-text-secondary, #aaa);
  white-space: nowrap;
}

.config-group input[type="number"] {
  width: 70px;
  padding: 6px 8px;
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
  width: 50px;
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
  display: flex;
  flex-direction: column;
}

.status-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  background: var(--qui-bg-secondary, #2a2a2a);
  border-top: 1px solid var(--qui-window-border, rgba(255, 255, 255, 0.1));
  font-size: var(--qui-font-size-small, 12px);
  color: var(--qui-text-secondary, #aaa);
  font-family: monospace;
  flex-shrink: 0;
  z-index: 10;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-label {
  color: var(--qui-text-secondary, #888);
  font-weight: var(--qui-font-weight-medium, 500);
}

.status-value {
  color: var(--qui-accent-color, #00ff88);
  font-weight: var(--qui-font-weight-bold, 600);
  min-width: 40px;
  text-align: right;
}

.status-separator {
  color: rgba(255, 255, 255, 0.2);
  user-select: none;
}
</style>
