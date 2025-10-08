<script setup lang="ts">
const props = defineProps<{
  canUndo: boolean;
  canRedo: boolean;
  dirty: boolean;
  faceplateId?: string | null;
  faceplateName?: string;
  hasMultipleSelected?: boolean;
}>();

const emit = defineEmits<{
  (event: 'undo'): void;
  (event: 'redo'): void;
  (event: 'save'): void;
  (event: 'reset'): void;
  (event: 'new'): void;
  (event: 'load'): void;
  (event: 'create-custom'): void;
  (event: 'manage-custom'): void;
}>();
</script>

<template>
  <header class="toolbar">
    <div class="toolbar__left">
      <h1>Faceplate Builder</h1>
      <span v-if="props.faceplateName" class="toolbar__badge toolbar__badge--name">{{ props.faceplateName }}</span>
      <span v-if="props.dirty" class="toolbar__badge">Unsaved changes</span>
    </div>
    <div class="toolbar__actions">
      <button type="button" @click="emit('new')">New</button>
      <button type="button" @click="emit('load')">Load</button>
      <span class="toolbar__divider" aria-hidden="true"></span>
  <button type="button" :disabled="!props.hasMultipleSelected" @click="emit('create-custom')" title="Create custom component from selected">
        <span class="toolbar__icon">✨</span> Create Custom
      </button>
      <button type="button" @click="emit('manage-custom')" title="Manage custom component library">
        <span class="toolbar__icon">📚</span> Library
      </button>
      <span class="toolbar__divider" aria-hidden="true"></span>
      <button type="button" :disabled="!props.canUndo" @click="emit('undo')">Undo</button>
      <button type="button" :disabled="!props.canRedo" @click="emit('redo')">Redo</button>
      <span class="toolbar__divider" aria-hidden="true"></span>
      <button type="button" class="toolbar__ghost" @click="emit('reset')">Reset</button>
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

.toolbar h1 {
  margin: 0;
  font-size: 18px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
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

.toolbar__ghost {
  border-style: dashed;
}

.toolbar__divider {
  width: 1px;
  height: 22px;
  background: rgba(255, 255, 255, 0.16);
}

.toolbar__icon {
  margin-right: 4px;
}
</style>
