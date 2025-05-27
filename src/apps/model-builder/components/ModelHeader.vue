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
  <div class="model-header mb-card">
    <!-- Model Selection -->
    <div class="model-selector">
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

      <!-- New Model Button -->
      <button class="mb-button mb-button-primary" @click="emit('create')">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
          <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
        </svg>
        New Model
      </button>
    </div>

    <!-- Model Actions -->
    <div class="model-actions" v-if="activeModel">
      <div v-if="isRenaming" class="rename-container">
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
          <button class="mb-button" @click="cancelRename">Cancel</button>
        </div>
      </div>
      <template v-else>
        <h2 class="model-title">
          {{ activeModel.name }}
          <button class="rename-button" @click="startRename">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24">
              <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a.996.996 0 0 0 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
            </svg>
          </button>
        </h2>
        <button class="mb-button mb-button-primary" @click="emit('save')">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
            <path fill="currentColor" d="M17 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm2 16H5V5h11.17L19 7.83V19zm-7-7c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
          </svg>
          Save
        </button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.model-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  gap: 16px;
  background: var(--qui-overlay-primary);
}

.model-selector {
  display: flex;
  gap: 12px;
  align-items: center;
  flex: 1;
}

.model-select {
  min-width: 200px;
  max-width: 400px;
}

.model-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.model-title {
  font-size: var(--qui-font-size-base);
  font-weight: var(--qui-font-weight-medium);
  color: var(--qui-accent-color);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.rename-button {
  padding: 4px;
  background: transparent;
  border: none;
  color: var(--qui-text-secondary);
  cursor: pointer;
  opacity: 0.6;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.rename-button:hover {
  opacity: 1;
  background: var(--qui-bg-hover);
  color: var(--qui-accent-color);
}

.rename-container {
  display: flex;
  gap: 8px;
  align-items: center;
}

.rename-actions {
  display: flex;
  gap: 8px;
}
</style>
