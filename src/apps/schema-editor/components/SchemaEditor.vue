<template>
  <div class="schema-editor">
    <table class="schema-editor-table">
      <thead>
        <tr>
          <th class="col-name">Field Name</th>
          <th class="col-type">Type</th>
          <th class="col-order">Order</th>
          <th class="col-choices" v-if="hasAnyChoiceFields">Choices</th>
          <th class="col-permissions">Permissions</th>
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
          <td><input v-model="newFieldName" placeholder="Enter field name" class="field-input" @keyup.enter="addNewField" /></td>
          <td>
            <select v-model="newFieldType" class="field-select">
              <option v-for="type in Object.values(ValueType)" :key="type" :value="type">{{ getValueTypeLabel(type) }}</option>
            </select>
          </td>
          <td><input type="number" v-model="newFieldRank" min="0" class="field-input" /></td>
          <td v-if="hasAnyChoiceFields">
            <input v-if="newFieldType === ValueType.Choice" 
              v-model="newFieldChoices" 
              placeholder="Option1, Option2, Option3" 
              class="field-input" />
          </td>
          <td>
            <div class="permissions-container">
              <div class="permission-row">
                <span class="permission-label">Read:</span>
                <input v-model="newFieldReadPerms" placeholder="user1,user2" class="field-input permission-input" />
              </div>
              <div class="permission-row">
                <span class="permission-label">Write:</span>
                <input v-model="newFieldWritePerms" placeholder="user1,user2" class="field-input permission-input" />
              </div>
            </div>
          </td>
          <td>
            <div class="action-buttons">
              <button class="schema-editor-btn-secondary" @click="cancelAddField">Cancel</button>
              <button class="schema-editor-btn-primary" @click="addNewField">Add</button>
            </div>
          </td>
        </tr>

        <!-- Existing Fields -->
        <tr v-for="{ fieldType, fieldSchema } in sortedFields" :key="fieldType" class="field-row">
          <td class="col-name">
            {{ fieldType }}
          </td>
          <td class="col-type">
            <TypeBadge :type="fieldSchema.valueType" />
          </td>
          <td class="col-order">
            <input type="number" v-model="fieldSchema.rank" class="field-input order-input" min="0" @change="updateField(fieldType, fieldSchema)" />
          </td>
          <td v-if="hasAnyChoiceFields" class="col-choices">
            <div v-if="fieldSchema.valueType === ValueType.Choice" class="choices-container">
              <div class="choice-list">
                <div v-for="(choice, index) in fieldSchema.choices" :key="index" class="choice-tag">
                  {{ choice }}
                  <button class="delete-choice-btn" @click="removeChoice(fieldType, fieldSchema, index)" title="Remove option">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                  </button>
                </div>
                <button class="add-choice-btn" @click="addChoiceToField(fieldType, fieldSchema)" title="Add option">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                  </svg>
                </button>
              </div>
            </div>
          </td>
          <td class="col-permissions">
            <div class="permissions-container">
              <div class="permission-row">
                <span class="permission-label">Read:</span>
                <input v-model="permissionInputs[fieldType].read" 
                  @change="updatePermissions(fieldType, fieldSchema)" 
                  class="field-input permission-input" />
              </div>
              <div class="permission-row">
                <span class="permission-label">Write:</span>
                <input v-model="permissionInputs[fieldType].write" 
                  @change="updatePermissions(fieldType, fieldSchema)" 
                  class="field-input permission-input" />
              </div>
            </div>
          </td>
          <td class="col-actions">
            <div class="action-buttons">
              <button class="schema-editor-btn-icon schema-editor-btn-danger" @click="deleteField(fieldType)" title="Delete field">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                </svg>
              </button>
            </div>
          </td>
        </tr>
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

    <!-- Dialog for adding choices -->
    <div v-if="choiceDialog.show" class="schema-editor-dialog-backdrop">
      <div class="schema-editor-panel schema-editor-anim-scale">
        <div class="dialog-header">
          <h3 class="dialog-title">Add Choice Option</h3>
          <button class="close-btn" @click="choiceDialog.show = false">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
              <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
        <div class="dialog-body">
          <div class="form-group">
            <label>Choice Value</label>
            <input v-model="choiceDialog.value" class="field-input" placeholder="Enter a choice option" />
          </div>
        </div>
        <div class="dialog-footer">
          <button class="schema-editor-btn-secondary" @click="choiceDialog.show = false">Cancel</button>
          <button class="schema-editor-btn-primary" @click="confirmAddChoice">Add</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import type { EntitySchema, FieldSchema } from '@/core/data/types';
import { ValueType } from '@/core/data/types';
import TypeBadge from './TypeBadge.vue';
import ConfirmDialog from './ConfirmDialog.vue';

const props = defineProps<{
  schema: EntitySchema;
}>();

const emit = defineEmits<{
  (e: 'update:schema', schema: EntitySchema): void;
}>();

const workingSchema = ref<EntitySchema>(props.schema.clone());
const showAddField = ref(false);
const newFieldName = ref('');
const newFieldType = ref<ValueType>(ValueType.String);
const newFieldRank = ref(0);
const newFieldChoices = ref('');
const newFieldReadPerms = ref('');
const newFieldWritePerms = ref('');

// Add state for confirmation dialog
const confirmDialog = ref({
  show: false,
  title: '',
  message: '',
  fieldToDelete: '',
  type: 'danger' as 'info' | 'warning' | 'danger'
});

// Permission inputs for each field
const permissionInputs = ref<Record<string, { read: string, write: string }>>({});

// Dialog for adding choice options
const choiceDialog = ref({
  show: false,
  fieldType: '',
  fieldSchema: null as FieldSchema | null,
  value: ''
});

// Computed property to check if any field is a choice type
const hasAnyChoiceFields = computed(() => {
  return Object.values(workingSchema.value.fields).some(field => 
    field.valueType === ValueType.Choice) || newFieldType.value === ValueType.Choice;
});

// Sort fields by rank
const sortedFields = computed(() => {
  const result = Object.entries(workingSchema.value.fields).map(([fieldType, fieldSchema]) => {
    return { fieldType, fieldSchema };
  });
  
  return result.sort((a, b) => {
    const rankA = a.fieldSchema.rank || 0;
    const rankB = b.fieldSchema.rank || 0;
    return rankA - rankB;
  });
});

// Initialize permission inputs when fields change
watch(() => workingSchema.value.fields, (newFields) => {
  Object.entries(newFields).forEach(([fieldType, fieldSchema]) => {
    if (!permissionInputs.value[fieldType]) {
      permissionInputs.value[fieldType] = {
        read: fieldSchema.readPermissions.join(','),
        write: fieldSchema.writePermissions.join(',')
      };
    }
  });
}, { immediate: true, deep: true });

// Initialize on mount
onMounted(() => {
  // Initialize permission inputs for all fields
  Object.entries(workingSchema.value.fields).forEach(([fieldType, fieldSchema]) => {
    permissionInputs.value[fieldType] = {
      read: fieldSchema.readPermissions.join(','),
      write: fieldSchema.writePermissions.join(',')
    };
  });
});

function openAddField() {
  showAddField.value = true;
  newFieldName.value = '';
  newFieldType.value = ValueType.String;
  newFieldRank.value = sortedFields.value.length;
  newFieldChoices.value = '';
  newFieldReadPerms.value = '';
  newFieldWritePerms.value = '';
}

function cancelAddField() {
  showAddField.value = false;
}

function addNewField() {
  if (!newFieldName.value.trim()) {
    return; // Require a name
  }
  
  // Create field options
  let newFieldSchema = workingSchema.value.fields[newFieldName.value]?.clone() || {
    fieldType: newFieldName.value,
    valueType: newFieldType.value,
    rank: newFieldRank.value,
    choices: [],
    readPermissions: [],
    writePermissions: [],
    clone() { return { ...this }; }
  };
  
  // Set choices if it's a choice type
  if (newFieldType.value === ValueType.Choice && newFieldChoices.value) {
    newFieldSchema.choices = newFieldChoices.value.split(',').map(c => c.trim()).filter(c => c);
  }
  
  // Set permissions
  if (newFieldReadPerms.value) {
    newFieldSchema.readPermissions = newFieldReadPerms.value.split(',').map(p => p.trim()).filter(p => p);
  }
  
  if (newFieldWritePerms.value) {
    newFieldSchema.writePermissions = newFieldWritePerms.value.split(',').map(p => p.trim()).filter(p => p);
  }
  
  workingSchema.value.fields[newFieldName.value] = newFieldSchema;
  
  // Add to permission inputs map
  permissionInputs.value[newFieldName.value] = {
    read: newFieldSchema.readPermissions.join(','),
    write: newFieldSchema.writePermissions.join(',')
  };
  
  // Close add form and emit update
  showAddField.value = false;
  emit('update:schema', workingSchema.value);
}

function updateField(fieldType: string, fieldSchema: FieldSchema) {
  workingSchema.value.fields[fieldType] = fieldSchema;
  emit('update:schema', workingSchema.value);
}

function updatePermissions(fieldType: string, fieldSchema: FieldSchema) {
  // Update permissions from inputs
  fieldSchema.readPermissions = permissionInputs.value[fieldType].read
    .split(',').map(p => p.trim()).filter(p => p);
    
  fieldSchema.writePermissions = permissionInputs.value[fieldType].write
    .split(',').map(p => p.trim()).filter(p => p);
  
  updateField(fieldType, fieldSchema);
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
  delete permissionInputs.value[fieldType];
  emit('update:schema', workingSchema.value);
  confirmDialog.value.show = false;
}

function cancelDeleteField() {
  confirmDialog.value.show = false;
}

// Functions for choice options management
function addChoiceToField(fieldType: string, fieldSchema: FieldSchema) {
  choiceDialog.value = {
    show: true,
    fieldType,
    fieldSchema,
    value: ''
  };
}

function confirmAddChoice() {
  if (!choiceDialog.value.value.trim() || !choiceDialog.value.fieldSchema) return;
  
  const { fieldType, fieldSchema, value } = choiceDialog.value;
  fieldSchema.choices.push(value);
  updateField(fieldType, fieldSchema);
  choiceDialog.value.show = false;
}

function removeChoice(fieldType: string, fieldSchema: FieldSchema, index: number) {
  fieldSchema.choices.splice(index, 1);
  updateField(fieldType, fieldSchema);
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
</script>

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

.col-name {
  width: 15%;
}

.col-type {
  width: 12%;
}

.col-order {
  width: 8%;
}

.col-choices {
  width: 20%;
}

.col-permissions {
  width: 30%;
}

.col-actions {
  width: 60px;
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
  font-size: var(--qui-font-size-small);
}

.field-input:focus,
.field-select:focus {
  outline: none;
  border-color: var(--qui-accent-color);
  box-shadow: 0 0 0 2px var(--qui-overlay-accent);
}

.order-input {
  width: 60px;
  padding: 6px 8px;
  text-align: center;
}

.btn-add-field {
  background: none;
  border: none;
  padding: 4px;
  color: var(--qui-accent-color);
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
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

.permissions-container {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.permission-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.permission-label {
  font-size: var(--qui-font-size-small);
  color: var(--qui-text-secondary);
  min-width: 45px;
}

.permission-input {
  flex: 1;
  min-width: 0;
  padding: 6px 8px;
  font-size: var(--qui-font-size-small);
}

.choices-container {
  width: 100%;
}

.choice-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.choice-tag {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px 3px 8px;
  background: var(--qui-overlay-primary);
  border: 1px solid var(--qui-hover-border);
  border-radius: 12px;
  font-size: var(--qui-font-size-small);
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  gap: 6px;
}

.delete-choice-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--qui-text-secondary);
  padding: 0;
  cursor: pointer;
  transition: all 0.2s ease;
}

.delete-choice-btn:hover {
  background: var(--qui-overlay-secondary);
  color: var(--qui-danger-color);
}

.add-choice-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1px dashed var(--qui-hover-border);
  background: transparent;
  padding: 0;
  color: var(--qui-accent-color);
  cursor: pointer;
  transition: all 0.2s ease;
}

.add-choice-btn:hover {
  background: var(--qui-overlay-accent);
  transform: scale(1.1);
}

.dialog-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--qui-hover-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dialog-title {
  margin: 0;
  font-size: 18px;
  font-weight: var(--qui-font-weight-medium);
}

.close-btn {
  background: transparent;
  border: none;
  display: flex;
  cursor: pointer;
  color: var(--qui-text-secondary);
}

.dialog-body {
  padding: 20px;
}

.dialog-footer {
  padding: 16px 20px;
  border-top: 1px solid var(--qui-hover-border);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  background: var(--qui-bg-secondary);
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: var(--qui-font-weight-medium);
}

.schema-editor-btn-primary,
.schema-editor-btn-secondary {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: var(--qui-font-size-small);
  font-weight: var(--qui-font-weight-medium);
  cursor: pointer;
  transition: all 0.2s ease;
}

.schema-editor-btn-primary {
  background: var(--qui-accent-color);
  color: white;
  border: none;
}

.schema-editor-btn-primary:hover {
  background: var(--qui-accent-secondary);
  transform: translateY(-2px);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.schema-editor-btn-secondary {
  background: var(--qui-overlay-primary);
  color: var(--qui-text-primary);
  border: 1px solid var(--qui-hover-border);
}

.schema-editor-btn-secondary:hover {
  background: var(--qui-overlay-secondary);
}
</style>
