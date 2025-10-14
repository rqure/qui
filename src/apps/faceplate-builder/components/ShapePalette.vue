<template>
  <div class="shape-palette">
    <div class="palette-header">
      <h3>Shapes</h3>
      <p class="palette-subtitle">Drag to canvas</p>
    </div>
    
    <div class="shapes-list">
      <div
        v-for="shape in shapes"
        :key="shape.type"
        class="shape-item"
        draggable="true"
        @dragstart="onDragStart($event, shape.type)"
        @dragend="onDragEnd"
      >
        <div class="shape-icon" v-html="shape.icon"></div>
        <div class="shape-info">
          <div class="shape-name">{{ shape.name }}</div>
          <div class="shape-description">{{ shape.description }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  (e: 'shape-drag-start', shapeType: string): void
}>();

interface ShapeDefinition {
  type: string;
  name: string;
  description: string;
  icon: string;
}

const shapes: ShapeDefinition[] = [
  {
    type: 'Circle',
    name: 'Circle',
    description: 'Circular shape with radius',
    icon: `<svg width="40" height="40" viewBox="0 0 40 40">
      <circle cx="20" cy="20" r="15" fill="none" stroke="currentColor" stroke-width="2"/>
    </svg>`
  },
  {
    type: 'Polygon',
    name: 'Polygon',
    description: 'Closed shape with vertices',
    icon: `<svg width="40" height="40" viewBox="0 0 40 40">
      <polygon points="20,8 32,28 8,28" fill="none" stroke="currentColor" stroke-width="2"/>
    </svg>`
  },
  {
    type: 'Polyline',
    name: 'Polyline',
    description: 'Open line with vertices',
    icon: `<svg width="40" height="40" viewBox="0 0 40 40">
      <polyline points="8,25 15,10 25,15 32,8" fill="none" stroke="currentColor" stroke-width="2"/>
    </svg>`
  },
  {
    type: 'Text',
    name: 'Text',
    description: 'Text label',
    icon: `<svg width="40" height="40" viewBox="0 0 40 40">
      <text x="20" y="25" text-anchor="middle" fill="currentColor" font-size="20" font-weight="bold">T</text>
    </svg>`
  }
];

function onDragStart(event: DragEvent, shapeType: string) {
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData('application/x-faceplate-shape', shapeType);
    
    // Create drag image
    const target = event.target as HTMLElement;
    const clone = target.cloneNode(true) as HTMLElement;
    clone.style.position = 'absolute';
    clone.style.top = '-1000px';
    document.body.appendChild(clone);
    event.dataTransfer.setDragImage(clone, 20, 20);
    setTimeout(() => document.body.removeChild(clone), 0);
  }
  
  emit('shape-drag-start', shapeType);
}

function onDragEnd() {
  // Clean up if needed
}
</script>

<style scoped>
.shape-palette {
  padding: 16px;
}

.palette-header {
  margin-bottom: 16px;
}

.palette-header h3 {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--qui-color-text);
}

.palette-subtitle {
  margin: 0;
  font-size: 12px;
  color: var(--qui-color-text-secondary);
}

.shapes-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.shape-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--qui-color-background);
  border: 1px solid var(--qui-color-border);
  border-radius: 6px;
  cursor: grab;
  transition: all 0.2s;
  user-select: none;
}

.shape-item:hover {
  background: var(--qui-color-background-hover);
  border-color: var(--qui-color-primary);
  transform: translateX(2px);
}

.shape-item:active {
  cursor: grabbing;
}

.shape-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--qui-color-primary);
  flex-shrink: 0;
}

.shape-info {
  flex: 1;
  min-width: 0;
}

.shape-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--qui-color-text);
  margin-bottom: 2px;
}

.shape-description {
  font-size: 12px;
  color: var(--qui-color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
