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
import { createShapeConfig, getSnappedPoint, finalizeShape } from '../services/drawingService';

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
const stageRef = ref();
const layerRef = ref<any>(null);

// Editor state
const model = ref<ModelConfig>(createEmptyModel());
const selectedShape = ref<string | null>(null);
const selectedTool = ref<string>('select');
const isDrawing = ref(false);
const drawingPoints = ref<number[]>([]);
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

const canvasContainer = ref<HTMLElement>();
const stageSize = ref({ width: 800, height: 600 }); // Set default size
const scale = ref(1);
const position = ref({ x: 0, y: 0 });

const updateStageSize = () => {
  if (canvasContainer.value) {
    const rect = canvasContainer.value.getBoundingClientRect();
    const width = Math.max(rect.width, 400);
    const height = Math.max(rect.height, 300);
    
    console.log('Updating stage size:', { width, height, rect });
    
    stageSize.value = { width, height };
    
    // Force update the Konva stage canvas size
    nextTick(() => {
      if (stageRef.value) {
        const stage = stageRef.value.getStage();
        if (stage) {
          stage.width(width);
          stage.height(height);
          stage.batchDraw();
          
          // Also update the canvas element directly
          const canvas = stage.getCanvas()._canvas;
          if (canvas) {
            canvas.style.width = width + 'px';
            canvas.style.height = height + 'px';
            console.log('Canvas updated:', canvas.style.width, canvas.style.height);
          }
        }
      }
    });
  }
};

// Watch for stage size changes and force canvas update
watch(stageSize, (newSize) => {
  console.log('Stage size changed:', newSize);
  nextTick(() => {
    if (stageRef.value) {
      const stage = stageRef.value.getStage();
      if (stage) {
        stage.width(newSize.width);
        stage.height(newSize.height);
        stage.batchDraw();
      }
    }
  });
}, { deep: true });

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

// Complete the mouse down handler with proper event handling
const handleStageMouseDown = (e: any) => {
  console.log('Mouse down event:', e);
  
  // Handle different event structures
  const nativeEvent = e.evt || e;
  if (nativeEvent && nativeEvent.preventDefault) {
    nativeEvent.preventDefault();
    nativeEvent.stopPropagation();
  }
  
  const stage = e.target.getStage();
  if (!stage) {
    console.log('No stage found');
    return;
  }
  
  const pointerPos = stage.getPointerPosition();
  if (!pointerPos) {
    console.log('No pointer position');
    return;
  }
  
  const { x, y } = pointerPos;
  const snappedPoint = getSnappedPoint(x, y, model.value.gridSize || 20, model.value.snapToGrid || false);
  
  console.log('Pointer position:', { x, y, snapped: snappedPoint });
  
  const clickedOnEmpty = e.target === stage || e.target.name() === 'background';
  const isDrawingTool = ['rect', 'circle', 'line', 'arrow', 'text'].includes(selectedTool.value);
  
  console.log('Click analysis:', { clickedOnEmpty, isDrawingTool, tool: selectedTool.value });
  
  if (clickedOnEmpty && selectedTool.value === 'select') {
    selectedShape.value = null;
    return;
  }
  
  if (isDrawingTool && clickedOnEmpty) {
    if (selectedTool.value === 'text') {
      // Create text immediately
      const textShape = createShapeConfig(
        'text',
        snappedPoint.x,
        snappedPoint.y,
        0,
        0,
        '#ffffff',
        model.value.defaultStroke || '#ffffff',
        null,
        'New Text'
      );
      model.value.shapes.push(textShape);
      selectedShape.value = textShape.id;
      console.log('Created text shape:', textShape);
      return;
    } else {
      // Start drawing
      isDrawing.value = true;
      drawingPoints.value = [snappedPoint.x, snappedPoint.y, snappedPoint.x, snappedPoint.y];
      console.log('Started drawing:', { tool: selectedTool.value, points: drawingPoints.value });
    }
  }
};

// Complete the mouse move handler with proper event handling
const handleStageMouseMove = (e: any) => {
  if (!isDrawing.value) return;
  
  const nativeEvent = e.evt || e;
  if (nativeEvent && nativeEvent.preventDefault) {
    nativeEvent.preventDefault();
  }
  
  const stage = e.target.getStage();
  if (!stage) return;
  
  const pointerPos = stage.getPointerPosition();
  if (!pointerPos) return;
  
  const snappedPoint = getSnappedPoint(pointerPos.x, pointerPos.y, model.value.gridSize || 20, model.value.snapToGrid || false);
  
  if (selectedTool.value === 'line' || selectedTool.value === 'arrow') {
    drawingPoints.value = [drawingPoints.value[0], drawingPoints.value[1], snappedPoint.x, snappedPoint.y];
  } else if (selectedTool.value === 'rect' || selectedTool.value === 'circle') {
    drawingPoints.value = [
      drawingPoints.value[0], 
      drawingPoints.value[1], 
      snappedPoint.x, 
      snappedPoint.y
    ];
  }
};

// Complete the mouse up handler with proper event handling
const handleStageMouseUp = (e: any) => {
  console.log('Mouse up event:', { isDrawing: isDrawing.value, tool: selectedTool.value });
  
  if (!isDrawing.value) return;
  
  const nativeEvent = e.evt || e;
  if (nativeEvent && nativeEvent.preventDefault) {
    nativeEvent.preventDefault();
  }
  
  console.log('Finalizing shape with points:', drawingPoints.value);
  
  const shape = finalizeShape(
    selectedTool.value,
    drawingPoints.value,
    model.value.defaultFill || '#ffffff',
    model.value.defaultStroke || '#00ccff'
  );
  
  console.log('Created shape:', shape);
  
  if (shape) {
    model.value.shapes.push(shape);
    selectedShape.value = shape.id;
    console.log('Added shape to model. Total shapes:', model.value.shapes.length);
    emit('model-change');
  } else {
    console.log('Shape creation failed');
  }
  
  isDrawing.value = false;
  drawingPoints.value = [];
  selectedTool.value = 'select';
};

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

// Add this method to force canvas sizing:

const forceCanvasResize = () => {
  nextTick(() => {
    if (stageRef.value && canvasContainer.value) {
      const stage = stageRef.value.getStage();
      const containerRect = canvasContainer.value.getBoundingClientRect();
      
      if (stage && containerRect.width > 0 && containerRect.height > 0) {
        console.log('Force resizing canvas:', containerRect);
        
        // Update stage dimensions
        stage.width(containerRect.width);
        stage.height(containerRect.height);
        
        // Update our reactive size
        stageSize.value = { 
          width: containerRect.width, 
          height: containerRect.height 
        };
        
        // Force redraw
        stage.batchDraw();
        
        // Check the actual canvas element
        const canvasElement = stage.getCanvas()._canvas;
        console.log('Canvas element after resize:', {
          width: canvasElement.width,
          height: canvasElement.height,
          styleWidth: canvasElement.style.width,
          styleHeight: canvasElement.style.height
        });
      }
    }
  });
};

// Call this after mounting and when the stage is created
onMounted(async () => {
  console.log('ModelEditor mounted');
  
  // Initialize stage size
  await nextTick();
  updateStageSize();
  
  // Wait for Vue Konva to create the canvas, then force resize
  setTimeout(() => {
    forceCanvasResize();
  }, 100);
  
  // Set up resize observer
  if (canvasContainer.value) {
    resizeObserver = new ResizeObserver(() => {
      updateStageSize();
      forceCanvasResize();
    });
    resizeObserver.observe(canvasContainer.value);
  }
  
  // Load model if modelId is provided
  if (props.modelId) {
    await loadModel();
  } else {
    // Create empty model
    model.value = createEmptyModel();
    loading.value = false;
  }
});

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
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
    <!-- Debug info -->
    <div class="debug-info" style="position: absolute; top: 10px; left: 10px; z-index: 1000; background: rgba(0,0,0,0.8); color: white; padding: 10px; border-radius: 4px; font-size: 12px;">
      <div>Selected Tool: {{ selectedTool }}</div>
      <div>Is Drawing: {{ isDrawing }}</div>
      <div>Stage Size: {{ stageSize.width }}x{{ stageSize.height }}</div>
      <div>Shapes Count: {{ model?.shapes?.length || 0 }}</div>
    </div>

    <!-- Test button -->
    <button @click="testClick" style="position: absolute; top: 120px; left: 10px; z-index: 1000; padding: 5px; background: #007acc; color: white; border: none; border-radius: 3px;">
      Add Test Circle
    </button>
    
    <!-- Loading state -->
    <div v-if="loading" class="editor-loading">
      <div class="mb-spinner"></div>
      <span>Loading model...</span>
    </div>
    
    <!-- Error state -->
    <div v-else-if="error" class="editor-error">
      <div class="error-message">
        <span>{{ error }}</span>
      </div>
    </div>
    
    <!-- Main editor -->
    <div v-else class="editor-container">
      <!-- Toolbar -->
      <ModelEditorToolbar
        :selected-tool="selectedTool"
        @set-tool="setSelectedTool"
        @zoom-in="zoomIn"
        @zoom-out="zoomOut"
        @zoom-reset="resetZoom"
        @delete="deleteSelectedShape"
        @save="saveModel"
        @grid-toggle="toggleGrid"
      />
      
      <!-- Canvas container with proper ref -->
      <div 
        ref="canvasContainer" 
        class="canvas-container"
        style="width: 100%; height: calc(100vh - 120px); min-height: 400px; position: relative; background: #2d2d2d; overflow: hidden;"
      >
        <!-- Konva Stage with explicit style -->
        <v-stage
          v-if="stageSize.width > 0 && stageSize.height > 0"
          ref="stageRef"
          :config="{
            width: stageSize.width,
            height: stageSize.height,
            scaleX: scale,
            scaleY: scale,
            x: position.x,
            y: position.y,
            draggable: selectedTool === 'pan',
            listening: true
          }"
          :style="{
            width: stageSize.width + 'px',
            height: stageSize.height + 'px',
            display: 'block'
          }"
          @mousedown="handleStageMouseDown"
          @mousemove="handleStageMouseMove"
          @mouseup="handleStageMouseUp"
        >
          <v-layer ref="layerRef">
            <!-- Background rect for stage clicks -->
            <v-rect
              :config="{
                x: -position.x / scale,
                y: -position.y / scale,
                width: (stageSize.width / scale) + Math.abs(position.x / scale),
                height: (stageSize.height / scale) + Math.abs(position.y / scale),
                fill: 'transparent',
                name: 'background'
              }"
            />
            
            <!-- Model canvas area -->
            <v-rect
              :config="{
                x: 0,
                y: 0,
                width: model?.width || 800,
                height: model?.height || 600,
                fill: model?.background || '#1e1e1e',
                stroke: '#444',
                strokeWidth: 1
              }"
            />
            
            <!-- Render existing shapes -->
            <template v-for="shape in (model?.shapes || [])" :key="shape.id">
              <!-- Circle -->
              <v-circle
                v-if="shape.type === 'circle'"
                :config="{
                  id: shape.id,
                  x: shape.x,
                  y: shape.y,
                  radius: shape.width ? shape.width / 2 : 25,
                  fill: shape.fill || '#ffffff',
                  stroke: shape.stroke || '#00ccff',
                  strokeWidth: shape.strokeWidth || 2,
                  draggable: selectedTool === 'select'
                }"
                @click="handleShapeClick(shape.id)"
                @dragend="(e) => handleShapeDrag(shape.id, e)"
              />
              
              <!-- Rectangle -->
              <v-rect
                v-else-if="shape.type === 'rect'"
                :config="{
                  id: shape.id,
                  x: shape.x,
                  y: shape.y,
                  width: shape.width,
                  height: shape.height,
                  fill: shape.fill || '#ffffff',
                  stroke: shape.stroke || '#00ccff',
                  strokeWidth: shape.strokeWidth || 2,
                  draggable: selectedTool === 'select'
                }"
                @click="handleShapeClick(shape.id)"
                @dragend="(e) => handleShapeDrag(shape.id, e)"
              />
              
              <!-- Add other shape types as needed -->
            </template>
            
            <!-- Drawing preview for circle -->
            <v-circle
              v-if="isDrawing && selectedTool === 'circle' && drawingPoints.length >= 4"
              :config="{
                x: drawingPoints[0] + (drawingPoints[2] - drawingPoints[0]) / 2,
                y: drawingPoints[1] + (drawingPoints[3] - drawingPoints[1]) / 2,
                radius: Math.max(Math.abs(drawingPoints[2] - drawingPoints[0]), Math.abs(drawingPoints[3] - drawingPoints[1])) / 2,
                stroke: '#00ccff',
                strokeWidth: 2,
                dash: [5, 5],
                fill: 'transparent',
                listening: false
              }"
            />
          </v-layer>
        </v-stage>
        
        <div v-else class="stage-loading" style="display: flex; align-items: center; justify-content: center; height: 100%; color: white;">
          <span>Initializing canvas... Stage size: {{ stageSize.width }}x{{ stageSize.height }}</span>
        </div>
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

.canvas-container {
  width: 100%;
  height: calc(100vh - 120px);
  min-height: 400px;
  position: relative;
  background: #2d2d2d;
  overflow: hidden;
}

/* Force Konva canvas to respect container size */
.canvas-container :deep(canvas) {
  max-width: 100% !important;
  max-height: 100% !important;
  display: block !important;
}

/* Ensure the Konva container div also respects size */
.canvas-container :deep(.konvajs-content) {
  width: 100% !important;
  height: 100% !important;
}

.debug-info {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 1000;
  background: rgba(0,0,0,0.8);
  color: white;
  padding: 10px;
  border-radius: 4px;
  font-size: 12px;
  font-family: monospace;
}

.editor-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}
</style>