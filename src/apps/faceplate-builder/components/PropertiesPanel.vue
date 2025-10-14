<template>
  <div class="properties-panel">
    <div class="panel-header">
      <h3>Properties</h3>
    </div>
    
    <div v-if="!selectedShape" class="empty-state">
      <p>No shape selected</p>
      <p class="hint">Click a shape to edit its properties</p>
    </div>
    
    <div v-else class="properties-content">
      <!-- Shape type -->
      <div class="property-section">
        <div class="section-title">Shape Type</div>
        <div class="property-value readonly">{{ shapeTypeName }}</div>
      </div>
      
      <!-- Transform properties -->
      <div class="property-section">
        <div class="section-title">Transform</div>
        
        <div class="property-row">
          <label>X:</label>
          <input 
            type="number" 
            :value="location.x" 
            @input="updateProperty('x', parseFloat(($event.target as HTMLInputElement).value))"
            step="1"
          />
        </div>
        
        <div class="property-row">
          <label>Y:</label>
          <input 
            type="number" 
            :value="location.y" 
            @input="updateProperty('y', parseFloat(($event.target as HTMLInputElement).value))"
            step="1"
          />
        </div>
        
        <div class="property-row">
          <label>Rotation:</label>
          <input 
            type="number" 
            :value="rotation" 
            @input="updateProperty('rotation', parseFloat(($event.target as HTMLInputElement).value))"
            step="1"
            min="0"
            max="360"
          />
          <span class="unit">°</span>
        </div>
      </div>
      
      <!-- Circle properties -->
      <div v-if="shapeTypeName === 'Circle'" class="property-section">
        <div class="section-title">Circle</div>
        
        <div class="property-row">
          <label>Radius:</label>
          <input 
            type="number" 
            :value="circleProps.radius" 
            @input="updateProperty('radius', parseFloat(($event.target as HTMLInputElement).value))"
            step="1"
            min="1"
          />
        </div>
        
        <div class="property-row">
          <label>Fill Color:</label>
          <input 
            type="color" 
            :value="circleProps.fillColor" 
            @input="updateProperty('fillColor', ($event.target as HTMLInputElement).value)"
          />
        </div>
        
        <div class="property-row">
          <label>Opacity:</label>
          <input 
            type="range" 
            :value="circleProps.fillOpacity" 
            @input="updateProperty('fillOpacity', parseFloat(($event.target as HTMLInputElement).value))"
            min="0"
            max="1"
            step="0.1"
          />
          <span class="value-display">{{ (circleProps.fillOpacity * 100).toFixed(0) }}%</span>
        </div>
      </div>
      
      <!-- Polygon properties -->
      <div v-if="shapeTypeName === 'Polygon'" class="property-section">
        <div class="section-title">Polygon</div>
        
        <div class="property-row">
          <label>Fill Color:</label>
          <input 
            type="color" 
            :value="polygonProps.fillColor" 
            @input="updateProperty('fillColor', ($event.target as HTMLInputElement).value)"
          />
        </div>
        
        <div class="property-row">
          <label>Opacity:</label>
          <input 
            type="range" 
            :value="polygonProps.fillOpacity" 
            @input="updateProperty('fillOpacity', parseFloat(($event.target as HTMLInputElement).value))"
            min="0"
            max="1"
            step="0.1"
          />
          <span class="value-display">{{ (polygonProps.fillOpacity * 100).toFixed(0) }}%</span>
        </div>
      </div>
      
      <!-- Polyline properties -->
      <div v-if="shapeTypeName === 'Polyline'" class="property-section">
        <div class="section-title">Polyline</div>
        
        <div class="property-row">
          <label>Color:</label>
          <input 
            type="color" 
            :value="polylineProps.color" 
            @input="updateProperty('color', ($event.target as HTMLInputElement).value)"
          />
        </div>
        
        <div class="property-row">
          <label>Width:</label>
          <input 
            type="number" 
            :value="polylineProps.weight" 
            @input="updateProperty('weight', parseFloat(($event.target as HTMLInputElement).value))"
            step="1"
            min="1"
          />
        </div>
      </div>
      
      <!-- Text properties -->
      <div v-if="shapeTypeName === 'Text'" class="property-section">
        <div class="section-title">Text</div>
        
        <div class="property-row">
          <label>Content:</label>
          <input 
            type="text" 
            :value="textProps.text" 
            @input="updateProperty('text', ($event.target as HTMLInputElement).value)"
          />
        </div>
        
        <div class="property-row">
          <label>Font Size:</label>
          <input 
            type="number" 
            :value="textProps.fontSize" 
            @input="updateProperty('fontSize', parseFloat(($event.target as HTMLInputElement).value))"
            step="1"
            min="8"
          />
          <span class="unit">px</span>
        </div>
        
        <div class="property-row">
          <label>Color:</label>
          <input 
            type="color" 
            :value="textProps.color" 
            @input="updateProperty('color', ($event.target as HTMLInputElement).value)"
          />
        </div>
      </div>
      
      <!-- Actions -->
      <div class="property-section actions-section">
        <button @click="deleteShape" class="btn btn-danger">
          🗑️ Delete Shape
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Drawable } from '@/core/canvas/shapes/base';

const props = defineProps<{
  selectedShape: Drawable | null;
  selectedIndex: number | null;
}>();

const emit = defineEmits<{
  (e: 'update-property', property: string, value: any): void;
  (e: 'delete-shape'): void;
}>();

// Computed properties
const shapeTypeName = computed(() => {
  if (!props.selectedShape) return '';
  return props.selectedShape.constructor.name;
});

const location = computed(() => {
  if (!props.selectedShape) return { x: 0, y: 0 };
  return props.selectedShape.getLocation();
});

const rotation = computed(() => {
  if (!props.selectedShape) return 0;
  return props.selectedShape.getRotation();
});

const circleProps = computed(() => {
  if (!props.selectedShape) return { radius: 50, fillColor: '#00ff88', fillOpacity: 0.5 };
  const shape = props.selectedShape as any;
  return {
    radius: shape.getRadius?.() ?? 50,
    fillColor: shape.getFillColor?.() ?? '#00ff88',
    fillOpacity: shape.getFillOpacity?.() ?? 0.5
  };
});

const polygonProps = computed(() => {
  if (!props.selectedShape) return { fillColor: '#0088ff', fillOpacity: 0.5 };
  const shape = props.selectedShape as any;
  return {
    fillColor: shape.getFillColor?.() ?? '#0088ff',
    fillOpacity: shape.getFillOpacity?.() ?? 0.5
  };
});

const polylineProps = computed(() => {
  if (!props.selectedShape) return { color: '#ff0088', weight: 3 };
  const shape = props.selectedShape as any;
  return {
    color: shape.getColor?.() ?? '#ff0088',
    weight: shape.getWeight?.() ?? 3
  };
});

const textProps = computed(() => {
  if (!props.selectedShape) return { text: 'Text', fontSize: 16, color: '#ffffff' };
  const shape = props.selectedShape as any;
  return {
    text: shape.getText?.() ?? 'Text',
    fontSize: shape.getFontSize?.() ?? 16,
    color: shape.getColor?.() ?? '#ffffff'
  };
});

// Methods
function updateProperty(property: string, value: any) {
  emit('update-property', property, value);
}

function deleteShape() {
  if (confirm('Delete this shape?')) {
    emit('delete-shape');
  }
}
</script>

<style scoped>
.properties-panel {
  padding: 16px;
  overflow-y: auto;
}

.panel-header {
  margin-bottom: 16px;
}

.panel-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--qui-color-text);
}

.empty-state {
  padding: 32px 16px;
  text-align: center;
  color: var(--qui-color-text-secondary);
}

.empty-state p {
  margin: 0 0 8px 0;
}

.hint {
  font-size: 12px;
  opacity: 0.7;
}

.properties-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.property-section {
  border-bottom: 1px solid var(--qui-color-border);
  padding-bottom: 16px;
}

.property-section:last-child {
  border-bottom: none;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--qui-color-text);
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  opacity: 0.8;
}

.property-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.property-row:last-child {
  margin-bottom: 0;
}

.property-row label {
  flex: 0 0 80px;
  font-size: 13px;
  color: var(--qui-color-text);
}

.property-row input[type="number"],
.property-row input[type="text"] {
  flex: 1;
  padding: 6px 8px;
  background: var(--qui-color-background);
  border: 1px solid var(--qui-color-border);
  border-radius: 4px;
  color: var(--qui-color-text);
  font-size: 13px;
}

.property-row input[type="color"] {
  width: 50px;
  height: 30px;
  padding: 2px;
  background: var(--qui-color-background);
  border: 1px solid var(--qui-color-border);
  border-radius: 4px;
  cursor: pointer;
}

.property-row input[type="range"] {
  flex: 1;
}

.unit,
.value-display {
  font-size: 12px;
  color: var(--qui-color-text-secondary);
  flex: 0 0 auto;
}

.value-display {
  width: 40px;
  text-align: right;
}

.property-value {
  padding: 8px;
  background: var(--qui-color-background);
  border: 1px solid var(--qui-color-border);
  border-radius: 4px;
  color: var(--qui-color-text);
  font-size: 13px;
  font-family: monospace;
}

.property-value.readonly {
  opacity: 0.7;
}

.actions-section {
  padding-top: 8px;
}

.btn {
  width: 100%;
  padding: 10px 16px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: background 0.2s;
}

.btn-danger {
  background: #d32f2f;
  color: white;
}

.btn-danger:hover {
  background: #b71c1c;
}
</style>
