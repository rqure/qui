<script setup lang="ts">
import { ref, watch } from 'vue';
import { useDataStore } from '@/stores/data';
import type { EntityId, Field, EntitySchema, EntityType } from '@/core/data/types';
import { EntityFactories, Utils } from '@/core/data/types';
import { formatTimestamp } from '@/apps/database-browser/utils/formatters';
import ValueDisplay from '@/apps/database-browser/components/ValueDisplay.vue';
import ValueEditor from '@/apps/database-browser/components/ValueEditor.vue';

const props = defineProps<{
  entityId: EntityId;
}>();

const dataStore = useDataStore();
const loading = ref(true);
const error = ref<string | null>(null);
const fields = ref<Field[]>([]);
const entityName = ref('');
const entityType = ref<EntityType>('');
const editingField = ref<string | null>(null);

// Load entity details when component mounts or entity ID changes
watch(() => props.entityId, async () => {
  await loadEntityDetails();
}, { immediate: true });

async function loadEntityDetails() {
  loading.value = true;
  error.value = null;
  fields.value = [];
  
  try {
    // Extract entity type from ID
    entityType.value = Utils.getEntityTypeFromId(props.entityId);
    
    // Create entity instance
    const entity = EntityFactories.newEntity(props.entityId);
    
    // Get the entity's schema to know what fields it has
    const schema = await dataStore.getEntitySchema(entityType.value);
    Object.keys(schema.fields).forEach((field: string) => {
      entity.field(field);
    });
    
    // Read basic entity info
    const eFields = Object.values(entity.fields);
    await dataStore.read([...eFields]);

    fields.value = [...eFields].sort((a, b) => {
      const aField = schema.fields[a.fieldType];
      const bField = schema.fields[b.fieldType];
      if (aField.rank === bField.rank) {
        return aField.fieldType.localeCompare(bField.fieldType);
      }

      return aField.rank - bField.rank;
    });
    entityName.value = entity.field("Name").value.getString();

    loading.value = false;
  } catch (err) {
    console.error(`Error in loadEntityDetails: ${err}`);
    error.value = `Error: ${err}`;
    loading.value = false;
  }
}



async function startEditing(fieldType: string) {
  editingField.value = fieldType;
}

async function saveField(fieldType: string, newValue: any) {
  try {
    const field = fields.value.find(f => f.fieldType === fieldType);
    if (!field) return;
    
    // Set the new value - assuming newValue is a properly created Value object
    field.value = newValue;
    
    // Write to the database
    await dataStore.write([field]);
    
    // Close editor
    editingField.value = null;
    
    // If we edited the Name field, update the display name
    if (fieldType === 'Name') {
      entityName.value = field.value.getString();
    }
  } catch (err) {
    console.error(`Error saving field ${fieldType}:`, err);
    error.value = `Failed to save field: ${err}`;
  }
}

function cancelEditing() {
  editingField.value = null;
}
</script>

<template>
  <div class="entity-details">
    <div class="details-header">
      <h2 class="entity-title">{{ entityName }}</h2>
      <div class="entity-type">Type: {{ entityType }}</div>
      <div class="entity-id">ID: {{ entityId }}</div>
    </div>
    
    <div v-if="loading" class="details-loading">
      <div class="spinner"></div>
      <span>Loading entity details...</span>
    </div>
    
    <div v-else-if="error" class="details-error">
      <span>{{ error }}</span>
      <button @click="loadEntityDetails" class="retry-button">Retry</button>
    </div>
    
    <div v-else class="fields-container">
      <table class="fields-table">
        <thead>
          <tr>
            <th class="field-name-header">Field</th>
            <th class="field-value-header">Value</th>
            <th class="field-meta-header">Last Modified</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="field in fields" :key="field.fieldType" class="field-row">
            <td class="field-name">
              {{ field.fieldType }}
              <span class="field-type">{{ field.value.type }}</span>
            </td>
            <td class="field-value">
              <ValueEditor
                v-if="editingField === field.fieldType"
                :value="field.value"
                @save="saveField(field.fieldType, $event)"
                @cancel="cancelEditing"
              />
              <div v-else class="value-display-container" @dblclick="startEditing(field.fieldType)">
                <ValueDisplay :value="field.value" />
                <button class="edit-button" @click="startEditing(field.fieldType)">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                  </svg>
                </button>
              </div>
            </td>
            <td class="field-meta">
              <div class="field-timestamp">{{ formatTimestamp(field.writeTime) }}</div>
              <div class="field-writer">{{ field.writerId }}</div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.entity-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--qui-bg-primary);
  border-left: 1px solid var(--qui-hover-border);
}

.details-header {
  padding: 16px;
  border-bottom: 1px solid var(--qui-hover-border);
  background: var(--qui-gradient-primary);
}

.entity-title {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: var(--qui-font-weight-medium);
  color: var(--qui-text-primary);
}

.entity-type, .entity-id {
  font-size: var(--qui-font-size-small);
  color: var(--qui-text-secondary);
  margin-bottom: 4px;
}

.entity-id {
  font-family: monospace;
  opacity: 0.7;
}

.fields-container {
  flex: 1;
  overflow: auto;
  padding: 16px;
  
  /* Firefox */
  scrollbar-width: thin;
  scrollbar-color: var(--qui-scrollbar-thumb) var(--qui-scrollbar-track);
}

.fields-container::-webkit-scrollbar {
  width: 8px;
}

.fields-container::-webkit-scrollbar-track {
  background: var(--qui-scrollbar-track);
}

.fields-container::-webkit-scrollbar-thumb {
  background: var(--qui-scrollbar-thumb);
  border-radius: 4px;
}

.fields-container::-webkit-scrollbar-thumb:hover {
  background: var(--qui-scrollbar-thumb-hover);
}

.fields-table {
  width: 100%;
  border-collapse: collapse;
}

.fields-table th {
  text-align: left;
  padding: 8px;
  font-size: var(--qui-font-size-small);
  font-weight: var(--qui-font-weight-medium);
  color: var(--qui-text-secondary);
  border-bottom: 1px solid var(--qui-hover-border);
}

.field-name-header {
  width: 25%;
}

.field-value-header {
  width: 50%;
}

.field-meta-header {
  width: 25%;
}

.field-row {
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.field-row:hover {
  background: var(--qui-overlay-hover);
}

.field-name, .field-value, .field-meta {
  padding: 10px 8px;
  vertical-align: top;
}

.field-name {
  font-weight: var(--qui-font-weight-medium);
  color: var(--qui-text-primary);
  position: relative;
}

.field-type {
  display: block;
  font-size: 10px;
  color: var(--qui-text-secondary);
  font-weight: normal;
  margin-top: 2px;
}

.field-value {
  overflow: hidden;
  color: var(--qui-text-primary);
}

.field-meta {
  font-size: var(--qui-font-size-small);
  color: var(--qui-text-secondary);
}

.field-timestamp {
  margin-bottom: 2px;
}

.field-writer {
  font-style: italic;
  opacity: 0.7;
}

.details-loading, .details-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: var(--qui-text-secondary);
}

.spinner {
  width: 24px;
  height: 24px;
  border: 2px solid transparent;
  border-top-color: var(--qui-accent-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 12px;
}

.retry-button {
  margin-top: 12px;
  padding: 8px 16px;
  background: var(--qui-overlay-primary);
  border: none;
  border-radius: 4px;
  color: var(--qui-text-primary);
  cursor: pointer;
}

.retry-button:hover {
  background: var(--qui-overlay-secondary);
}

.value-display-container {
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
}

.value-display-container:hover .edit-button {
  opacity: 1;
}

.edit-button {
  opacity: 0;
  background: transparent;
  border: none;
  color: var(--qui-accent-color);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s var(--qui-animation-bounce);
}

.edit-button:hover {
  background: var(--qui-overlay-primary);
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
