<script setup lang="ts">
const props = defineProps<{
  canUndo: boolean;
  canRedo: boolean;
  dirty: boolean;
  faceplateId?: string | null;
  faceplateName?: string;
  targetEntityType?: string;
  viewportWidth?: number;
  viewportHeight?: number;
}>();

const emit = defineEmits<{
  (event: 'undo'): void;
  (event: 'redo'): void;
  (event: 'save'): void;
  (event: 'new'): void;
  (event: 'load'): void;
  (event: 'viewport-resize', payload: { width: number; height: number }): void;
}>();

function handleViewportInput(axis: 'width' | 'height', event: Event) {
  const value = Number((event.target as HTMLInputElement | null)?.value ?? 0);
  if (!Number.isFinite(value) || value < 320) return;
  
  emit('viewport-resize', {
    width: axis === 'width' ? value : props.viewportWidth ?? 1280,
    height: axis === 'height' ? value : props.viewportHeight ?? 800,
  });
}
</script>

<template>
  <header class="toolbar">
    <div class="toolbar__left">
      <div v-if="props.faceplateId" class="toolbar__faceplate-info">
        <span class="toolbar__badge toolbar__badge--name">{{ props.faceplateName || 'Untitled' }}</span>
        <span v-if="props.targetEntityType" class="toolbar__badge toolbar__badge--type">{{ props.targetEntityType }}</span>
      </div>
      <span v-else class="toolbar__badge toolbar__badge--warning">No faceplate selected</span>
      <span v-if="props.dirty" class="toolbar__badge">Unsaved</span>
      <div class="toolbar__viewport">
        <label>
          <span>W:</span>
          <input type="number" min="320" step="20" :value="props.viewportWidth ?? 1280" @change="handleViewportInput('width', $event)" />
        </label>
        <label>
          <span>H:</span>
          <input type="number" min="240" step="20" :value="props.viewportHeight ?? 800" @change="handleViewportInput('height', $event)" />
        </label>
      </div>
    </div>
    <div class="toolbar__actions">
      <button type="button" @click="emit('new')">New</button>
      <button type="button" @click="emit('load')">Load</button>
      <span class="toolbar__divider" aria-hidden="true"></span>
      <button type="button" :disabled="!props.canUndo" @click="emit('undo')">Undo</button>
      <button type="button" :disabled="!props.canRedo" @click="emit('redo')">Redo</button>
      <span class="toolbar__divider" aria-hidden="true"></span>
      <button type="button" class="toolbar__primary" :disabled="!props.dirty && props.faceplateId != null" @click="emit('save')">Save</button>
    </div>
  </header>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 24px;
  background: rgba(0, 6, 10, 0.78);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(16px);
}

.toolbar__left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toolbar__badge {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  background: rgba(0, 255, 194, 0.16);
  border: 1px solid rgba(0, 255, 194, 0.32);
}

.toolbar__badge--name {
  background: rgba(100, 150, 255, 0.16);
  border-color: rgba(100, 150, 255, 0.32);
}

.toolbar__badge--type {
  background: rgba(150, 100, 255, 0.16);
  border-color: rgba(150, 100, 255, 0.32);
  font-family: monospace;
}

.toolbar__badge--warning {
  background: rgba(255, 150, 0, 0.16);
  border-color: rgba(255, 150, 0, 0.32);
}

.toolbar__faceplate-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar__viewport {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: 12px;
}

.toolbar__viewport label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  opacity: 0.7;
}

.toolbar__viewport input {
  width: 80px;
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(0, 0, 0, 0.35);
  color: inherit;
  font-size: 12px;
}

.toolbar__actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.toolbar__actions button {
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 13px;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: inherit;
  cursor: pointer;
  transition: transform 0.12s ease;
}

.toolbar__actions button:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.toolbar__actions button:not(:disabled):hover {
  transform: translateY(-1px);
}

.toolbar__primary {
  background: rgba(0, 255, 194, 0.18);
  border-color: rgba(0, 255, 194, 0.34);
  color: inherit;
}

.toolbar__divider {
  width: 1px;
  height: 22px;
  background: rgba(255, 255, 255, 0.16);
}
</style>
