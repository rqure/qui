<template>
  <div class="layer-panel">
    <div class="panel-header">
      <h3>Layers</h3>
      <p class="panel-subtitle">Click to select shapes</p>
    </div>

    <div class="layers-list">
      <div
        v-for="(shape, index) in shapes"
        :key="index"
        class="layer-item"
        :class="{ 'selected': selectedIndex === index }"
        @click="onLayerClick(index)"
      >
        <div class="layer-icon" v-html="getShapeIcon(shape)"></div>
        <div class="layer-info">
          <div class="layer-name">{{ getShapeName(shape, index) }}</div>
          <div class="layer-details">{{ getShapeDetails(shape) }}</div>
        </div>
        <div class="layer-actions">
          <!-- Visibility toggle removed for simplicity -->
        </div>
      </div>

      <div v-if="shapes.length === 0" class="empty-state">
        <div class="empty-icon">📋</div>
        <div class="empty-text">No shapes yet</div>
        <div class="empty-subtext">Add shapes from the Shapes tab</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Drawable } from '@/core/canvas/shapes/base';

const props = defineProps<{
  model: any; // Model instance with getShapes() method
  selectedIndex: number | null;
}>();

const emit = defineEmits<{
  (e: 'shape-select', index: number): void;
  (e: 'shape-update'): void;
}>();

const shapes = computed((): Drawable[] => {
  return props.model?.getShapes() || [];
});

function onLayerClick(index: number) {
  emit('shape-select', index);
}

function getShapeIcon(shape: Drawable): string {
  const type = shape.constructor.name;
  switch (type) {
    case 'Circle':
      return `<svg width="32" height="32" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="15" fill="none" stroke="currentColor" stroke-width="2"/>
      </svg>`;
    case 'Polygon':
      return `<svg width="32" height="32" viewBox="0 0 40 40">
        <polygon points="20,8 32,28 8,28" fill="none" stroke="currentColor" stroke-width="2"/>
      </svg>`;
    case 'Polyline':
      return `<svg width="32" height="32" viewBox="0 0 40 40">
        <polyline points="8,25 15,10 25,15 32,8" fill="none" stroke="currentColor" stroke-width="2"/>
      </svg>`;
    case 'Text':
      return `<svg width="32" height="32" viewBox="0 0 40 40">
        <text x="20" y="25" text-anchor="middle" fill="currentColor" font-size="20" font-weight="bold">T</text>
      </svg>`;
    case 'Text':
      return `<svg width="32" height="32" viewBox="0 0 40 40">
        <text x="20" y="25" text-anchor="middle" fill="currentColor" font-size="16" font-weight="bold">SVG</text>
      </svg>`;
    case 'Div':
      return `<svg width="32" height="32" viewBox="0 0 40 40">
        <rect x="8" y="8" width="24" height="16" fill="none" stroke="currentColor" stroke-width="2" rx="2"/>
        <text x="20" y="20" text-anchor="middle" fill="currentColor" font-size="10">&lt;/&gt;</text>
      </svg>`;
    case 'ImageOverlay':
      return `<svg width="32" height="32" viewBox="0 0 40 40">
        <rect x="8" y="8" width="24" height="16" fill="none" stroke="currentColor" stroke-width="2" rx="2"/>
        <circle cx="16" cy="16" r="2" fill="currentColor"/>
        <polygon points="24,12 28,16 24,20 20,16" fill="currentColor"/>
      </svg>`;
    default:
      return `<svg width="32" height="32" viewBox="0 0 40 40">
        <text x="20" y="25" text-anchor="middle" fill="currentColor" font-size="20">?</text>
      </svg>`;
  }
}

function getShapeName(shape: Drawable, index: number): string {
  const type = shape.constructor.name;

  // Try to get a meaningful name from shape properties
  const shapeAny = shape as any;
  if (shapeAny.getText && shapeAny.getText()) {
    const text = shapeAny.getText();
    return text.length > 20 ? text.substring(0, 20) + '...' : text;
  }

  if (shapeAny.getHtml && shapeAny.getHtml()) {
    return 'HTML Div';
  }

  if (shapeAny.getUrl && shapeAny.getUrl()) {
    return 'Image';
  }

  // Default to type + index
  return `${type} ${index + 1}`;
}

function getShapeDetails(shape: Drawable): string {
  const offset = shape.getOffset();
  const rotation = Math.round((shape.getRotation() * 180) / Math.PI);
  return `x: ${Math.round(offset.x)}, y: ${Math.round(offset.y)}${rotation !== 0 ? `, rot: ${rotation}°` : ''}`;
}
</script>

<style scoped>
.layer-panel {
  padding: 20px;
}

.panel-header {
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 2px solid var(--qui-accent-color, #00ff88);
}

.panel-header h3 {
  margin: 0 0 6px 0;
  font-size: var(--qui-font-size-large, 16px);
  font-weight: var(--qui-font-weight-bold, 600);
  color: var(--qui-text-primary, #fff);
  letter-spacing: -0.01em;
}

.panel-subtitle {
  margin: 0;
  font-size: var(--qui-font-size-small, 12px);
  color: var(--qui-text-secondary, #aaa);
  opacity: 0.8;
}

.layers-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.layer-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: linear-gradient(135deg,
    rgba(255, 255, 255, 0.03) 0%,
    rgba(255, 255, 255, 0.01) 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  user-select: none;
  position: relative;
  overflow: hidden;
}

.layer-item::before {
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

.layer-item:hover {
  background: linear-gradient(135deg,
    rgba(0, 255, 136, 0.08) 0%,
    rgba(0, 255, 136, 0.03) 100%);
  border-color: var(--qui-accent-color, #00ff88);
  transform: translateX(2px);
  box-shadow: 0 2px 8px rgba(0, 255, 136, 0.15),
              inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.layer-item:hover::before {
  transform: scaleY(1);
}

.layer-item.selected {
  background: linear-gradient(135deg,
    rgba(0, 255, 136, 0.12) 0%,
    rgba(0, 255, 136, 0.06) 100%);
  border-color: var(--qui-accent-color, #00ff88);
  box-shadow: 0 0 0 2px rgba(0, 255, 136, 0.3),
              inset 0 1px 0 rgba(255, 255, 255, 0.15);
}

.layer-item.selected::before {
  transform: scaleY(1);
}

.layer-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--qui-accent-color, #00ff88);
  flex-shrink: 0;
  background: rgba(0, 255, 136, 0.1);
  border-radius: 4px;
  border: 1px solid rgba(0, 255, 136, 0.2);
  transition: all 0.2s ease;
}

.layer-item:hover .layer-icon,
.layer-item.selected .layer-icon {
  background: rgba(0, 255, 136, 0.15);
  border-color: rgba(0, 255, 136, 0.4);
  transform: scale(1.05);
}

.layer-info {
  flex: 1;
  min-width: 0;
}

.layer-name {
  font-size: var(--qui-font-size-base, 14px);
  font-weight: var(--qui-font-weight-medium, 500);
  color: var(--qui-text-primary, #fff);
  margin-bottom: 2px;
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.layer-details {
  font-size: var(--qui-font-size-small, 12px);
  color: var(--qui-text-secondary, #aaa);
  opacity: 0.75;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.layer-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  opacity: 0.6;
  transition: opacity 0.2s ease;
}

.layer-item:hover .layer-actions {
  opacity: 1;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  color: var(--qui-text-secondary, #aaa);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-text {
  font-size: var(--qui-font-size-base, 14px);
  font-weight: var(--qui-font-weight-medium, 500);
  margin-bottom: 8px;
  color: var(--qui-text-primary, #fff);
}

.empty-subtext {
  font-size: var(--qui-font-size-small, 12px);
  opacity: 0.7;
}
</style>