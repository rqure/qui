<script setup lang="ts">
import { ref, computed, watch } from 'vue';

const props = defineProps<{
  entityType: string | null;
  availableFields: string[];
  value: string;
}>();

const emit = defineEmits<{
  (e: 'binding-select', binding: { entityType: string, fieldType: string }): void;
}>();

// Parse existing binding value to get selected entity and field
const selectedEntityType = ref<string | null>(null);
const selectedFieldType = ref<string | null>(null);

// Parse current value in format entityType.fieldType
watch(() => props.value, (newValue) => {
  if (newValue) {
    const parts = newValue.split('.');
    if (parts.length === 2) {
      selectedEntityType.value = parts[0];
      selectedFieldType.value = parts[1];
    }
  }
}, { immediate: true });

// Update selected entity type when props change
watch(() => props.entityType, (newType) => {
  if (newType) {
    selectedEntityType.value = newType;
  }
}, { immediate: true });

// Check if binding is valid
const isBindingValid = computed(() => {
  return selectedEntityType.value && selectedFieldType.value;
});

// Handle field selection
function handleFieldSelect(fieldType: string) {
  if (!selectedEntityType.value) return;
  
  selectedFieldType.value = fieldType;
  emit('binding-select', {
    entityType: selectedEntityType.value,
    fieldType
  });
}

// Display text for current binding status
const bindingStatusText = computed(() => {
  if (isBindingValid.value) {
    return `${selectedEntityType.value}.${selectedFieldType.value}`;
  } else {
    return 'Not bound';
  }
});

// Clear current binding
function clearBinding() {
  selectedFieldType.value = null;
  emit('binding-select', {
    entityType: selectedEntityType.value || '',
    fieldType: ''
  });
}
</script>

<template>
  <div class="entity-selector">
    <div class="binding-status" :class="{ 'bound': isBindingValid }">
      <span class="binding-icon">
        <svg v-if="isBindingValid" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
          <path fill="currentColor" d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/>
        </svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
          <path fill="currentColor" d="M17 7h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1 0 1.43-.98 2.63-2.31 2.98l1.46 1.46C20.88 15.61 22 13.45 22 11c0-2.76-2.24-5-5-5zm-1 4h-2.19l2 2H16v-2zM2 4.27l3.11 3.11C3.29 8.12 2 9.91 2 12c0 2.76 2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1 0-1.59 1.21-2.9 2.76-3.07L8.73 11H8v2h2.73L13 15.27V17h1.73l4.01 4.01 1.41-1.41L3.41 2.86 2 4.27z"/>
        </svg>
      </span>
      <span class="binding-text">{{ bindingStatusText }}</span>
      <button 
        v-if="isBindingValid" 
        class="clear-binding" 
        @click="clearBinding" 
        title="Clear binding"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24">
          <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </button>
    </div>
    
    <div class="field-selector" v-if="entityType">
      <div class="field-list">
        <div 
          v-for="field in availableFields" 
          :key="field"
          class="field-item"
          :class="{ 'selected': field === selectedFieldType }"
          @click="handleFieldSelect(field)"
        >
          <span class="field-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24">
              <path fill="currentColor" d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-7-7 1.41-1.41L11 13.17l4.59-4.59L17 10l-5 5z"/>
            </svg>
          </span>
          <span class="field-name">{{ field }}</span>
        </div>
      </div>
    </div>
    
    <div class="no-entity-warning" v-else>
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
        <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
      </svg>
      <span>Select an entity type first</span>
    </div>
  </div>
</template>

<style scoped>
.entity-selector {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.binding-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--qui-bg-secondary);
  border: 1px solid var(--qui-hover-border);
  border-radius: 4px;
  color: var(--qui-text-secondary);
}

.binding-status.bound {
  background: rgba(0, 176, 255, 0.1);
  border-color: rgba(0, 176, 255, 0.3);
  color: #00b0ff;
}

.binding-icon {
  display: flex;
  align-items: center;
}

.binding-text {
  flex: 1;
  font-family: var(--qui-font-family-mono);
  font-size: var(--qui-font-size-small);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.clear-binding {
  background: transparent;
  border: none;
  color: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0.5;
  transition: all 0.2s ease;
  padding: 4px;
  border-radius: 50%;
}

.clear-binding:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.1);
}

.field-selector {
  background: var(--qui-bg-secondary);
  border: 1px solid var(--qui-hover-border);
  border-radius: 4px;
  max-height: 200px;
  overflow-y: auto;
}

.field-list {
  padding: 4px;
}

.field-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.field-item:hover {
  background: var(--qui-overlay-hover);
}

.field-item.selected {
  background: rgba(0, 176, 255, 0.1);
  color: #00b0ff;
}

.field-icon {
  display: flex;
  align-items: center;
  color: var(--qui-text-secondary);
}

.field-item.selected .field-icon {
  color: #00b0ff;
}

.field-name {
  font-size: var(--qui-font-size-small);
}

.no-entity-warning {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px;
  background: rgba(255, 193, 7, 0.1);
  border-radius: 4px;
  color: #ffc107;
  font-size: var(--qui-font-size-small);
}
</style>
