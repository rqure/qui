<script setup lang="ts">
import { ref, onMounted, watch, computed, nextTick, onUnmounted } from 'vue';
import { useDataStore } from '@/stores/data';
import type { EntityId } from '@/core/data/types';

// Import Vue-Konva instead of direct Konva imports
import VueKonva from 'vue-konva';

// Import editor tools and utility components
import ModelEditorToolbar from './ModelEditorToolbar.vue';
import BindingEditor from './BindingEditor.vue';
import ModelNestedModelSelector from './ModelNestedModelSelector.vue';
import type { ModelConfig, ShapeConfig, BindingConfig } from '../utils/modelTypes';
import { createEmptyModel } from '../utils/modelTypes';
import { saveModelToEntity, loadModelFromEntity } from '../utils/modelStorage';

const props = defineProps<{
  modelId?: EntityId | null;
  isNewModel: boolean;
}>();

const emit = defineEmits<{
  (e: 'model-change'): void;
  (e: 'model-save', modelId: EntityId): void;
}>();

const dataStore = useDataStore();
const loading = ref(true);
const error = ref<string | null>(null);
const stageRef = ref<any>(null);
const layerRef = ref<any>(null);

// Editor state
const model = ref<ModelConfig>(createEmptyModel());
const selectedShape = ref<string | null>(null);
const selectedTool = ref<string>('select');
const isDrawing = ref(false);
const drawingPoints = ref<number[]>([]);
const scale = ref(1);
const position = ref({ x: 0, y: 0 });
const stageSize = ref({ width: 0, height: 0 });
const bindings = ref<Record<string, BindingConfig>>({});
const showBindingEditor = ref(false);
const bindingEditorProps = ref({ shapeId: '', propertyName: '', existingBinding: undefined as BindingConfig | undefined });
const showNestedModelSelector = ref(false);

// Grid and snapping settings
const gridSize = ref(20);
const snapToGrid = ref(true);

// Track change state
const originalModelHash = ref<string>('');
const isModelLoaded = ref(false);

// Computed properties
const canvasStyle = computed(() => {
  return {
    width: '100%',
    height: '100%',
    background: model.value.background || 'transparent'
  };
});

// Load model from server
async function loadModel() {
  loading.value = true;
  error.value = null;

  try {
    if (!props.modelId) {
      if (props.isNewModel) {
        model.value = createEmptyModel();
        loading.value = false;
        isModelLoaded.value = true;
        originalModelHash.value = JSON.stringify(model.value);
      } else {
        loading.value = false;
      }
      return;
    }

    // Use the updated loadModelFromEntity function
    const loadedModel = await loadModelFromEntity(dataStore, props.modelId);
    
    if (loadedModel) {
      model.value = loadedModel;
      
      // Extract bindings from the model
      extractBindings();
      
      // Save original state for change detection
      originalModelHash.value = JSON.stringify(model.value);
    } else {
      error.value = 'Failed to load model configuration';
      model.value = createEmptyModel();
    }

    loading.value = false;
    isModelLoaded.value = true;

  } catch (err) {
    error.value = 'Failed to load model: ' + (err as Error).message;
    loading.value = false;
  }
}

// Extract bindings from the model configuration
function extractBindings() {
  bindings.value = {};
  
  model.value.shapes.forEach(shape => {
    if (!shape.properties) return;
    
    Object.entries(shape.properties).forEach(([propName, propBinding]) => {
      // Check if this is a binding configuration
      if (typeof propBinding === 'object' && propBinding.binding) {
        const bindingConfig = propBinding as any;
        if (bindingConfig.entityId && bindingConfig.fieldName) {
          bindings.value[`${shape.id}:${propName}`] = {
            entityId: bindingConfig.entityId,
            fieldName: bindingConfig.fieldName,
            animation: bindingConfig.animation || 'none'
          };
        }
      }
    });
  });
}

// Save model to server
async function saveModel() {
  try {
    // Use the updated saveModelToEntity function
    // Passing undefined instead of null to fix type error
    const entityId = await saveModelToEntity(dataStore, model.value, props.modelId || undefined);
    
    // Reset change tracking
    originalModelHash.value = JSON.stringify(model.value);
    emit('model-save', entityId);
    
    return entityId;
  } catch (err) {
    error.value = 'Failed to save model: ' + (err as Error).message;
    throw err;
  }
}

// Stage event handlers
const handleStageMouseDown = (e: any) => {
  if (e.target === e.target.getStage()) {
    // Clicked on empty stage area
    selectedShape.value = null;
    
    if (selectedTool.value === 'line' || selectedTool.value === 'arrow') {
      isDrawing.value = true;
      const pos = e.target.getStage().getPointerPosition();
      const x = snapToGrid.value ? Math.round(pos.x / gridSize.value) * gridSize.value : pos.x;
      const y = snapToGrid.value ? Math.round(pos.y / gridSize.value) * gridSize.value : pos.y;
      
      drawingPoints.value = [x, y, x, y];
    } else if (selectedTool.value === 'rect' || selectedTool.value === 'circle') {
      isDrawing.value = true;
      const pos = e.target.getStage().getPointerPosition();
      const x = snapToGrid.value ? Math.round(pos.x / gridSize.value) * gridSize.value : pos.x;
      const y = snapToGrid.value ? Math.round(pos.y / gridSize.value) * gridSize.value : pos.y;
      
      // For rect/circle, startX/Y will be top-left corner
      drawingPoints.value = [x, y, 0, 0]; // x, y, width, height
    } else if (selectedTool.value === 'text') {
      // Create text directly on click
      const pos = e.target.getStage().getPointerPosition();
      const x = snapToGrid.value ? Math.round(pos.x / gridSize.value) * gridSize.value : pos.x;
      const y = snapToGrid.value ? Math.round(pos.y / gridSize.value) * gridSize.value : pos.y;
      
      createNewShape('text', x, y, 150, 30, null, 'Text');
    }
  }
};

const handleStageMouseMove = (e: any) => {
  if (!isDrawing.value) return;
  
  const pos = e.target.getStage().getPointerPosition();
  const x = snapToGrid.value ? Math.round(pos.x / gridSize.value) * gridSize.value : pos.x;
  const y = snapToGrid.value ? Math.round(pos.y / gridSize.value) * gridSize.value : pos.y;
  
  if (selectedTool.value === 'line' || selectedTool.value === 'arrow') {
    drawingPoints.value = [drawingPoints.value[0], drawingPoints.value[1], x, y];
  } else if (selectedTool.value === 'rect' || selectedTool.value === 'circle') {
    // Calculate width and height based on start point and current position
    const width = x - drawingPoints.value[0];
    const height = y - drawingPoints.value[1];
    drawingPoints.value = [drawingPoints.value[0], drawingPoints.value[1], width, height];
  }
};

const handleStageMouseUp = () => {
  if (!isDrawing.value) return;
  
  isDrawing.value = false;
  
  // Create new shape based on the drawing
  if (selectedTool.value === 'line' || selectedTool.value === 'arrow') {
    const points = [...drawingPoints.value];
    createNewShape(selectedTool.value, 0, 0, 0, 0, points);
  } else if (selectedTool.value === 'rect' || selectedTool.value === 'circle') {
    // Check if the shape has positive size
    if (Math.abs(drawingPoints.value[2]) > 5 && Math.abs(drawingPoints.value[3]) > 5) {
      // For rectangle, handle negative width/height by adjusting start position
      let x = drawingPoints.value[0];
      let y = drawingPoints.value[1];
      let width = drawingPoints.value[2];
      let height = drawingPoints.value[3];
      
      // If width is negative, adjust x and make width positive
      if (width < 0) {
        x += width;
        width = Math.abs(width);
      }
      
      // If height is negative, adjust y and make height positive
      if (height < 0) {
        y += height;
        height = Math.abs(height);
      }
      
      createNewShape(selectedTool.value, x, y, width, height);
    }
  }
  
  drawingPoints.value = [];
};

// Create a new shape and add it to the model
function createNewShape(type: string, x: number, y: number, width: number, height: number, points?: number[] | null, text?: string) {
  const shapeId = 'shape_' + Date.now();
  const newShape: ShapeConfig = {
    id: shapeId,
    type,
    x,
    y,
    width: type === 'circle' ? width : width,  // For circle, width is diameter
    height: type !== 'circle' ? height : undefined, // Height only for non-circle
    points: points || undefined,
    fill: model.value.defaultFill || '#ffffff',
    stroke: model.value.defaultStroke || '#000000',
    strokeWidth: 1,
    properties: {}
  };
  
  if (type === 'text' && text) {
    newShape.text = text;
    newShape.fontSize = 18;
    newShape.fontFamily = 'Arial';
  }
  
  model.value.shapes.push(newShape);
  selectedShape.value = shapeId;
  
  // Signal that the model has changed
  emit('model-change');
}

// Add a state for the nested model selector
// Create a new shape with a nested model
function addNestedModel(modelId: EntityId, nestedModel: ModelConfig) {
  const shapeId = 'shape_' + Date.now();
  const newShape: ShapeConfig = {
    id: shapeId,
    type: 'nestedModel',
    x: stageSize.value.width / 2 - nestedModel.width / 2,
    y: stageSize.value.height / 2 - nestedModel.height / 2,
    width: nestedModel.width,
    height: nestedModel.height,
    nestedModelId: modelId,
    properties: {}
  };
  
  model.value.shapes.push(newShape);
  selectedShape.value = shapeId;
  showNestedModelSelector.value = false;
  
  // Signal that the model has changed
  emit('model-change');
}

// Cancel nested model selection
function cancelNestedModelSelection() {
  showNestedModelSelector.value = false;
}

// Show the nested model selector
function openNestedModelSelector() {
  showNestedModelSelector.value = true;
}

// Shape selection and manipulation
const handleShapeClick = (id: string) => {
  if (selectedTool.value === 'select') {
    selectedShape.value = id;
  }
};

const getSelectedShapeIndex = computed(() => {
  if (!selectedShape.value) return -1;
  return model.value.shapes.findIndex(shape => shape.id === selectedShape.value);
});

const getSelectedShapeConfig = computed(() => {
  if (getSelectedShapeIndex.value === -1 || !model.value.shapes) return null;
  return model.value.shapes[getSelectedShapeIndex.value];
});

// Update shape properties
const updateShapeProperty = (property: string, value: any) => {
  if (getSelectedShapeIndex.value === -1) return;
  
  // Create a deep copy of the shape to modify
  const updatedShape = JSON.parse(JSON.stringify(model.value.shapes[getSelectedShapeIndex.value]));
  
  // Update the property
  (updatedShape as any)[property] = value;
  
  // Replace the shape in the model
  model.value.shapes.splice(getSelectedShapeIndex.value, 1, updatedShape);
  
  // Signal that the model has changed
  emit('model-change');
};

// Delete the selected shape
const deleteSelectedShape = () => {
  if (getSelectedShapeIndex.value === -1) return;
  
  // Remove any bindings for this shape
  const shapeId = selectedShape.value;
  if (shapeId) {
    Object.keys(bindings.value).forEach(key => {
      if (key.startsWith(shapeId + ':')) {
        delete bindings.value[key];
      }
    });
  }
  
  model.value.shapes.splice(getSelectedShapeIndex.value, 1);
  selectedShape.value = null;
  
  // Signal that the model has changed
  emit('model-change');
};

// Show binding editor for a property
const openBindingEditor = (property: string) => {
  if (!selectedShape.value) return;
  
  const bindingKey = `${selectedShape.value}:${property}`;
  bindingEditorProps.value = {
    shapeId: selectedShape.value,
    propertyName: property,
    existingBinding: bindings.value[bindingKey]
  };
  
  showBindingEditor.value = true;
};

// Handle binding save
const handleBindingSave = (binding: BindingConfig) => {
  addBinding(bindingEditorProps.value.shapeId, bindingEditorProps.value.propertyName, binding);
  showBindingEditor.value = false;
};

// Handle binding cancel
const handleBindingCancel = () => {
  showBindingEditor.value = false;
};

// Handle binding remove
const handleBindingRemove = () => {
  removeBinding(bindingEditorProps.value.shapeId, bindingEditorProps.value.propertyName);
  showBindingEditor.value = false;
};

// Add a binding to a property
const addBinding = (shapeId: string, property: string, binding: BindingConfig) => {
  bindings.value[`${shapeId}:${property}`] = binding;
  
  // Update the shape's properties to include the binding
  const shapeIndex = model.value.shapes.findIndex(shape => shape.id === shapeId);
  if (shapeIndex !== -1) {
    const updatedShape = JSON.parse(JSON.stringify(model.value.shapes[shapeIndex]));
    updatedShape.properties = updatedShape.properties || {};
    updatedShape.properties[property] = {
      binding: true,
      entityId: binding.entityId,
      fieldName: binding.fieldName,
      animation: binding.animation
    };
    
    model.value.shapes.splice(shapeIndex, 1, updatedShape);
    emit('model-change');
  }
};

// Remove a binding from a property
const removeBinding = (shapeId: string, property: string) => {
  delete bindings.value[`${shapeId}:${property}`];
  
  // Update the shape's properties to remove the binding
  const shapeIndex = model.value.shapes.findIndex(shape => shape.id === shapeId);
  if (shapeIndex !== -1) {
    const updatedShape = JSON.parse(JSON.stringify(model.value.shapes[shapeIndex]));
    if (updatedShape.properties && updatedShape.properties[property]) {
      delete updatedShape.properties[property];
    }
    
    model.value.shapes.splice(shapeIndex, 1, updatedShape);
    emit('model-change');
  }
};

// Zoom and pan functions
const zoomIn = () => {
  if (scale.value < 3) {
    scale.value += 0.1;
  }
};

const zoomOut = () => {
  if (scale.value > 0.5) {
    scale.value -= 0.1;
  }
};

const resetZoom = () => {
  scale.value = 1;
  position.value = { x: 0, y: 0 };
};

// Update model settings
const updateModelSetting = (setting: string, value: any) => {
  (model.value as any)[setting] = value;
  emit('model-change');
};

// Toggle grid visibility
const toggleGrid = () => {
  snapToGrid.value = !snapToGrid.value;
};

// Monitor for changes
watch(
  () => model.value,
  () => {
    if (isModelLoaded.value && JSON.stringify(model.value) !== originalModelHash.value) {
      emit('model-change');
    }
  },
  { deep: true }
);

// Improve resize handler to ensure stage has valid dimensions
const handleResize = () => {
  const container = document.querySelector('.canvas-container');
  if (!container) return;
  
  // Ensure we never set zero dimensions to prevent Konva errors
  const width = Math.max(container.clientWidth, 1);
  const height = Math.max(container.clientHeight, 1);
  
  stageSize.value = {
    width,
    height
  };
  
  // Calculate scale to fit model in viewport if model is loaded
  if (model.value && model.value.width && model.value.height) {
    const scaleX = width / model.value.width;
    const scaleY = height / model.value.height;
    scale.value = Math.min(scaleX, scaleY, 1); // Don't scale up beyond 100%
  }
};

// Initialize the editor with improved timing for size calculation
onMounted(async () => {
  await loadModel();
  
  // Set up resize handler
  window.addEventListener('resize', handleResize);
  
  // Initial size calculation with a small delay to ensure DOM is ready
  nextTick(() => {
    handleResize();
    // Add extra call after a short delay to handle any layout adjustments
    setTimeout(handleResize, 100);
  });
  
  document.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  document.removeEventListener('keydown', handleKeyDown);
});

// Handle key events for shortcuts
const handleKeyDown = (e: KeyboardEvent) => {
  // Delete key to remove selected shape
  if (e.key === 'Delete' && selectedShape.value) {
    deleteSelectedShape();
  }
  
  // Escape key to deselect
  if (e.key === 'Escape') {
    selectedShape.value = null;
    if (isDrawing.value) {
      isDrawing.value = false;
      drawingPoints.value = [];
    }
  }
  
  // Ctrl+S for save
  if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    saveModel();
  }
};

onMounted(() => {
  document.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown);
});

// Update tool selection
const setSelectedTool = (tool: string) => {
  selectedTool.value = tool;
  
  // When switching to a non-drawing tool, cancel any drawing in progress
  if (tool !== 'rect' && tool !== 'circle' && tool !== 'line' && tool !== 'arrow') {
    isDrawing.value = false;
    drawingPoints.value = [];
  }
};

// Fix undefined object error for circle selection indicator
const getCircleSelectionConfig = computed(() => {
  if (!selectedShape.value || getSelectedShapeIndex.value < 0 || !model.value.shapes) {
    return null;
  }
  
  const selectedShapeObj = model.value.shapes[getSelectedShapeIndex.value];
  if (!selectedShapeObj || selectedShapeObj.type !== 'circle' || selectedShapeObj.width === undefined) {
    return null;
  }
  
  return {
    x: selectedShapeObj.x,
    y: selectedShapeObj.y,
    radius: (selectedShapeObj.width / 2) + 5,
    stroke: '#00aaff',
    strokeWidth: 2,
    dash: [5, 5]
  };
});

// Replace unnecessary datastore connection with simple model loading
onMounted(async () => {
  await loadModel();
  
  // Set up resize handler
  window.addEventListener('resize', handleResize);
  
  // Initial size calculation
  nextTick(() => {
    handleResize();
  });
});

defineExpose({
  saveModel
});
</script>

<template>
  <div class="model-editor">
    <div v-if="loading" class="editor-loading">
      <div class="mb-spinner"></div>
      <span>Loading model...</span>
    </div>
    <div v-else-if="error" class="editor-error">
      <div class="error-message">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
          <path fill="#F44336" d="M12,2C17.53,2 22,6.47 22,12C22,17.53 17.53,22 12,22C6.47,22 2,17.53 2,12C2,6.47 6.47,2 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M11,7H13V13H11V7M11,15H13V17H11V15Z" />
        </svg>
        <span>{{ error }}</span>
      </div>
      <button class="retry-button" @click="loadModel">
        <svg class="retry-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
          <path fill="currentColor" d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z" />
          <path fill="currentColor" d="M12,20V22A10,10 0 0,0 22,12H20A8,8 0 0,1 12,20Z" />
        </svg>
        Retry
      </button>
    </div>
    <div v-else class="editor-container">
      <!-- Toolbar with drawing tools -->
      <ModelEditorToolbar 
        :selected-tool="selectedTool"
        @set-tool="setSelectedTool"
        @zoom-in="zoomIn"
        @zoom-out="zoomOut"
        @zoom-reset="resetZoom"
        @delete="selectedShape && deleteSelectedShape()"
        @grid-toggle="toggleGrid"
        @save="saveModel"
      />
      
      <!-- Canvas area with Konva stage -->
      <div class="canvas-container" :style="canvasStyle">
        <div class="grid-overlay" :style="{
          backgroundSize: `${gridSize * scale}px ${gridSize * scale}px`,
          opacity: snapToGrid ? 0.5 : 0
        }"></div>
        
        <!-- Add v-if to prevent rendering with zero dimensions -->
        <template v-if="stageSize.width > 0 && stageSize.height > 0">
          <Stage
            ref="stageRef"
            :config="{
              width: stageSize.width || 1,
              height: stageSize.height || 1,
              scaleX: scale,
              scaleY: scale,
              x: position.x,
              y: position.y,
              draggable: selectedTool === 'pan'
            }"
            @mousedown="handleStageMouseDown"
            @mousemove="handleStageMouseMove"
            @mouseup="handleStageMouseUp"
          >
            <Layer ref="layerRef">
              <!-- Render all shapes from the model -->
              <template v-for="shape in model.shapes" :key="shape.id">
                <!-- Rectangle -->
                <Rect
                  v-if="shape.type === 'rect'"
                  :config="{
                    x: shape.x,
                    y: shape.y,
                    width: shape.width,
                    height: shape.height,
                    fill: shape.fill,
                    stroke: shape.stroke,
                    strokeWidth: shape.strokeWidth,
                    draggable: selectedTool === 'select',
                    id: shape.id,
                    name: shape.id
                  }"
                  @click="handleShapeClick(shape.id)"
                  @tap="handleShapeClick(shape.id)"
                />
                
                <!-- Circle -->
                <Circle
                  v-else-if="shape.type === 'circle'"
                  :config="{
                    x: shape.x,
                    y: shape.y,
                    radius: shape.width ? shape.width / 2 : 25,
                    fill: shape.fill,
                    stroke: shape.stroke,
                    strokeWidth: shape.strokeWidth,
                    draggable: selectedTool === 'select',
                    id: shape.id,
                    name: shape.id
                  }"
                  @click="handleShapeClick(shape.id)"
                  @tap="handleShapeClick(shape.id)"
                />
                
                <!-- Line -->
                <Line
                  v-else-if="shape.type === 'line'"
                  :config="{
                    points: shape.points,
                    stroke: shape.stroke,
                    strokeWidth: shape.strokeWidth,
                    lineCap: 'round',
                    lineJoin: 'round',
                    draggable: selectedTool === 'select',
                    id: shape.id,
                    name: shape.id
                  }"
                  @click="handleShapeClick(shape.id)"
                  @tap="handleShapeClick(shape.id)"
                />
                
                <!-- Arrow -->
                <Arrow
                  v-else-if="shape.type === 'arrow'"
                  :config="{
                    points: shape.points,
                    pointerLength: 10,
                    pointerWidth: 10,
                    fill: shape.stroke,
                    stroke: shape.stroke,
                    strokeWidth: shape.strokeWidth,
                    draggable: selectedTool === 'select',
                    id: shape.id,
                    name: shape.id
                  }"
                  @click="handleShapeClick(shape.id)"
                  @tap="handleShapeClick(shape.id)"
                />
                
                <!-- Text -->
                <KonvaText
                  v-else-if="shape.type === 'text'"
                  :config="{
                    x: shape.x,
                    y: shape.y,
                    text: shape.text || 'Text',
                    fontSize: shape.fontSize || 18,
                    fontFamily: shape.fontFamily || 'Arial',
                    fill: shape.fill || '#ffffff',
                    padding: 5,
                    draggable: selectedTool === 'select',
                    id: shape.id,
                    name: shape.id
                  }"
                  @click="handleShapeClick(shape.id)"
                  @tap="handleShapeClick(shape.id)"
                />
              </template>
              
              <!-- Drawing preview -->
              <template v-if="isDrawing">
                <!-- Line or Arrow preview -->
                <Line
                  v-if="selectedTool === 'line' || selectedTool === 'arrow'"
                  :config="{
                    points: drawingPoints,
                    stroke: model.defaultStroke || '#000000',
                    strokeWidth: 1,
                    lineCap: 'round',
                    lineJoin: 'round'
                  }"
                />
                
                <!-- Rectangle preview -->
                <Rect
                  v-else-if="selectedTool === 'rect'"
                  :config="{
                    x: drawingPoints[0],
                    y: drawingPoints[1],
                    width: drawingPoints[2],
                    height: drawingPoints[3],
                    fill: model.defaultFill || '#ffffff',
                    stroke: model.defaultStroke || '#000000',
                    strokeWidth: 1
                  }"
                />
                
                <!-- Circle preview -->
                <Circle
                  v-else-if="selectedTool === 'circle'"
                  :config="{
                    x: drawingPoints[0] + drawingPoints[2] / 2,
                    y: drawingPoints[1] + drawingPoints[3] / 2,
                    radius: Math.max(Math.abs(drawingPoints[2]), Math.abs(drawingPoints[3])) / 2,
                    fill: model.defaultFill || '#ffffff',
                    stroke: model.defaultStroke || '#000000',
                    strokeWidth: 1
                  }"
                />
              </template>
              
              <!-- Selection indicators -->
              <Rect
                v-if="selectedShape && getSelectedShapeIndex >= 0 && 
                      model.shapes && model.shapes[getSelectedShapeIndex] && 
                      model.shapes[getSelectedShapeIndex].type === 'rect'"
                :config="{
                  x: model.shapes[getSelectedShapeIndex].x - 5,
                  y: model.shapes[getSelectedShapeIndex].y - 5,
                  width: model.shapes[getSelectedShapeIndex].width + 10,
                  height: model.shapes[getSelectedShapeIndex].height + 10,
                  stroke: '#00aaff',
                  strokeWidth: 2,
                  dash: [5, 5]
                }"
              />
              
              <!-- Fix Circle selection indicator by ensuring width property exists -->
              <Circle
                v-if="selectedShape && getSelectedShapeIndex >= 0 && 
                      model.shapes && 
                      model.shapes[getSelectedShapeIndex] && 
                      model.shapes[getSelectedShapeIndex].type === 'circle' && 
                      model.shapes[getSelectedShapeIndex].width !== undefined"
                :config="{
                  x: model.shapes[getSelectedShapeIndex].x,
                  y: model.shapes[getSelectedShapeIndex].y,
                  radius: (model.shapes[getSelectedShapeIndex].width / 2) + 5,
                  stroke: '#00aaff',
                  strokeWidth: 2,
                  dash: [5, 5]
                }"
              />
            </Layer>
          </Stage>
        </template>
        <div v-else class="stage-loading">
          <span>Initializing canvas...</span>
        </div>
      </div>
      
      <!-- Zoom control display -->
      <div class="zoom-display">
        {{ Math.round(scale * 100) }}%
      </div>
      
      <!-- Binding editor modal -->
      <Teleport to="body" v-if="showBindingEditor">
        <div class="modal-overlay">
          <BindingEditor
            :shapeId="bindingEditorProps.shapeId"
            :propertyName="bindingEditorProps.propertyName"
            :existingBinding="bindingEditorProps.existingBinding"
            @save="handleBindingSave"
            @cancel="handleBindingCancel"
            @remove="handleBindingRemove"
          />
        </div>
      </Teleport>
      
      <!-- Nested model selector modal -->
      <Teleport to="body" v-if="showNestedModelSelector">
        <div class="modal-overlay">
          <ModelNestedModelSelector 
            :parent-model-id="modelId"
            @select="addNestedModel"
            @cancel="cancelNestedModelSelection"
          />
        </div>
      </Teleport>
    </div>
  </div>
</template>

<style scoped>
.model-editor {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--qui-bg-primary);
}

.editor-loading, .editor-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 16px;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 8px;
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

.editor-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.canvas-container {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.grid-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-size: 20px 20px;
  background-image: 
    linear-gradient(to right, rgba(255, 255, 255, 0.1) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255, 255, 255, 0.1) 1px, transparent 1px);
  pointer-events: none;
  transition: opacity 0.2s;
}

.zoom-display {
  position: absolute;
  bottom: 16px;
  right: 16px;
  background: var(--qui-bg-secondary);
  border: 1px solid var(--qui-hover-border);
  color: var(--qui-text-primary);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: var(--qui-font-size-small);
  opacity: 0.7;
  transition: opacity 0.2s;
}

.zoom-display:hover {
  opacity: 1;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* New styles for binding editor modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

/* Selection indicator styles */
.selection-handle {
  position: absolute;
  width: 8px;
  height: 8px;
  background: #00aaff;
  border: 1px solid white;
}

.add-nested-model-button {
  position: absolute;
  bottom: 16px;
  left: 16px;
}

.stage-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--qui-text-secondary);
}
</style>
