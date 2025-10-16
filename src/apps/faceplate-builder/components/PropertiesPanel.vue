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
          <label>Z:</label>
          <input 
            type="number" 
            :value="location.z || 0" 
            @input="updateProperty('z', parseFloat(($event.target as HTMLInputElement).value))"
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
        
        <div class="property-row">
          <label>Scale X:</label>
          <input 
            type="number" 
            :value="scale.x" 
            @input="updateProperty('scaleX', parseFloat(($event.target as HTMLInputElement).value))"
            step="0.1"
            min="0.1"
          />
        </div>
        
        <div class="property-row">
          <label>Scale Y:</label>
          <input 
            type="number" 
            :value="scale.y" 
            @input="updateProperty('scaleY', parseFloat(($event.target as HTMLInputElement).value))"
            step="0.1"
            min="0.1"
          />
        </div>
        
        <div class="property-row">
          <label>Scale Z:</label>
          <input 
            type="number" 
            :value="scale.z || 1" 
            @input="updateProperty('scaleZ', parseFloat(($event.target as HTMLInputElement).value))"
            step="0.1"
            min="0.1"
          />
        </div>
      </div>
      
      <!-- Rendering properties -->
      <div class="property-section">
        <div class="section-title">Rendering</div>
        
        <div class="property-row">
          <label>Min Zoom:</label>
          <input 
            type="number" 
            :value="minZoom" 
            @input="updateProperty('minZoom', ($event.target as HTMLInputElement).value === '' ? null : parseFloat(($event.target as HTMLInputElement).value))"
            step="0.1"
            min="0"
            placeholder="None"
          />
        </div>
        
        <div class="property-row">
          <label>Max Zoom:</label>
          <input 
            type="number" 
            :value="maxZoom" 
            @input="updateProperty('maxZoom', ($event.target as HTMLInputElement).value === '' ? null : parseFloat(($event.target as HTMLInputElement).value))"
            step="0.1"
            min="0"
            placeholder="None"
          />
        </div>
        
        <div class="property-row">
          <label>Pane:</label>
          <input 
            type="text" 
            :value="pane?.name || ''" 
            @input="updateProperty('paneName', ($event.target as HTMLInputElement).value)"
            placeholder="Default"
          />
        </div>
        
        <div class="property-row">
          <label>Pane Level:</label>
          <input 
            type="number" 
            :value="pane?.level || 0" 
            @input="updateProperty('paneLevel', parseInt(($event.target as HTMLInputElement).value))"
            step="1"
            min="0"
          />
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
          <label>Stroke Color:</label>
          <input 
            type="color" 
            :value="circleProps.color" 
            @input="updateProperty('color', ($event.target as HTMLInputElement).value)"
          />
        </div>
        
        <div class="property-row">
          <label>Stroke Width:</label>
          <input 
            type="number" 
            :value="circleProps.weight" 
            @input="updateProperty('weight', parseFloat(($event.target as HTMLInputElement).value))"
            step="1"
            min="0"
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
          <label>Stroke Color:</label>
          <input 
            type="color" 
            :value="polygonProps.color" 
            @input="updateProperty('color', ($event.target as HTMLInputElement).value)"
          />
        </div>
        
        <div class="property-row">
          <label>Stroke Width:</label>
          <input 
            type="number" 
            :value="polygonProps.weight" 
            @input="updateProperty('weight', parseFloat(($event.target as HTMLInputElement).value))"
            step="1"
            min="0"
          />
        </div>
        
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
        
        <div class="property-row">
          <label>Vertices:</label>
          <textarea 
            :value="JSON.stringify(polygonProps.edges, null, 2)" 
            @input="updateProperty('edges', JSON.parse(($event.target as HTMLTextAreaElement).value))"
            rows="4"
            placeholder="[{x: 0, y: 0}, {x: 100, y: 0}, {x: 50, y: 100}]"
          ></textarea>
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
        
        <div class="property-row">
          <label>Opacity:</label>
          <input 
            type="range" 
            :value="polylineProps.opacity" 
            @input="updateProperty('opacity', parseFloat(($event.target as HTMLInputElement).value))"
            min="0"
            max="1"
            step="0.1"
          />
          <span class="value-display">{{ (polylineProps.opacity * 100).toFixed(0) }}%</span>
        </div>
        
        <div class="property-row">
          <label>Vertices:</label>
          <textarea 
            :value="JSON.stringify(polylineProps.edges, null, 2)" 
            @input="updateProperty('edges', JSON.parse(($event.target as HTMLTextAreaElement).value))"
            rows="4"
            placeholder="[{x: 0, y: 0}, {x: 100, y: 50}, {x: 200, y: 0}]"
          ></textarea>
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
        
        <div class="property-row">
          <label>Direction:</label>
          <select 
            :value="textProps.direction" 
            @input="updateProperty('direction', ($event.target as HTMLSelectElement).value)"
          >
            <option value="center">Center</option>
            <option value="top">Top</option>
            <option value="bottom">Bottom</option>
            <option value="left">Left</option>
            <option value="right">Right</option>
          </select>
        </div>
        
        <div class="property-row">
          <label>Class:</label>
          <input 
            type="text" 
            :value="textProps.className" 
            @input="updateProperty('className', ($event.target as HTMLInputElement).value)"
            placeholder="custom-text-class"
          />
        </div>
      </div>
      
      <!-- SVG Text properties -->
      <div v-if="shapeTypeName === 'SvgText'" class="property-section">
        <div class="section-title">SVG Text</div>
        
        <div class="property-row">
          <label>Content:</label>
          <input 
            type="text" 
            :value="svgTextProps.text" 
            @input="updateProperty('text', ($event.target as HTMLInputElement).value)"
          />
        </div>
        
        <div class="property-row">
          <label>Font Size:</label>
          <input 
            type="text" 
            :value="svgTextProps.fontSize" 
            @input="updateProperty('fontSize', ($event.target as HTMLInputElement).value)"
          />
        </div>
        
        <div class="property-row">
          <label>Width:</label>
          <input 
            type="number" 
            :value="svgTextProps.width" 
            @input="updateProperty('width', parseFloat(($event.target as HTMLInputElement).value))"
            step="1"
            min="1"
          />
        </div>
        
        <div class="property-row">
          <label>Height:</label>
          <input 
            type="number" 
            :value="svgTextProps.height" 
            @input="updateProperty('height', parseFloat(($event.target as HTMLInputElement).value))"
            step="1"
            min="1"
          />
        </div>
        
        <div class="property-row">
          <label>Fill Color:</label>
          <input 
            type="color" 
            :value="svgTextProps.fillColor" 
            @input="updateProperty('fillColor', ($event.target as HTMLInputElement).value)"
          />
        </div>
      </div>
      
      <!-- Div properties -->
      <div v-if="shapeTypeName === 'Div'" class="property-section">
        <div class="section-title">HTML Div</div>
        
        <div class="property-row">
          <label>HTML:</label>
          <textarea 
            :value="divProps.html" 
            @input="updateProperty('html', ($event.target as HTMLTextAreaElement).value)"
            rows="3"
            placeholder="<div>Hello World</div>"
          ></textarea>
        </div>
        
        <div class="property-row">
          <label>Class:</label>
          <input 
            type="text" 
            :value="divProps.className" 
            @input="updateProperty('className', ($event.target as HTMLInputElement).value)"
            placeholder="my-custom-class"
          />
        </div>
        
        <div class="property-row">
          <label>Width:</label>
          <input 
            type="number" 
            :value="divProps.width" 
            @input="updateProperty('width', parseFloat(($event.target as HTMLInputElement).value))"
            step="1"
            min="1"
          />
        </div>
        
        <div class="property-row">
          <label>Height:</label>
          <input 
            type="number" 
            :value="divProps.height" 
            @input="updateProperty('height', parseFloat(($event.target as HTMLInputElement).value))"
            step="1"
            min="1"
          />
        </div>
        
        <div class="property-row">
          <label>CSS:</label>
          <textarea 
            :value="divProps.css" 
            @input="updateProperty('css', ($event.target as HTMLTextAreaElement).value)"
            rows="4"
            placeholder="@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }&#10;color: red; background: blue; animation: spin 2s infinite;"
          ></textarea>
        </div>
      </div>
      
      <!-- Image Overlay properties -->
      <div v-if="shapeTypeName === 'ImageOverlay'" class="property-section">
        <div class="section-title">Image Overlay</div>
        
        <div class="property-row">
          <label>URL:</label>
          <input 
            type="url" 
            :value="imageProps.url" 
            @input="updateProperty('url', ($event.target as HTMLInputElement).value)"
            placeholder="https://example.com/image.png"
          />
        </div>
        
        <div class="property-row">
          <label>Width:</label>
          <input 
            type="number" 
            :value="imageProps.width" 
            @input="updateProperty('width', parseFloat(($event.target as HTMLInputElement).value))"
            step="1"
            min="1"
          />
        </div>
        
        <div class="property-row">
          <label>Height:</label>
          <input 
            type="number" 
            :value="imageProps.height" 
            @input="updateProperty('height', parseFloat(($event.target as HTMLInputElement).value))"
            step="1"
            min="1"
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
  return props.selectedShape.getRotation() * (180 / Math.PI); // Convert radians to degrees
});

const scale = computed(() => {
  props.updateTrigger; // dependency
  if (!props.selectedShape) return { x: 1, y: 1 };
  return props.selectedShape.getScale();
});

const minZoom = computed(() => {
  props.updateTrigger; // dependency
  if (!props.selectedShape) return null;
  return props.selectedShape.getMinZoom();
});

const maxZoom = computed(() => {
  props.updateTrigger; // dependency
  if (!props.selectedShape) return null;
  return props.selectedShape.getMaxZoom();
});

const pane = computed(() => {
  props.updateTrigger; // dependency
  if (!props.selectedShape) return null;
  return props.selectedShape.getPane();
});

const circleProps = computed(() => {
  props.updateTrigger; // dependency
  if (!props.selectedShape) return { radius: 50, color: '#ff0000', weight: 1, fillColor: '#00ff88', fillOpacity: 0.5 };
  const shape = props.selectedShape as any;
  return {
    radius: shape.getRadius?.() ?? 50,
    color: shape.getColor?.() ?? '#ff0000',
    weight: shape.getWeight?.() ?? 1,
    fillColor: shape.getFillColor?.() ?? '#00ff88',
    fillOpacity: shape.getFillOpacity?.() ?? 0.5
  };
});

const polygonProps = computed(() => {
  props.updateTrigger; // dependency
  if (!props.selectedShape) return { color: '#ff0000', weight: 1, fillColor: '#0088ff', fillOpacity: 0.5, edges: [] };
  const shape = props.selectedShape as any;
  return {
    color: shape.getColor?.() ?? '#ff0000',
    weight: shape.getWeight?.() ?? 1,
    fillColor: shape.getFillColor?.() ?? '#0088ff',
    fillOpacity: shape.getFillOpacity?.() ?? 0.5,
    edges: shape.getEdges?.() ?? []
  };
});

const polylineProps = computed(() => {
  props.updateTrigger; // dependency
  if (!props.selectedShape) return { color: '#ff0088', weight: 3, opacity: 1.0, edges: [] };
  const shape = props.selectedShape as any;
  return {
    color: shape.getColor?.() ?? '#ff0088',
    weight: shape.getWeight?.() ?? 3,
    opacity: shape.getOpacity?.() ?? 1.0,
    edges: shape.getEdges?.() ?? []
  };
});

const textProps = computed(() => {
  props.updateTrigger; // dependency
  if (!props.selectedShape) return { text: 'Text', fontSize: 16, color: '#ffffff', direction: 'center', className: '' };
  const shape = props.selectedShape as any;
  return {
    text: shape.getText?.() ?? 'Text',
    fontSize: shape.getFontSize?.() ?? 16,
    color: shape.getColor?.() ?? '#ffffff',
    direction: shape.getDirection?.() ?? 'center',
    className: shape.getClassName?.() ?? ''
  };
});

const svgTextProps = computed(() => {
  props.updateTrigger; // dependency
  if (!props.selectedShape) return { text: 'SVG Text', fontSize: '1em', width: 100, height: 20, fillColor: '#000000' };
  const shape = props.selectedShape as any;
  return {
    text: shape.getText?.() ?? 'SVG Text',
    fontSize: shape.getFontSize?.() ?? '1em',
    width: shape.getWidth?.() ?? 100,
    height: shape.getHeight?.() ?? 20,
    fillColor: shape.getFillColor?.() ?? '#000000'
  };
});

const divProps = computed(() => {
  props.updateTrigger; // dependency
  if (!props.selectedShape) return { html: '<div>Hello</div>', className: '', width: 100, height: 100, css: '' };
  const shape = props.selectedShape as any;
  return {
    html: shape.getHtml?.() ?? '<div>Hello</div>',
    className: shape.getClassName?.() ?? '',
    width: shape.getWidth?.() ?? 100,
    height: shape.getHeight?.() ?? 100,
    css: shape.getCss?.() ?? ''
  };
});

const imageProps = computed(() => {
  props.updateTrigger; // dependency
  if (!props.selectedShape) return { url: '', width: 100, height: 100 };
  const shape = props.selectedShape as any;
  return {
    url: shape.getUrl?.() ?? '',
    width: shape.getWidth?.() ?? 100,
    height: shape.getHeight?.() ?? 100
  };
});

// Methods
function updateProperty(property: string, value: any) {
  // Convert degrees to radians for rotation
  if (property === 'rotation') {
    value = value * (Math.PI / 180);
  }
  emit('update-property', property, value);
}

function deleteShape() {
  emit('delete-shape');
}
</script>

<style scoped>
.properties-panel {
  padding: 20px;
  height: 100%;
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
.property-row input[type="text"],
.property-row input[type="url"] {
  flex: 1;
  padding: 8px 12px;
  background: var(--qui-bg-primary, #1a1a1a);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 5px;
  color: var(--qui-text-primary, #fff);
  font-size: var(--qui-font-size-small, 13px);
  transition: all 0.15s ease;
  font-family: var(--qui-font-family, 'Segoe UI', sans-serif);
  box-sizing: border-box;
  min-width: 0;
}

.property-row input[type="number"]:focus,
.property-row input[type="text"]:focus,
.property-row input[type="url"]:focus {
  outline: none;
  border-color: var(--qui-accent-color, #00ff88);
  box-shadow: 0 0 0 2px rgba(0, 255, 136, 0.2);
  background: color-mix(in srgb, var(--qui-bg-primary, #1a1a1a) 95%, var(--qui-accent-color, #00ff88));
}

.property-row textarea {
  flex: 1;
  padding: 8px 12px;
  background: var(--qui-bg-primary, #1a1a1a);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 5px;
  color: var(--qui-text-primary, #fff);
  font-size: var(--qui-font-size-small, 13px);
  font-family: var(--qui-font-family, 'Segoe UI', sans-serif);
  resize: vertical;
  min-height: 60px;
  transition: all 0.15s ease;
  box-sizing: border-box;
  min-width: 0;
}

.property-row textarea:focus {
  outline: none;
  border-color: var(--qui-accent-color, #00ff88);
  box-shadow: 0 0 0 2px rgba(0, 255, 136, 0.2);
  background: color-mix(in srgb, var(--qui-bg-primary, #1a1a1a) 95%, var(--qui-accent-color, #00ff88));
}

.property-row textarea:hover {
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
