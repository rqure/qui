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
    description: 'Scalable vector text',
    icon: `<svg width="40" height="40" viewBox="0 0 40 40">
      <text x="20" y="25" text-anchor="middle" fill="currentColor" font-size="16" font-weight="bold">SVG</text>
    </svg>`
  },
  {
    type: 'Div',
    name: 'HTML Div',
    description: 'Custom HTML content',
    icon: `<svg width="40" height="40" viewBox="0 0 40 40">
      <rect x="8" y="8" width="24" height="16" fill="none" stroke="currentColor" stroke-width="2" rx="2"/>
      <text x="20" y="20" text-anchor="middle" fill="currentColor" font-size="10">&lt;/&gt;</text>
    </svg>`
  },
  {
    type: 'ImageOverlay',
    name: 'Image',
    description: 'Image overlay',
    icon: `<svg width="40" height="40" viewBox="0 0 40 40">
      <rect x="8" y="8" width="24" height="16" fill="none" stroke="currentColor" stroke-width="2" rx="2"/>
      <circle cx="16" cy="16" r="2" fill="currentColor"/>
      <polygon points="24,12 28,16 24,20 20,16" fill="currentColor"/>
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
  padding: 20px;
}

.palette-header {
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 2px solid var(--qui-accent-color, #00ff88);
}

.palette-header h3 {
  margin: 0 0 6px 0;
  font-size: var(--qui-font-size-large, 16px);
  font-weight: var(--qui-font-weight-bold, 600);
  color: var(--qui-text-primary, #fff);
  letter-spacing: -0.01em;
}

.palette-subtitle {
  margin: 0;
  font-size: var(--qui-font-size-small, 12px);
  color: var(--qui-text-secondary, #aaa);
  opacity: 0.8;
}

.shapes-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.shape-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  background: linear-gradient(135deg, 
    rgba(255, 255, 255, 0.03) 0%, 
    rgba(255, 255, 255, 0.01) 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  cursor: grab;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  user-select: none;
  position: relative;
  overflow: hidden;
}

.shape-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--qui-accent-color, #00ff88);
  transform: scaleY(0);
  transition: transform 0.2s ease;
}

.shape-item:hover {
  background: linear-gradient(135deg, 
    rgba(0, 255, 136, 0.08) 0%, 
    rgba(0, 255, 136, 0.03) 100%);
  border-color: var(--qui-accent-color, #00ff88);
  transform: translateX(4px);
  box-shadow: 0 4px 12px rgba(0, 255, 136, 0.15), 
              inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.shape-item:hover::before {
  transform: scaleY(1);
}

.shape-item:active {
  cursor: grabbing;
  transform: translateX(2px) scale(0.98);
  box-shadow: 0 2px 6px rgba(0, 255, 136, 0.2), 
              inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.shape-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--qui-accent-color, #00ff88);
  flex-shrink: 0;
  background: rgba(0, 255, 136, 0.1);
  border-radius: 8px;
  border: 1px solid rgba(0, 255, 136, 0.2);
  transition: all 0.2s ease;
}

.shape-item:hover .shape-icon {
  background: rgba(0, 255, 136, 0.15);
  border-color: rgba(0, 255, 136, 0.4);
  transform: scale(1.05);
  box-shadow: 0 0 12px rgba(0, 255, 136, 0.3);
}

.shape-info {
  flex: 1;
  min-width: 0;
}

.shape-name {
  font-size: var(--qui-font-size-base, 14px);
  font-weight: var(--qui-font-weight-medium, 500);
  color: var(--qui-text-primary, #fff);
  margin-bottom: 4px;
  letter-spacing: -0.01em;
}

.shape-description {
  font-size: var(--qui-font-size-small, 12px);
  color: var(--qui-text-secondary, #aaa);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  opacity: 0.85;
  line-height: 1.4;
}
</style>
