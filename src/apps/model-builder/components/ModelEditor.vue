<script setup lang="ts">
import { ref, onMounted, watch, computed, nextTick, onUnmounted } from 'vue';
import { useDataStore } from '@/stores/data';
import type { EntityId } from '@/core/data/types';

// Import editor tools and utility components
import ModelEditorToolbar from './ModelEditorToolbar.vue';
import BindingEditor from './BindingEditor.vue';
import ModelNestedModelSelector from './ModelNestedModelSelector.vue';
import type { ModelConfig, ShapeConfig, BindingConfig } from '../utils/modelTypes';
import { createEmptyModel } from '../utils/modelTypes';
import { saveModelToEntity, loadModelFromEntity } from '../utils/modelStorage';
import { getSnappedPoint, createShapeConfig, processDrawingPoints, finalizeShape } from '../services/drawingService';

// Define interfaces for Konva events to fix type errors
interface KonvaTarget {
  getStage(): any;
  name(): string;
  getPointerPosition(): { x: number; y: number };
  attrs: {
    id?: string;
    [key: string]: any;
  };
  x(): number;
  y(): number;
  position(pos: { x: number; y: number }): void;
}

interface KonvaEvent {
  target: KonvaTarget;
  currentTarget: any;
  evt: Event;
  type: string;
  cancelBubble: boolean;
}

// Use generic types instead of specific ones
type KonvaEventWithTarget = KonvaEvent & {
  target: KonvaTarget;
};

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
const handleStageMouseDown = (e: KonvaEventWithTarget) => {
  // Prevent the event from bubbling up
  e.evt.preventDefault();
  e.evt.stopPropagation();
  
  // Get pointer position from the stage
  const stage = e.target.getStage();
  if (!stage) return;
  
  const pointerPos = stage.getPointerPosition();
  if (!pointerPos) return;
  
  // Get the raw x,y coordinates
  const { x, y } = pointerPos;
  
  // Apply snapping if enabled
  const snappedPoint = getSnappedPoint(x, y, gridSize.value, snapToGrid.value);
  
  // Check if we clicked on the stage background or a shape
  const clickedOnEmpty = e.target === stage || e.target.name() === 'background';
  const isDrawingTool = ['rect', 'circle', 'line', 'arrow', 'text'].includes(selectedTool.value);
  
  // Clear selection when clicking on empty area with select tool
  if (clickedOnEmpty && selectedTool.value === 'select') {
    selectedShape.value = null;
    return;
  }
  
  // Start drawing if using a drawing tool and clicked on empty area
  if (isDrawingTool && clickedOnEmpty) {
    if (selectedTool.value === 'text') {
      // Create text directly
      const textShape = createShapeConfig(
        'text', 
        snappedPoint.x, 
        snappedPoint.y, 
        150, 
        30,
        model.value.defaultFill || '#ffffff', 
        model.value.defaultStroke || '#000000', 
        null, 
        'Text'
      );
      
      model.value.shapes.push(textShape);
      selectedShape.value = textShape.id;
      selectedTool.value = 'select';
      emit('model-change');
    } else {
      // Start drawing
      isDrawing.value = true;
      
      // Store starting point for drawing
      if (selectedTool.value === 'line' || selectedTool.value === 'arrow') {
        drawingPoints.value = [snappedPoint.x, snappedPoint.y, snappedPoint.x, snappedPoint.y];
      } else if (selectedTool.value === 'rect' || selectedTool.value === 'circle') {
        drawingPoints.value = [snappedPoint.x, snappedPoint.y, 0, 0];
      }
    }
  }
};

const handleStageMouseMove = (e: KonvaEventWithTarget) => {
  if (!isDrawing.value) return;
  
  e.evt.preventDefault();
  
  // Get the stage and pointer position
  const stage = e.target.getStage();
  if (!stage) return;
  
  const pointerPos = stage.getPointerPosition();
  if (!pointerPos) return;
  
  // Apply snapping if enabled
  const snappedPoint = getSnappedPoint(pointerPos.x, pointerPos.y, gridSize.value, snapToGrid.value);
  
  if (selectedTool.value === 'line' || selectedTool.value === 'arrow') {
    // Update end point of line/arrow
    drawingPoints.value = [
      drawingPoints.value[0], 
      drawingPoints.value[1], 
      snappedPoint.x, 
      snappedPoint.y
    ];
  } else if (selectedTool.value === 'rect' || selectedTool.value === 'circle') {
    // Calculate width and height based on start point and current position
    const width = snappedPoint.x - drawingPoints.value[0];
    const height = snappedPoint.y - drawingPoints.value[1];
    drawingPoints.value = [
      drawingPoints.value[0], 
      drawingPoints.value[1], 
      width, 
      height
    ];
  }
};

const handleStageMouseUp = (e: KonvaEventWithTarget) => {
  if (!isDrawing.value) return;
  
  e.evt.preventDefault();
  
  // Finalize the shape creation
  const shape = finalizeShape(
    selectedTool.value,
    drawingPoints.value,
    model.value.defaultFill || '#ffffff',
    model.value.defaultStroke || '#000000'
  );
  
  // Add the shape to the model if valid
  if (shape) {
    model.value.shapes.push(shape);
    selectedShape.value = shape.id;
    emit('model-change');
  }
  
  // Reset drawing state and switch to select tool
  isDrawing.value = false;
  drawingPoints.value = [];
  selectedTool.value = 'select';
};

// Create a new shape and add it to the model
function createNewShape(type: string, x: number, y: number, width: number, height: number, points?: number[] | null, text?: string) {
  const shapeConfig = createShapeConfig(
    type,
    x, 
    y, 
    width, 
    height,
    model.value.defaultFill || '#ffffff',
    model.value.defaultStroke || '#000000',
    points,
    text
  );
  
  model.value.shapes.push(shapeConfig);
  selectedShape.value = shapeConfig.id;
  
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
const handleShapeClick = (id: string | Event) => {
  if (selectedTool.value === 'select') {
    // Handle both string ID and event object
    if (typeof id === 'string') {
      selectedShape.value = id;
    } else {
      // It's an event - extract shape ID from target
      const evt = id as any;
      if (evt.target && evt.target.attrs && evt.target.attrs.id) {
        selectedShape.value = evt.target.attrs.id;
      }
    }
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

// Modify the handleResize function to ensure stage has valid dimensions
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

// Fix stage reference issue by properly accessing the stage
const getStageNode = () => {
  if (!stageRef.value) return null;
  
  // Safely handle different ways the node might be accessed
  const stage = stageRef.value.getStage?.() || 
                stageRef.value?.getNode?.() || 
                stageRef.value?.$el?.getNode?.() ||
                null;
  
  return stage;
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
    setTimeout(() => {
      handleResize();
    }, 200);
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

// Update tool selection
const setSelectedTool = (tool: string) => {
  console.log('Setting selected tool:', tool);
  selectedTool.value = tool;
  
  // When switching to a non-drawing tool, cancel any drawing in progress
  if (!['rect', 'circle', 'line', 'arrow'].includes(tool)) {
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
        <div 
          class="grid-overlay" 
          :style="{
            backgroundSize: `${gridSize * scale}px ${gridSize * scale}px`,
            opacity: snapToGrid ? 0.5 : 0
          }"
        ></div>
        
        <template v-if="stageSize.width > 0 && stageSize.height > 0">
          <v-stage
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
            @mouseleave="handleStageMouseUp"
            @touchstart="handleStageMouseDown"
            @touchmove="handleStageMouseMove"
            @touchend="handleStageMouseUp"
          >
            <v-layer ref="layerRef">
              <!-- Background rectangle to catch all mouse events -->
              <v-rect
                :config="{
                  x: 0,
                  y: 0,
                  width: model.width || stageSize.width,
                  height: model.height || stageSize.height,
                  fill: model.background || 'transparent',
                  name: 'background'
                }"
              />
              
              <!-- Render all shapes from the model -->
              <template v-for="shape in model.shapes" :key="shape.id">
                <!-- Rectangle -->
                <v-rect
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
                  @click="handleShapeClick"
                  @tap="handleShapeClick"
                  @dragend="(e: KonvaEventWithTarget) => { 
                    updateShapeProperty('x', e.target.x()); 
                    updateShapeProperty('y', e.target.y());
                    emit('model-change');
                  }"
                />
                
                <!-- Circle -->
                <v-circle
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
                  @click="handleShapeClick"
                  @tap="handleShapeClick"
                  @dragend="(e: KonvaEventWithTarget) => { 
                    updateShapeProperty('x', e.target.x()); 
                    updateShapeProperty('y', e.target.y());
                    emit('model-change');
                  }"
                />
                
                <!-- Line -->
                <v-line
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
                  @click="handleShapeClick"
                  @tap="handleShapeClick"
                  @dragend="(e: KonvaEventWithTarget) => { 
                    const oldPoints = shape.points;
                    if (oldPoints) {
                      const dx = e.target.x();
                      const dy = e.target.y();
                      const newPoints = [
                        oldPoints[0] + dx, oldPoints[1] + dy, 
                        oldPoints[2] + dx, oldPoints[3] + dy
                      ];
                      updateShapeProperty('points', newPoints);
                      e.target.position({x: 0, y: 0});
                      emit('model-change');
                    }
                  }"
                />
                
                <!-- Arrow -->
                <v-arrow
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
                  @click="handleShapeClick"
                  @tap="handleShapeClick"
                  @dragend="(e: KonvaEventWithTarget) => { 
                    const oldPoints = shape.points;
                    if (oldPoints) {
                      const dx = e.target.x();
                      const dy = e.target.y();
                      const newPoints = [
                        oldPoints[0] + dx, oldPoints[1] + dy, 
                        oldPoints[2] + dx, oldPoints[3] + dy
                      ];
                      updateShapeProperty('points', newPoints);
                      e.target.position({x: 0, y: 0});
                      emit('model-change');
                    }
                  }"
                />
                
                <!-- Text -->
                <v-text
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
                  @click="handleShapeClick"
                  @tap="handleShapeClick"
                  @dragend="(e: KonvaEventWithTarget) => { 
                    updateShapeProperty('x', e.target.x()); 
                    updateShapeProperty('y', e.target.y());
                    emit('model-change');
                  }"
                />
                
                <!-- ... existing nested model code... -->
              </template>
              
              <!-- Drawing preview - show only when actively drawing -->
              <template v-if="isDrawing">
                <!-- Line preview -->
                <v-line
                  v-if="selectedTool === 'line' && drawingPoints.length === 4"
                  :config="{
                    points: drawingPoints,
                    stroke: model.defaultStroke || '#000000',
                    strokeWidth: 2,
                    lineCap: 'round',
                    lineJoin: 'round'
                  }"
                />
                
                <!-- Arrow preview -->
                <v-arrow
                  v-else-if="selectedTool === 'arrow' && drawingPoints.length === 4"
                  :config="{
                    points: drawingPoints,
                    pointerLength: 10,
                    pointerWidth: 10,
                    fill: model.defaultStroke || '#000000',
                    stroke: model.defaultStroke || '#000000',
                    strokeWidth: 2
                  }"
                />
                
                <!-- Rectangle preview -->
                <v-rect
                  v-else-if="selectedTool === 'rect' && drawingPoints.length === 4"
                  :config="{
                    x: drawingPoints[2] < 0 ? drawingPoints[0] + drawingPoints[2] : drawingPoints[0],
                    y: drawingPoints[3] < 0 ? drawingPoints[1] + drawingPoints[3] : drawingPoints[1],
                    width: Math.abs(drawingPoints[2]),
                    height: Math.abs(drawingPoints[3]),
                    fill: model.defaultFill || '#ffffff',
                    stroke: model.defaultStroke || '#000000',
                    strokeWidth: 2
                  }"
                />
                
                <!-- Circle preview -->
                <v-circle
                  v-else-if="selectedTool === 'circle' && drawingPoints.length === 4"
                  :config="{
                    x: drawingPoints[0] + drawingPoints[2] / 2,
                    y: drawingPoints[1] + drawingPoints[3] / 2,
                    radius: Math.max(Math.abs(drawingPoints[2]), Math.abs(drawingPoints[3])) / 2,
                    fill: model.defaultFill || '#ffffff',
                    stroke: model.defaultStroke || '#000000',
                    strokeWidth: 2
                  }"
                />
              </template>
              
              <!-- Selection indicators -->
              <template v-if="selectedShape && getSelectedShapeConfig">
                <!-- Rectangle selection indicator -->
                <v-rect
                  v-if="getSelectedShapeConfig.type === 'rect'"
                  :config="{
                    x: getSelectedShapeConfig.x - 5,
                    y: getSelectedShapeConfig.y - 5,
                    width: (getSelectedShapeConfig.width || 0) + 10,
                    height: (getSelectedShapeConfig.height || 0) + 10,
                    stroke: '#00aaff',
                    strokeWidth: 2,
                    dash: [5, 5]
                  }"
                />
                
                <!-- Circle selection indicator -->
                <v-circle
                  v-else-if="getSelectedShapeConfig.type === 'circle' && getCircleSelectionConfig"
                  :config="getCircleSelectionConfig"
                />
                
                <!-- Text selection indicator -->
                <v-rect
                  v-else-if="getSelectedShapeConfig.type === 'text'"
                  :config="{
                    x: getSelectedShapeConfig.x - 5,
                    y: getSelectedShapeConfig.y - 5,
                    width: 160, // Approximate text width
                    height: 40, // Approximate text height
                    stroke: '#00aaff',
                    strokeWidth: 2,
                    dash: [5, 5]
                  }"
                />
                
                <!-- Line selection indicator -->
                <v-rect
                  v-else-if="['line', 'arrow'].includes(getSelectedShapeConfig.type) && getSelectedShapeConfig.points"
                  :config="{
                    x: Math.min(getSelectedShapeConfig.points[0], getSelectedShapeConfig.points[2]) - 5,
                    y: Math.min(getSelectedShapeConfig.points[1], getSelectedShapeConfig.points[3]) - 5,
                    width: Math.abs(getSelectedShapeConfig.points[2] - getSelectedShapeConfig.points[0]) + 10,
                    height: Math.abs(getSelectedShapeConfig.points[3] - getSelectedShapeConfig.points[1]) + 10,
                    stroke: '#00aaff',
                    strokeWidth: 2,
                    dash: [5, 5]
                  }"
                />
              </template>
            </v-layer>
          </v-stage>
        </template>
        
        <div v-else class="stage-loading">
          <span>Initializing canvas...</span>
        </div>
        
        <!-- Button to add nested model -->
        <button 
          v-if="selectedTool === 'select'" 
          class="mb-button mb-button-primary add-nested-model-button"
          @click="openNestedModelSelector"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
            <path fill="currentColor" d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" />
          </svg>
          Add Nested Model
        </button>
      </div>
      
      <!-- Status display with drawing information -->
      <div class="status-display">
        Tool: {{ selectedTool }} | Drawing: {{ isDrawing ? 'Yes' : 'No' }} 
        <template v-if="isDrawing && drawingPoints.length > 0">
          | Points: {{ drawingPoints.slice(0,2).join(',') }} → {{ drawingPoints.slice(2).join(',') }}
        </template>
        <template v-else-if="selectedShape && getSelectedShapeConfig">
          | Selected: {{ getSelectedShapeConfig.type }} ({{ getSelectedShapeConfig.id }})
        </template>
      </div>
      
      <!-- Modal for binding editor -->
      <div v-if="showBindingEditor" class="modal-overlay">
        <BindingEditor
          :shapeId="bindingEditorProps.shapeId"
          :propertyName="bindingEditorProps.propertyName"
          :existingBinding="bindingEditorProps.existingBinding"
          @save="handleBindingSave"
          @cancel="handleBindingCancel"
          @remove="handleBindingRemove"
        />
      </div>
      
      <!-- Modal for nested model selector -->
      <div v-if="showNestedModelSelector" class="modal-overlay">
        <ModelNestedModelSelector
          :parentModelId="props.modelId"
          @select="addNestedModel"
          @cancel="cancelNestedModelSelection"
        />
      </div>
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

.status-display {
  position: absolute;
  bottom: 16px;
  left: 16px;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  pointer-events: none;
}
</style>