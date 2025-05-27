<script setup lang="ts">
import { ref } from 'vue';
import type { UIModelEntity } from '../types';

const props = defineProps<{
  activeModel: UIModelEntity | null;
  availableModels: UIModelEntity[];
}>();

const emit = defineEmits<{
  (e: 'create'): void;
  (e: 'save'): void;
  (e: 'select', modelId: string): void;
  (e: 'rename', newName: string): void;
}>();

const isRenaming = ref(false);
const newName = ref('');

function startRename() {
  if (!props.activeModel) return;
  newName.value = props.activeModel.name;
  isRenaming.value = true;
}

function saveRename() {
  if (newName.value.trim()) {
    emit('rename', newName.value.trim());
  }
  isRenaming.value = false;
}

function cancelRename() {
  isRenaming.value = false;
  newName.value = '';
}
</script>

<template>
  <div class="model-header mb-panel">
    <div class="header-content">
      <!-- Left section: Active model name or rename input -->
      <div v-if="activeModel" class="model-info">
        <div v-if="isRenaming" class="rename-controls">
          <input 
            v-model="newName"
            class="mb-input"
            placeholder="Enter model name"
            @keyup.enter="saveRename"
            @keyup.esc="cancelRename"
            ref="renameInput"
          >
          <div class="rename-actions">
            <button class="mb-button mb-button-primary" @click="saveRename">Save</button>
            <button class="mb-button mb-button-secondary" @click="cancelRename">Cancel</button>
          </div>
        </div>
        <h2 v-else class="model-title" @click="startRename">
          {{ activeModel.name }}
          <button class="rename-button" title="Rename model">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24">
              <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a.996.996 0 0 0 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
            </svg>
          </button>
        </h2>
      </div>

      <!-- Center section: Model selector and new model button -->
      <div class="model-actions">
        <div class="select-wrapper">
          <select 
            class="mb-input model-select"
            :value="activeModel?.id"
            @change="(event) => emit('select', (event.target as HTMLSelectElement).value)"
          >
            <option value="" disabled>Select a model...</option>
            <option 
              v-for="model in availableModels" 
              :key="model.id" 
              :value="model.id"
            >
              {{ model.name }}
            </option>
          </select>
          <span class="select-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
              <path fill="currentColor" d="M7 10l5 5 5-5z"/>
            </svg>
          </span>
        </div>

        <button class="mb-button mb-button-primary new-model-button" @click="emit('create')" title="Create new model">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
            <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
        </button>
      </div>

      <!-- Right section: Save button -->
      <div v-if="activeModel" class="save-section">
        <button class="mb-button mb-button-accent save-button" @click="emit('save')" title="Save model">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
            <path fill="currentColor" d="M17 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm2 16H5V5h11.17L19 7.83V19z"/>
          </svg>
          Save
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.model-header {
  background: var(--qui-bg-secondary);
  border-bottom: 1px solid var(--qui-hover-border);
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  gap: 16px;
  height: 52px;
}

.model-info {
  min-width: 200px;
}

.model-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: var(--qui-font-size-base);
  font-weight: var(--qui-font-weight-medium);
  color: var(--qui-accent-color);
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.model-title:hover {
  background: var(--qui-bg-hover);
}

.rename-button {
  opacity: 0.6;
  color: var(--qui-text-secondary);
  border: none;
  background: transparent;
  padding: 4px;
  cursor: pointer;
  border-radius: 4px;
}

.rename-button:hover {
  opacity: 1;
  color: var(--qui-accent-color);
  background: var(--qui-bg-hover);
}

.model-actions {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
}

.select-wrapper {
  position: relative;
  max-width: 300px;
  width: 100%;
}

.model-select {
  width: 100%;
  padding-right: 32px;
  appearance: none;
}

.select-icon {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--qui-text-secondary);
  pointer-events: none;
}

.new-model-button {
  padding: 8px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.rename-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rename-controls .mb-input {
  min-width: 200px;
}

.save-button {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 16px;
  background: var(--qui-accent-color);
  color: white;
  border: none;
  border-radius: 18px;
  transition: all 0.2s ease;
}

.save-button:hover {
  background: var(--qui-accent-secondary);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px var(--qui-accent-glow);
}

.save-section {
  min-width: 100px;
  display: flex;
  justify-content: flex-end;
}
</style>