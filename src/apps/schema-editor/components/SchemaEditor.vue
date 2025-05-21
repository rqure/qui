<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { EntitySchema, FieldSchema, ValueType } from '@/core/data/types';
import FieldEditor from './FieldEditor.vue';

const props = defineProps<{
  schema: EntitySchema;
}>();

const emit = defineEmits<{
  (e: 'update:schema', schema: EntitySchema): void;
}>();

const workingSchema = ref<EntitySchema>(props.schema.clone());
const editingField = ref<string | null>(null);
const showAddField = ref(false);
const newFieldName = ref('');
const newFieldType = ref<ValueType>(ValueType.String);
const fieldError = ref<string | null>(null);

// Watch for external schema changes
watch(() => props.schema, (newSchema) => {
  workingSchema.value = newSchema.clone();
});

// Sort fields by rank for display
const sortedFields = computed(() => {
  const fields = Object.entries(workingSchema.value.fields).map(([fieldType, fieldSchema]) => ({
    fieldType,
    fieldSchema
  }));
  
  return fields.sort((a, b) => {
    const rankA = a.fieldSchema.rank || 0;
    const rankB = b.fieldSchema.rank || 0;
    
    if (rankA === rankB) {
      return a.fieldType.localeCompare(b.fieldType);
    }
    
    return rankA - rankB;
  });
});

function startEditField(fieldType: string) {
  editingField.value = fieldType;
}

function openAddField() {
  showAddField.value = true;
  newFieldName.value = '';
  newFieldType.value = ValueType.String;
  fieldError.value = null;
}

function cancelAddField() {
  showAddField.value = false;
  fieldError.value = null;
}

function addNewField() {
  if (!newFieldName.value.trim()) {
    fieldError.value = 'Field name cannot be empty';
    return;
  }
  
  // Check for valid format (no spaces, special characters)
  const validName = /^[a-zA-Z][a-zA-Z0-9_]*$/.test(newFieldName.value);
  if (!validName) {
    fieldError.value = 'Field name must start with a letter and contain only letters, numbers, and underscores';
    return;
  }
  
  // Check if field already exists
  if (workingSchema.value.fields[newFieldName.value]) {
    fieldError.value = `Field "${newFieldName.value}" already exists`;
    return;
  }
  
  // Create new field schema
  const newFieldSchema = {
    entityType: workingSchema.value.entityType,
    fieldType: newFieldName.value,
    valueType: newFieldType.value,
    rank: Object.keys(workingSchema.value.fields).length, // Add at the end
    readPermissions: [],
    writePermissions: [],
    choices: newFieldType.value === ValueType.Choice ? ['Option 1', 'Option 2'] : []
  };
  
  // Add to working schema
  workingSchema.value.fields[newFieldName.value] = newFieldSchema;
  
  // Close add form and emit update
  showAddField.value = false;
  emit('update:schema', workingSchema.value);
}

function updateField(fieldType: string, updatedField: FieldSchema) {
  workingSchema.value.fields[fieldType] = updatedField;
  editingField.value = null;
  emit('update:schema', workingSchema.value);
}

function cancelEditField() {
  editingField.value = null;
}

function deleteField(fieldType: string) {
  if (confirm(`Are you sure you want to delete the field "${fieldType}"? This cannot be undone.`)) {
    delete workingSchema.value.fields[fieldType];
    emit('update:schema', workingSchema.value);
  }
}

function getValueTypeLabel(type: ValueType): string {
  switch (type) {
    case ValueType.Int: return 'Integer';
    case ValueType.Float: return 'Float';
    case ValueType.String: return 'String';
    case ValueType.Bool: return 'Boolean';
    case ValueType.BinaryFile: return 'Binary File';
    case ValueType.EntityReference: return 'Entity Reference';
    case ValueType.Timestamp: return 'Timestamp';
    case ValueType.Choice: return 'Choice';
    case ValueType.EntityList: return 'Entity List';
    default: return type;
  }
}
</script>

<template>
  <div class="schema-editor">
    <div class="schema-header">
      <h2 class="schema-title">
        <span class="schema-title-label">Schema:</span> {{ workingSchema.entityType }}
      </h2>
      <button class="add-field-button" @click="openAddField">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
          <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
        </svg>
        Add Field
      </button>
    </div>
    
    <div v-if="showAddField" class="add-field-form">
      <h3 class="form-title">Add New Field</h3>
      
      <div class="schema-editor-field-group">
        <label for="field-name">Field Name:</label>
        <input 
          id="field-name" 
          v-model="newFieldName" 
          class="schema-editor-field-input"
          placeholder="Enter field name"
        />
        <p class="schema-editor-field-help">Field name must start with a letter and contain only letters, numbers, and underscores</p>
      </div>
      
      <div class="schema-editor-field-group">
        <label for="field-type">Field Type:</label>
        <select id="field-type" v-model="newFieldType" class="schema-editor-field-select">
          <option v-for="type in Object.values(ValueType)" :key="type" :value="type">
            {{ getValueTypeLabel(type) }}
          </option>
        </select>
      </div>
      
      <div v-if="fieldError" class="field-error">
        {{ fieldError }}
      </div>
      
      <div class="schema-editor-form-actions">
        <button class="cancel-button" @click="cancelAddField">Cancel</button>
        <button class="add-button" @click="addNewField">Add Field</button>
      </div>
    </div>
    
    <div v-if="sortedFields.length === 0" class="no-fields">
      <p>This entity type has no fields defined. Click "Add Field" to create the first field.</p>
    </div>
    
    <div v-else class="fields-table-container">
      <table class="fields-table">
        <thead>
          <tr>
            <th class="col-name">Field Name</th>
            <th class="col-type">Type</th>
            <th class="col-rank">Rank</th>
            <th class="col-actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="{ fieldType, fieldSchema } in sortedFields" :key="fieldType" class="schema-editor-field-row">
            <template v-if="editingField === fieldType">
              <td colspan="4" class="editing-cell">
                <FieldEditor 
                  :field-schema="fieldSchema"
                  @update="updateField(fieldType, $event)"
                  @cancel="cancelEditField"
                />
              </td>
            </template>
            <template v-else>
              <td class="col-name">{{ fieldType }}</td>
              <td class="col-type">
                <span class="schema-editor-type-badge" :class="`type-${fieldSchema.valueType}`">
                  {{ getValueTypeLabel(fieldSchema.valueType) }}
                </span>
              </td>
              <td class="col-rank">{{ fieldSchema.rank || 0 }}</td>
              <td class="col-actions">
                <button class="edit-button" @click="startEditField(fieldType)" title="Edit field">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                  </svg>
                </button>
                <button class="delete-button" @click="deleteField(fieldType)" title="Delete field">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zm2.46-7.12l1.41-1.41L12 12.59l2.12-2.12 1.41 1.41L13.41 14l2.12 2.12-1.41 1.41L12 15.41l-2.12 2.12-1.41-1.41L10.59 14l-2.13-2.12zM15.5 4l-1-1h-5l-1 1H5v2h14V4z"/>
                  </svg>
                </button>
              </td>
            </template>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.schema-editor {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.schema-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--qui-hover-border);
}

.schema-title {
  margin: 0;
  font-size: 18px;
  font-weight: var(--qui-font-weight-medium);
  display: flex;
  align-items: center;
  gap: 8px;
}

.schema-title-label {
  color: var(--qui-text-secondary);
  font-weight: var(--qui-font-weight-normal);
}

.add-field-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #9c27b0;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: var(--qui-font-size-base);
  transition: all 0.2s var(--qui-animation-bounce);
}

.add-field-button:hover {
  background: #7b1fa2;
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(156, 39, 176, 0.3);
}

.add-field-form {
  background: var(--qui-bg-secondary);
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  border: 1px solid var(--qui-hover-border);
}

.form-title {
  margin-top: 0;
  margin-bottom: 16px;
  font-size: 16px;
  font-weight: var(--qui-font-weight-medium);
  border-bottom: 1px solid var(--qui-hover-border);
  padding-bottom: 10px;
}

.schema-editor-field-group {
  margin-bottom: 16px;
}

.schema-editor-field-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: var(--qui-font-weight-medium);
}

.schema-editor-field-input, .schema-editor-field-select {
  width: 100%;
  padding: 8px 10px;
  border-radius: 4px;
  border: 1px solid var(--qui-hover-border);
  background: var(--qui-bg-primary);
  color: var(--qui-text-primary);
  font-size: var(--qui-font-size-base);
}

.schema-editor-field-input:focus, .schema-editor-field-select:focus {
  outline: none;
  border-color: #9c27b0;
  box-shadow: 0 0 0 2px rgba(156, 39, 176, 0.2);
}

.schema-editor-field-help {
  font-size: var(--qui-font-size-small);
  color: var(--qui-text-secondary);
  margin-top: 4px;
  margin-bottom: 0;
}

.field-error {
  color: var(--qui-danger-color);
  margin-bottom: 16px;
  padding: 8px 12px;
  background: rgba(244, 67, 54, 0.1);
  border-radius: 4px;
  font-size: var(--qui-font-size-small);
}

.schema-editor-form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.cancel-button, .add-button {
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s var(--qui-animation-bounce);
}

.cancel-button {
  background: var(--qui-overlay-primary);
  border: 1px solid var(--qui-hover-border);
  color: var(--qui-text-primary);
}

.cancel-button:hover {
  background: var(--qui-overlay-secondary);
}

.add-button {
  background: #9c27b0;
  color: white;
  border: none;
}

.add-button:hover {
  background: #7b1fa2;
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(156, 39, 176, 0.3);
}

.no-fields {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: var(--qui-text-secondary);
  padding: 40px 20px;
  text-align: center;
  background: var(--qui-bg-secondary);
  border-radius: 8px;
  margin-top: 20px;
}

.fields-table-container {
  flex: 1;
  overflow: auto;
}

.fields-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
}

.fields-table th {
  text-align: left;
  padding: 12px 16px;
  background: var(--qui-bg-secondary);
  color: var(--qui-text-secondary);
  font-weight: var(--qui-font-weight-medium);
  font-size: var(--qui-font-size-small);
  border-bottom: 1px solid var(--qui-hover-border);
}

.fields-table td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--qui-hover-border);
}

.col-name {
  width: 30%;
}

.col-type {
  width: 25%;
}

.col-rank {
  width: 15%;
}

.col-actions {
  width: 15%;
  text-align: right;
}

.schema-editor-field-row:hover {
  background: var(--qui-bg-secondary);
}

.schema-editor-type-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: var(--qui-font-size-small);
  font-weight: var(--qui-font-weight-medium);
  background: rgba(0, 0, 0, 0.2);
}

.schema-editor-type-String {
  background: rgba(33, 150, 243, 0.1);
  color: #2196F3;
}

.schema-editor-type-Int, .schema-editor-type-Float {
  background: rgba(255, 152, 0, 0.1);
  color: #FF9800;
}

.schema-editor-type-Bool {
  background: rgba(76, 175, 80, 0.1);
  color: #4CAF50;
}

.schema-editor-type-EntityReference, .schema-editor-type-EntityList {
  background: rgba(156, 39, 176, 0.1);
  color: #9C27B0;
}

.schema-editor-type-Timestamp {
  background: rgba(0, 188, 212, 0.1);
  color: #00BCD4;
}

.schema-editor-type-Choice {
  background: rgba(233, 30, 99, 0.1);
  color: #E91E63;
}

.schema-editor-type-BinaryFile {
  background: rgba(158, 158, 158, 0.1);
  color: #9E9E9E;
}

.edit-button, .delete-button {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 6px;
  border-radius: 4px;
  transition: all 0.2s var(--qui-animation-bounce);
  margin-left: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.edit-button {
  color: #2196F3;
}

.edit-button:hover {
  background: rgba(33, 150, 243, 0.1);
  transform: translateY(-1px);
}

.delete-button {
  color: #F44336;
}

.delete-button:hover {
  background: rgba(244, 67, 54, 0.1);
  transform: translateY(-1px);
}

.editing-cell {
  padding: 0 !important;
}
</style>
