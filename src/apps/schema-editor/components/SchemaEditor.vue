<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { EntitySchema, FieldSchema } from '@/core/data/types';
import { ValueType } from '@/core/data/types';
import FieldEditor from './FieldEditor.vue';
import TypeBadge from './TypeBadge.vue';
import ConfirmDialog from './ConfirmDialog.vue';

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
const newFieldRank = ref(0);
const fieldError = ref<string | null>(null);

// Add state for confirmation dialog
const confirmDialog = ref({
  show: false,
  title: '',
  message: '',
  fieldToDelete: '',
  type: 'danger' as 'info' | 'warning' | 'danger'
});

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
}

function cancelAddField() {
  showAddField.value = false;
  newFieldName.value = '';
  newFieldType.value = ValueType.String;
  newFieldRank.value = 0;
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
    rank: newFieldRank.value, // Use specified rank
    readPermissions: [],
    writePermissions: [],
    choices: newFieldType.value === ValueType.Choice ? ['Option 1', 'Option 2'] : [],
    clone: function() { return JSON.parse(JSON.stringify(this)); }
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

// Modified delete field function to show confirmation dialog
function deleteField(fieldType: string) {
  confirmDialog.value = {
    show: true,
    title: 'Delete Field',
    message: `Are you sure you want to delete the field "${fieldType}"? This cannot be undone.`,
    fieldToDelete: fieldType,
    type: 'danger'
  };
}

// Handle confirmation dialog response
function confirmDeleteField() {
  const fieldType = confirmDialog.value.fieldToDelete;
  delete workingSchema.value.fields[fieldType];
  emit('update:schema', workingSchema.value);
  confirmDialog.value.show = false;
}

function cancelDeleteField() {
  confirmDialog.value.show = false;
}

// Improve the value type label function for better display
function getValueTypeLabel(type: ValueType): string {
  switch (type) {
    case ValueType.Int: return 'Integer';
    case ValueType.Float: return 'Decimal Number';
    case ValueType.String: return 'Text';
    case ValueType.Bool: return 'Boolean (Yes/No)';
    case ValueType.BinaryFile: return 'File';
    case ValueType.EntityReference: return 'Reference';
    case ValueType.Timestamp: return 'Date & Time';
    case ValueType.Choice: return 'Dropdown';
    case ValueType.EntityList: return 'List of References';
    default: return type;
  }
}

// Get the CSS class for a value type
function getValueTypeClass(type: ValueType): string {
  return `schema-editor-type-${type}`;
}
</script>

<template>
  <div class="schema-editor">
    <table class="schema-editor-table">
      <thead>
        <tr>
          <th class="col-name">Field Name</th>
          <th class="col-type">Type</th>
          <th class="col-order">Order</th>
          <th class="col-info">Properties</th>
          <th class="col-actions">
            <button class="btn-add-field" @click="openAddField" title="Add new field">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
                <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
              </svg>
            </button>
          </th>
        </tr>
      </thead>
      <tbody>
        <!-- New Field Row -->
        <tr v-if="showAddField" class="new-field-row">
          <td><input v-model="newFieldName" placeholder="Enter field name" class="field-input" /></td>
          <td>
            <select v-model="newFieldType" class="field-select">
              <option v-for="type in Object.values(ValueType)" :key="type" :value="type">{{ type }}</option>
            </select>
          </td>
          <td><input type="number" v-model="newFieldRank" min="0" class="field-input" /></td>
          <td></td>
          <td>
            <div class="action-buttons">
              <button class="schema-editor-btn-secondary" @click="cancelAddField">Cancel</button>
              <button class="schema-editor-btn-primary" @click="addNewField">Add</button>
            </div>
          </td>
        </tr>

        <!-- Existing Fields -->
        <template v-for="{ fieldType, fieldSchema } in sortedFields" :key="fieldType">
          <tr v-if="editingField !== fieldType" class="field-row" :class="{ 'selected': editingField === fieldType }">
            <td class="col-name">{{ fieldType }}</td>
            <td class="col-type">
              <TypeBadge :type="fieldSchema.valueType" />
            </td>
            <td class="col-order">{{ fieldSchema.rank || 0 }}</td>
            <td class="col-info">
              <div class="field-properties">
                <span v-if="fieldSchema.valueType === ValueType.Choice" class="field-property">
                  <span class="property-label">Options:</span>
                  <span class="property-value">{{ fieldSchema.choices.length }}</span>
                </span>
                
                <span v-if="fieldSchema.readPermissions.length > 0" class="field-property">
                  <span class="property-label">Read Perms:</span>
                  <span class="property-value permission-chip">{{ fieldSchema.readPermissions.length }}</span>
                </span>
                
                <span v-if="fieldSchema.writePermissions.length > 0" class="field-property">
                  <span class="property-label">Write Perms:</span>
                  <span class="property-value permission-chip">{{ fieldSchema.writePermissions.length }}</span>
                </span>
                
                <span v-if="fieldSchema.valueType === ValueType.Choice && fieldSchema.choices.length > 0" class="field-property choices-preview">
                  <span class="options-list">
                    <span v-for="(choice, index) in fieldSchema.choices.slice(0, 3)" :key="index" class="option-chip">
                      {{ choice }}
                    </span>
                    <span v-if="fieldSchema.choices.length > 3" class="option-more">
                      +{{ fieldSchema.choices.length - 3 }} more
                    </span>
                  </span>
                </span>
              </div>
            </td>
            <td class="col-actions">
              <div class="action-buttons">
                <button class="schema-editor-btn-icon" @click="startEditField(fieldType)" title="Edit field">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                  </svg>
                </button>
                <button class="schema-editor-btn-icon schema-editor-btn-danger" @click="deleteField(fieldType)" title="Delete field">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                  </svg>
                </button>
              </div>
            </td>
          </tr>
          <tr v-else class="field-row editing">
            <td colspan="5" class="field-editor-cell">
              <FieldEditor 
                :field-schema="fieldSchema"
                @update="updateField(fieldType, $event)"
                @cancel="cancelEditField"
              />
            </td>
          </tr>
        </template>
      </tbody>
    </table>

    <!-- Confirmation Dialog for field deletion -->
    <ConfirmDialog
      :show="confirmDialog.show"
      :title="confirmDialog.title"
      :message="confirmDialog.message"
      :type="confirmDialog.type"
      confirm-text="Delete"
      @confirm="confirmDeleteField"
      @cancel="cancelDeleteField"
    />
  </div>
</template>

<style scoped>
.schema-editor {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.schema-editor-table {
  width: 100%;
  border-collapse: collapse;
}

.new-field-row {
  background: var(--qui-overlay-primary);
}

.new-field-row td {
  padding: 8px 12px;
}

.field-input,
.field-select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--qui-hover-border);
  border-radius: 4px;
  background: var(--qui-bg-primary);
  color: var(--qui-text-primary);
}

.field-input:focus,
.field-select:focus {
  outline: none;
  border-color: var(--qui-accent-color);
  box-shadow: 0 0 0 2px var(--qui-overlay-accent);
}

.btn-add-field {
  background: none;
  border: none;
  padding: 4px;
  color: var(--qui-accent-color);
  cursor: pointer;
  border-radius: 4px;
}

.btn-add-field:hover {
  background: var(--qui-overlay-accent);
}

.action-buttons {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.schema-editor-btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background: var(--qui-overlay-primary);
  color: var(--qui-text-secondary);
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.schema-editor-btn-icon:hover {
  background: var(--qui-overlay-secondary);
  color: var(--qui-text-primary);
  transform: translateY(-2px);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.schema-editor-btn-icon.schema-editor-btn-danger:hover {
  background: var(--qui-danger-bg);
  color: var(--qui-danger-color);
  box-shadow: 0 0 0 2px var(--qui-danger-glow);
}

.schema-editor-btn-primary {
  background: var(--qui-accent-color);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
}

.schema-editor-btn-secondary {
  background: var(--qui-overlay-primary);
  color: var(--qui-text-primary);
  border: 1px solid var(--qui-hover-border);
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
}

.field-properties {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.field-property {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: var(--qui-font-size-small);
  color: var(--qui-text-secondary);
}

.property-label {
  font-weight: var(--qui-font-weight-medium);
}

.property-value {
  color: var(--qui-text-primary);
}

.options-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.option-chip {
  display: inline-block;
  padding: 2px 8px;
  background: var(--qui-overlay-primary);
  border-radius: 12px;
  font-size: 11px;
  color: var(--qui-text-primary);
}

.option-more {
  display: inline-block;
  padding: 2px 8px;
  font-size: 11px;
  color: var(--qui-text-secondary);
}

.permission-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  border-radius: 10px;
  background: var(--qui-overlay-accent);
  color: var(--qui-accent-color);
  padding: 0 6px;
  font-size: 11px;
  font-weight: var(--qui-font-weight-medium);
}

@media (max-width: 768px) {
  .field-properties {
    flex-direction: column;
    gap: 4px;
  }
}
</style>
