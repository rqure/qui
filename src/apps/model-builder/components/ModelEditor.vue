<script setup lang="ts">
import { ref, onMounted, watch, computed, nextTick, onUnmounted } from 'vue';
import { useDataStore } from '@/stores/data';
import type { EntityId } from '@/core/data/types';

import ModelEditorToolbar from './ModelEditorToolbar.vue';
import type { ModelConfig, ShapeConfig } from '../utils/modelTypes';
import { createShapeConfig, getSnappedPoint, finalizeShape } from '../services/drawingService';
import { createEmptyModel } from '../utils/modelTypes';

const props = defineProps<{
  modelId?: EntityId;
}>();

const emit = defineEmits<{
  (e: 'model-change'): void;
}>();

// State
const loading = ref(true);
const error = ref<string | null>(null);
const model = ref<ModelConfig>(createEmptyModel());
const selectedTool = ref('select');
const selectedShape = ref<string | null>(null);
const isDrawing = ref(false);
const drawingPoints = ref<number[]>([]);

// Container and sizing
const canvasContainer = ref<HTMLElement>();
const containerSize = ref({ width: 800, height: 600 });

// Use computed for stage config to make it reactive
const stageConfig = computed(() => ({
  width: containerSize.value.width,
  height: containerSize.value.height,
  draggable: selectedTool.value === 'pan'
}));

// Simple resize handler using ResizeObserver
let resizeObserver: ResizeObserver | null = null;

const updateContainerSize = () => {
  if (canvasContainer.value) {
    const rect = canvasContainer.value.getBoundingClientRect();
    containerSize.value = {
      width: Math.max(rect.width, 400),
      height: Math.max(rect.height, 300)
    };
  }
};

// Event handlers - simplified and clean
const handleStageMouseDown = (e: any) => {
  const stage = e.target.getStage();
  if (!stage) return;
  
  const pos = stage.getPointerPosition();
  if (!pos) return;
  
  const snappedPos = getSnappedPoint(pos.x, pos.y, 20, true);
  const clickedOnEmpty = e.target === stage || e.target.name() === 'background';
  
  if (clickedOnEmpty && selectedTool.value === 'select') {
    selectedShape.value = null;
    return;
  }
  
  if (clickedOnEmpty && ['rect', 'circle', 'line', 'arrow'].includes(selectedTool.value)) {
    isDrawing.value = true;
    drawingPoints.value = [snappedPos.x, snappedPos.y, snappedPos.x, snappedPos.y];
  }
  
  if (clickedOnEmpty && selectedTool.value === 'text') {
    const textShape = createShapeConfig('text', snappedPos.x, snappedPos.y, 0, 0, '#ffffff', '#00ccff', null, 'New Text');
    model.value.shapes.push(textShape);
    selectedShape.value = textShape.id;
    emit('model-change');
  }
};

const handleStageMouseMove = (e: any) => {
  if (!isDrawing.value) return;
  
  const stage = e.target.getStage();
  const pos = stage?.getPointerPosition();
  if (!pos) return;
  
  const snappedPos = getSnappedPoint(pos.x, pos.y, 20, true);
  drawingPoints.value = [
    drawingPoints.value[0],
    drawingPoints.value[1],
    snappedPos.x,
    snappedPos.y
  ];
};

const handleStageMouseUp = () => {
  if (!isDrawing.value) return;
  
  const shape = finalizeShape(
    selectedTool.value,
    drawingPoints.value,
    '#ffffff',
    '#00ccff'
  );
  
  if (shape) {
    model.value.shapes.push(shape);
    selectedShape.value = shape.id;
    emit('model-change');
  }
  
  isDrawing.value = false;
  drawingPoints.value = [];
  selectedTool.value = 'select';
};

const handleShapeClick = (shapeId: string) => {
  if (selectedTool.value === 'select') {
    selectedShape.value = shapeId;
  }
};

// Toolbar handlers
const setSelectedTool = (tool: string) => {
  selectedTool.value = tool;
};

const testClick = () => {
  const testCircle = createShapeConfig('circle', 100, 100, 50, 50, '#ff0000', '#ffffff');
  model.value.shapes.push(testCircle);
  emit('model-change');
};

const deleteSelectedShape = () => {
  if (selectedShape.value) {
    const index = model.value.shapes.findIndex(s => s.id === selectedShape.value);
    if (index !== -1) {
      model.value.shapes.splice(index, 1);
      selectedShape.value = null;
      emit('model-change');
    }
  }
};

// Lifecycle
onMounted(async () => {
  updateContainerSize();
  
  if (canvasContainer.value) {
    resizeObserver = new ResizeObserver(updateContainerSize);
    resizeObserver.observe(canvasContainer.value);
  }
  
  if (props.modelId) {
    // Load model logic here
  } else {
    model.value = createEmptyModel();
  }
  
  loading.value = false;
});

onUnmounted(() => {
  resizeObserver?.disconnect();
});
</script>

<template>
  <div class="model-editor">
    <!-- Debug info -->
    <div class="debug-info">
      <div>Tool: {{ selectedTool }}</div>
      <div>Drawing: {{ isDrawing }}</div>
      <div>Size: {{ containerSize.width }}x{{ containerSize.height }}</div>
      <div>Shapes: {{ model.shapes.length }}</div>
    </div>

    <!-- Test button -->
    <button @click="testClick" class="test-button">Add Test Circle</button>
    
    <div v-if="loading" class="loading">Loading...</div>
    
    <div v-else class="editor-container">
      <ModelEditorToolbar
        :selected-tool="selectedTool"
        @set-tool="setSelectedTool"
        @delete="deleteSelectedShape"
      />
      
      <div ref="canvasContainer" class="canvas-container">
        <v-stage
          :config="stageConfig"
          @mousedown="handleStageMouseDown"
          @mousemove="handleStageMouseMove"
          @mouseup="handleStageMouseUp"
        >
          <v-layer>
            <!-- Background -->
            <v-rect
              :config="{
                x: 0,
                y: 0,
                width: containerSize.width,
                height: containerSize.height,
                fill: 'transparent',
                name: 'background'
              }"
            />
            
            <!-- Model area -->
            <v-rect
              :config="{
                x: 0,
                y: 0,
                width: model.width || 800,
                height: model.height || 600,
                fill: model.background || '#1e1e1e',
                stroke: '#444'
              }"
            />
            
            <!-- Shapes -->
            <template v-for="shape in model.shapes" :key="shape.id">
              <v-circle
                v-if="shape.type === 'circle'"
                :config="{
                  x: shape.x,
                  y: shape.y,
                  radius: (shape.width || 50) / 2,
                  fill: shape.fill || '#ffffff',
                  stroke: shape.stroke || '#00ccff',
                  strokeWidth: 2,
                  draggable: selectedTool === 'select'
                }"
                @click="handleShapeClick(shape.id)"
              />
              
              <v-rect
                v-if="shape.type === 'rect'"
                :config="{
                  x: shape.x,
                  y: shape.y,
                  width: shape.width,
                  height: shape.height,
                  fill: shape.fill || '#ffffff',
                  stroke: shape.stroke || '#00ccff',
                  strokeWidth: 2,
                  draggable: selectedTool === 'select'
                }"
                @click="handleShapeClick(shape.id)"
              />
            </template>
            
            <!-- Drawing preview -->
            <v-circle
              v-if="isDrawing && selectedTool === 'circle' && drawingPoints.length >= 4"
              :config="{
                x: drawingPoints[0] + (drawingPoints[2] - drawingPoints[0]) / 2,
                y: drawingPoints[1] + (drawingPoints[3] - drawingPoints[1]) / 2,
                radius: Math.max(Math.abs(drawingPoints[2] - drawingPoints[0]), Math.abs(drawingPoints[3] - drawingPoints[1])) / 2,
                stroke: '#00ccff',
                strokeWidth: 2,
                dash: [5, 5],
                fill: 'transparent'
              }"
            />
          </v-layer>
        </v-stage>
      </div>
    </div>
  </div>
</template>

<style scoped>
.model-editor {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.editor-container {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.canvas-container {
  flex: 1;
  background: #2d2d2d;
  overflow: hidden;
}

.debug-info {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 1000;
  background: rgba(0,0,0,0.8);
  color: white;
  padding: 8px;
  border-radius: 4px;
  font-size: 12px;
  font-family: monospace;
}

.test-button {
  position: absolute;
  top: 120px;
  left: 10px;
  z-index: 1000;
  padding: 8px 12px;
  background: #007acc;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: white;
}
</style>