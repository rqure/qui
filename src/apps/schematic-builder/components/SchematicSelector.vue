<script setup lang="ts">
import { ref } from 'vue';
import type { EntityId } from '@/core/data/types';

const props = defineProps<{
  currentSchematicId: EntityId | null;
  currentSchematicName: string;
}>();

const emit = defineEmits<{
  (event: 'load', schematicId: EntityId): void;
  (event: 'create'): void;
  (event: 'delete'): void;
}>();

function handleLoad() {
  // For now, just a placeholder - could open a dialog to select schematic
  console.log('Load schematic dialog would open here');
}

function handleCreate() {
  emit('create');
}

function handleDelete() {
  if (props.currentSchematicId && confirm('Delete this schematic?')) {
    emit('delete');
  }
}
</script>

<template>
  <div class="schematic-selector">
    <div class="selector-content">
      <span class="schematic-name">{{ currentSchematicName }}</span>
      <div class="selector-actions">
        <button @click="handleCreate" class="btn-new" title="New Schematic">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
        <button @click="handleLoad" class="btn-load" title="Load Schematic">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          </svg>
        </button>
        <button 
          v-if="currentSchematicId" 
          @click="handleDelete" 
          class="btn-delete" 
          title="Delete Schematic"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.schematic-selector {
  padding: 8px 12px;
  background: var(--qui-bg-secondary);
  border-bottom: var(--qui-window-border);
  display: flex;
  align-items: center;
}

.selector-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.schematic-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--qui-text-primary);
}

.selector-actions {
  display: flex;
  gap: 8px;
}

.btn-new,
.btn-load,
.btn-delete {
  padding: 4px 8px;
  background: var(--qui-bg-tertiary);
  border: 1px solid var(--qui-border-primary);
  border-radius: 4px;
  color: var(--qui-text-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s, border-color 0.2s;
}

.btn-new:hover,
.btn-load:hover {
  background: var(--qui-bg-hover);
  border-color: var(--qui-border-hover);
}

.btn-delete:hover {
  background: rgba(255, 64, 64, 0.2);
  border-color: rgba(255, 64, 64, 0.4);
}

button svg {
  display: block;
}
</style>
