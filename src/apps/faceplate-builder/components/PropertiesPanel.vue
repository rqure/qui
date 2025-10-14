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
  updateTrigger: number;
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
  props.updateTrigger; // dependency
  if (!props.selectedShape) return { x: 0, y: 0 };
  return props.selectedShape.getOffset();
});

const rotation = computed(() => {
  props.updateTrigger; // dependency
  if (!props.selectedShape) return 0;
  return props.selectedShape.getRotation();
});

const circleProps = computed(() => {
  props.updateTrigger; // dependency
  if (!props.selectedShape) return { radius: 50, fillColor: '#00ff88', fillOpacity: 0.5 };
  const shape = props.selectedShape as any;
  return {
    radius: shape.getRadius?.() ?? 50,
    fillColor: shape.getFillColor?.() ?? '#00ff88',
    fillOpacity: shape.getFillOpacity?.() ?? 0.5
  };
});

const polygonProps = computed(() => {
  props.updateTrigger; // dependency
  if (!props.selectedShape) return { fillColor: '#0088ff', fillOpacity: 0.5 };
  const shape = props.selectedShape as any;
  return {
    fillColor: shape.getFillColor?.() ?? '#0088ff',
    fillOpacity: shape.getFillOpacity?.() ?? 0.5
  };
});

const polylineProps = computed(() => {
  props.updateTrigger; // dependency
  if (!props.selectedShape) return { color: '#ff0088', weight: 3 };
  const shape = props.selectedShape as any;
  return {
    color: shape.getColor?.() ?? '#ff0088',
    weight: shape.getWeight?.() ?? 3
  };
});

const textProps = computed(() => {
  props.updateTrigger; // dependency
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
  padding: 20px;
  overflow-y: auto;
  height: 100%;
}

.properties-panel::-webkit-scrollbar {
  width: 8px;
}

.properties-panel::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
}

.properties-panel::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
}

.properties-panel::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

.panel-header {
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 2px solid var(--qui-accent-color, #00ff88);
}

.panel-header h3 {
  margin: 0;
  font-size: var(--qui-font-size-large, 16px);
  font-weight: var(--qui-font-weight-bold, 600);
  color: var(--qui-text-primary, #fff);
  letter-spacing: -0.01em;
}

.empty-state {
  padding: 48px 24px;
  text-align: center;
  color: var(--qui-text-secondary, #aaa);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.empty-state p {
  margin: 0;
  font-size: var(--qui-font-size-base, 14px);
}

.empty-state p:first-child {
  font-size: var(--qui-font-size-large, 16px);
  font-weight: var(--qui-font-weight-medium, 500);
  color: var(--qui-text-primary, #fff);
  opacity: 0.7;
}

.hint {
  font-size: var(--qui-font-size-small, 12px);
  opacity: 0.6;
}

.properties-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.property-section {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 16px;
  transition: all 0.2s ease;
}

.property-section:hover {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.12);
}

.section-title {
  font-size: var(--qui-font-size-small, 12px);
  font-weight: var(--qui-font-weight-bold, 600);
  color: var(--qui-accent-color, #00ff88);
  margin-bottom: 14px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-title::before {
  content: '';
  width: 3px;
  height: 14px;
  background: var(--qui-accent-color, #00ff88);
  border-radius: 2px;
}

.property-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.property-row:last-child {
  margin-bottom: 0;
}

.property-row label {
  flex: 0 0 90px;
  font-size: var(--qui-font-size-small, 13px);
  color: var(--qui-text-secondary, #aaa);
  font-weight: var(--qui-font-weight-medium, 500);
}

.property-row input[type="number"],
.property-row input[type="text"] {
  flex: 1;
  padding: 8px 12px;
  background: var(--qui-bg-primary, #1a1a1a);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 5px;
  color: var(--qui-text-primary, #fff);
  font-size: var(--qui-font-size-small, 13px);
  transition: all 0.15s ease;
  font-family: var(--qui-font-family, 'Segoe UI', sans-serif);
}

.property-row input[type="number"]:focus,
.property-row input[type="text"]:focus {
  outline: none;
  border-color: var(--qui-accent-color, #00ff88);
  box-shadow: 0 0 0 2px rgba(0, 255, 136, 0.2);
  background: color-mix(in srgb, var(--qui-bg-primary, #1a1a1a) 95%, var(--qui-accent-color, #00ff88));
}

.property-row input[type="number"]:hover,
.property-row input[type="text"]:hover {
  border-color: rgba(255, 255, 255, 0.25);
}

.property-row input[type="color"] {
  width: 60px;
  height: 36px;
  padding: 4px;
  background: var(--qui-bg-primary, #1a1a1a);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.property-row input[type="color"]:hover {
  border-color: var(--qui-accent-color, #00ff88);
  box-shadow: 0 0 8px rgba(0, 255, 136, 0.3);
}

.property-row input[type="range"] {
  flex: 1;
  accent-color: var(--qui-accent-color, #00ff88);
  cursor: pointer;
}

.unit,
.value-display {
  font-size: var(--qui-font-size-small, 12px);
  color: var(--qui-text-secondary, #aaa);
  flex: 0 0 auto;
  font-weight: var(--qui-font-weight-medium, 500);
}

.value-display {
  min-width: 45px;
  text-align: right;
  font-family: 'Courier New', monospace;
}

.property-value {
  padding: 10px 12px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 5px;
  color: var(--qui-accent-color, #00ff88);
  font-size: var(--qui-font-size-small, 13px);
  font-family: 'Courier New', monospace;
  letter-spacing: 0.02em;
}

.property-value.readonly {
  opacity: 0.8;
}

.actions-section {
  padding-top: 4px;
  margin-top: 8px;
  background: transparent;
  border: none;
}

.actions-section:hover {
  background: transparent;
}

.btn {
  width: 100%;
  padding: 12px 20px;
  border: none;
  border-radius: 6px;
  font-size: var(--qui-font-size-base, 14px);
  font-weight: var(--qui-font-weight-bold, 600);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.btn::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  transform: translate(-50%, -50%);
  transition: width 0.4s, height 0.4s;
}

.btn:active::before {
  width: 200px;
  height: 200px;
}

.btn-danger {
  background: linear-gradient(135deg, #d32f2f 0%, #b71c1c 100%);
  color: white;
  box-shadow: 0 2px 6px rgba(211, 47, 47, 0.4), 
              inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.btn-danger:hover {
  background: linear-gradient(135deg, #e53935 0%, #c62828 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(211, 47, 47, 0.5), 
              inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

.btn-danger:active {
  transform: translateY(0);
  box-shadow: 0 1px 3px rgba(211, 47, 47, 0.4), 
              inset 0 1px 0 rgba(255, 255, 255, 0.1);
}
</style>
