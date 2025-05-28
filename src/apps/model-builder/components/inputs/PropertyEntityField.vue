<script setup lang="ts">
import { ref, computed } from 'vue';
import { useDataStore } from '@/stores/data';

const props = defineProps<{
  value: string | null;  // Allow null value
  property: any;
  activeModel: any;
}>();

const emit = defineEmits<{
  (e: 'update', value: string): void;
}>();

const dataStore = useDataStore();
const showFieldSelector = ref(false);
const availableFields = ref<string[]>([]);

async function loadAvailableFields() {
  if (!props.activeModel?.entityType) return;
  
  try {
    const schema = await dataStore.getEntitySchema(props.activeModel.entityType);
    if (schema?.fields) {
      availableFields.value = Object.keys(schema.fields);
    }
  } catch (error) {
    console.error('Error loading available fields:', error);
  }
}

// Add computed property to handle null values
const displayValue = computed(() => props.value || 'Select a field...');

function selectField(field: string) {
  emit('update', field || '');  // Ensure empty string instead of null
  showFieldSelector.value = false;
}

loadAvailableFields();
</script>

<template>
  <div class="entity-field-selector">
    <div class="field-display" @click="showFieldSelector = true">
      <span class="field-value">{{ displayValue }}</span>
      <span class="field-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
          <path fill="currentColor" d="M7 10l5 5 5-5z"/>
        </svg>
      </span>
    </div>

    <div v-if="showFieldSelector" class="field-list">
      <div 
        v-for="field in availableFields" 
        :key="field"
        class="field-option"
        @click="selectField(field)"
      >
        {{ field }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.entity-field-selector {
  position: relative;
  width: 100%;
}

.field-display {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--qui-bg-primary);
  border: 1px solid var(--qui-hover-border);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.field-display:hover {
  border-color: var(--qui-accent-color);
}

.field-value {
  color: var(--qui-text-primary);
  font-size: var(--qui-font-size-base);
}

.field-icon {
  color: var(--qui-text-secondary);
}

.field-list {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  background: var(--qui-bg-primary);
  border: 1px solid var(--qui-hover-border);
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  z-index: 100;
  max-height: 200px;
  overflow-y: auto;
}

.field-option {
  padding: 8px 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.field-option:hover {
  background: var(--qui-accent-color);
  color: white;
}
</style>
