<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { ModelComponent } from './types';
import type { UIModelEntity } from './types';
import { ModelManager } from './services/ModelManager';
import ModelToolbox from './components/ModelToolbox.vue';
import ModelCanvas from './components/ModelCanvas.vue';
import ModelPropertyPanel from './components/ModelPropertyPanel.vue';
import ModelExplorer from './components/ModelExplorer.vue';
import ModelHeader from './components/ModelHeader.vue';

// Component state
const modelManager = new ModelManager();
const models = ref<UIModelEntity[]>([]);
const activeModel = ref<UIModelEntity | null>(null);
const components = ref<ModelComponent[]>([]);
const selectedComponent = ref<ModelComponent | null>(null);
const zoomLevel = ref(100);

// Panel size state
const leftPanelWidth = ref(280);
const rightPanelWidth = ref(300);
const bottomPanelHeight = ref(200);

// Toolbox categories
const toolboxCategories = [
  { id: 'basic', label: 'Basic' },
  { id: 'indicators', label: 'Indicators' },
  { id: 'controls', label: 'Controls' },
  { id: 'charts', label: 'Charts' },
  { id: 'containers', label: 'Containers' }
];

// Load initial data
onMounted(async () => {
  try {
    const loadedModels = await modelManager.loadModels();
    models.value = loadedModels;
  } catch (error) {
    console.error('Failed to load models:', error);
  }
});

// Model management handlers
async function handleCreateModel() {
  try {
    const newModel = await modelManager.createModel('New Model');
    models.value.push(newModel);
    activeModel.value = newModel;
    components.value = [];
  } catch (error) {
    console.error('Failed to create model:', error);
  }
}

async function handleSaveModel() {
  if (!activeModel.value) return;
  try {
    await modelManager.saveModel(activeModel.value);
  } catch (error) {
    console.error('Failed to save model:', error);
  }
}

async function handleSelectModel(modelId: string) {
  try {
    const model = await modelManager.loadModel(modelId);
    activeModel.value = model;
    components.value = model.components || [];
  } catch (error) {
    console.error('Failed to load model:', error);
  }
}

async function handleRenameModel(newName: string) {
  if (!activeModel.value) return;
  activeModel.value.name = newName;
  await handleSaveModel();
}

// Component handlers
function handleAddComponent(componentType: string) {
  const newComponent = modelManager.createComponent(componentType);
  components.value.push(newComponent);
  if (activeModel.value) {
    activeModel.value.components = components.value;
  }
}

function handlePropertyChange(componentId: string, property: string, value: any) {
  const component = components.value.find(c => c.id === componentId);
  if (component) {
    component.properties[property] = value;
    if (activeModel.value) {
      activeModel.value.components = components.value;
    }
  }
}

function handleComponentSelect(component: ModelComponent | null) {
  selectedComponent.value = component;
}

// Resizing state
const isResizing = ref(false);
const resizingPanel = ref<'left' | 'right' | 'bottom' | null>(null);
const startX = ref(0);
const startY = ref(0);
const startWidth = ref(0);
const startHeight = ref(0);

// Start resizing handler
function startResizing(panel: 'left' | 'right' | 'bottom', event: MouseEvent) {
  isResizing.value = true;
  resizingPanel.value = panel;
  startX.value = event.clientX;
  startY.value = event.clientY;
  
  if (panel === 'bottom') {
    startHeight.value = bottomPanelHeight.value;
  } else if (panel === 'left') {
    startWidth.value = leftPanelWidth.value;
  } else {
    startWidth.value = rightPanelWidth.value;
  }

  // Add event listeners
  document.addEventListener('mousemove', handleResizing);
  document.addEventListener('mouseup', stopResizing);
  document.body.style.cursor = panel === 'bottom' ? 'ns-resize' : 'ew-resize';
}

// Handle resizing
function handleResizing(event: MouseEvent) {
  if (!isResizing.value || !resizingPanel.value) return;

  if (resizingPanel.value === 'left') {
    // Calculate width change based on mouse movement from start position
    const deltaX = event.clientX - startX.value;
    const newWidth = Math.min(Math.max(200, startWidth.value + deltaX), 600);
    leftPanelWidth.value = newWidth;
  } else if (resizingPanel.value === 'right') {
    const deltaX = event.clientX - startX.value;
    const newWidth = Math.min(Math.max(200, startWidth.value + deltaX), 600);
    rightPanelWidth.value = newWidth;
  } else {
    const deltaY = startY.value - event.clientY;
    const newHeight = Math.min(Math.max(100, startHeight.value + deltaY), window.innerHeight - 200);
    bottomPanelHeight.value = newHeight;
  }
}

// Stop resizing
function stopResizing() {
  isResizing.value = false;
  resizingPanel.value = null;
  document.removeEventListener('mousemove', handleResizing);
  document.removeEventListener('mouseup', stopResizing);
  document.body.style.cursor = '';
}
</script>

<template>
  <div class="model-builder">
    <ModelHeader
      :active-model="activeModel"
      :available-models="models"
      @create="handleCreateModel"
      @save="handleSaveModel"
      @select="handleSelectModel"
      @rename="handleRenameModel"
    />
    
    <!-- Main layout container -->
    <div class="model-builder-layout">
      <!-- Left panel (Toolbox) -->
      <div class="left-panel" :style="{ width: leftPanelWidth + 'px' }">
        <ModelToolbox
          :categories="toolboxCategories"
          @add-component="handleAddComponent"
        />
        <div 
          class="resize-handle left" 
          @mousedown="startResizing('left', $event)"
          title="Drag to resize"
        ></div>
      </div>

      <!-- Center panel (Canvas) -->
      <div class="main-panel">
        <ModelCanvas
          :components="components"
          :selected-component="selectedComponent"
          :zoom-level="zoomLevel"
          @add-component="handleAddComponent"
          @select-component="handleComponentSelect"
        />
      </div>

      <!-- Right panel (Properties) -->
      <div class="right-panel" :style="{ width: rightPanelWidth + 'px' }">
        <div class="resize-handle right" @mousedown="startResizing('right', $event)"></div>
        <ModelPropertyPanel
          :component="selectedComponent"
          :active-model="activeModel"
          @property-change="handlePropertyChange"
        />
      </div>
    </div>

    <!-- Bottom panel (Explorer) -->
    <div class="bottom-panel" :style="{ height: bottomPanelHeight + 'px' }">
      <div class="resize-handle bottom" @mousedown="startResizing('bottom', $event)"></div>
      <ModelExplorer
        :components="components"
        :selected-component="selectedComponent"
        @select-component="handleComponentSelect"
      />
    </div>
  </div>
</template>

<style scoped>
.model-builder {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background: var(--qui-bg-primary);
}

.model-builder-layout {
  display: flex;
  flex: 1;
  min-height: 0;
  position: relative;
}

.left-panel {
  position: relative;
  min-width: 200px;
  max-width: 400px;
  height: 100%;
  border-right: 1px solid var(--qui-hover-border);
}

.right-panel {
  position: relative;
  height: 100%;
  overflow: hidden;
  background: var(--qui-bg-secondary);
  transition: none;
}

.main-panel {
  flex: 1;
  height: 100%;
  overflow: hidden;
  position: relative;
  min-width: 0;
}

.bottom-panel {
  position: relative;
  width: 100%;
  background: var(--qui-bg-secondary);
  border-top: 1px solid var(--qui-hover-border);
  transition: none;
}

.resize-handle {
  position: absolute;
  z-index: 10;
  transition: background-color 0.2s ease;
}

.resize-handle.left {
  top: 0;
  right: -3px;
  width: 6px;
  height: 100%;
  cursor: ew-resize;
}

.resize-handle.right {
  left: 0;
  top: 0;
  width: 4px;
  height: 100%;
  cursor: ew-resize;
}

.resize-handle.bottom {
  left: 0;
  top: 0;
  width: 100%;
  height: 4px;
  cursor: ns-resize;
}

.resize-handle:hover {
  background: var(--qui-accent-color);
  opacity: 0.2;
}

.resize-handle:active {
  opacity: 0.4;
}
</style>