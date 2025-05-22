<template>
  <div class="schema-editor">
    <div class="schema-header">
      <h2 class="schema-title">{{ workingSchema.entityType }}</h2>
      
      <div class="schema-actions">
        <button 
          v-if="hasChanges" 
          class="schema-editor-btn schema-editor-btn-primary save-changes-btn"
          @click="saveAllChanges"
          title="Save all changes"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
            <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
          </svg>
          Save Changes
        </button>
        
        <button 
          v-if="hasChanges" 
          class="schema-editor-btn schema-editor-btn-secondary"
          @click="discardChanges"
          title="Discard all changes"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
            <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
          Discard
        </button>
        
        <button class="btn-add-field main-add-btn" @click="openAddField" title="Add new field">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
            <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
          Add Field
        </button>
      </div>
    </div>
    
    <div class="table-container">
      <table class="schema-editor-table">
        <thead>
          <tr>
            <th class="col-drag"></th>
            <th class="col-name">Field Name</th>
            <th class="col-type">Type</th>
            <th class="col-info">Properties</th>
            <th class="col-actions"></th>
          </tr>
        </thead>
        <tbody>
          <!-- New Field Row -->
          <tr v-if="showAddField" class="new-field-row">
            <td class="col-drag"></td>
            <td><input v-model="newFieldName" placeholder="Enter field name" class="field-input" @keyup.enter="addNewField" /></td>
            <td>
              <select v-model="newFieldType" class="field-select">
                <option v-for="type in Object.values(ValueType)" :key="type" :value="type">{{ getValueTypeLabel(type) }}</option>
              </select>
            </td>
            <td class="properties-cell">
              <div v-if="newFieldType === ValueType.Choice" class="property-group">
                <label>Choices:</label>
                <input v-model="newFieldChoices" placeholder="Option1, Option2, Option3" class="field-input" />
              </div>
              <div class="property-group">
                <label>Permissions:</label>
                <div class="permissions-row">
                  <span>Read:</span>
                  <input v-model="newFieldReadPerms" placeholder="user1,user2" class="field-input" />
                </div>
                <div class="permissions-row">
                  <span>Write:</span>
                  <input v-model="newFieldWritePerms" placeholder="user1,user2" class="field-input" />
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

          <!-- Use a simpler approach without vuedraggable - We'll implement simple drag functionality with direct DOM manipulation -->
          <tr 
            v-for="(field, index) in sortedFields" 
            :key="field.fieldType" 
            :class="[
              'field-row',
              { 'editing': editingField === field.fieldType, 'modified': isFieldModified(field.fieldType) }
            ]"
            :draggable="editingField !== field.fieldType"
            @dragstart="handleDragStart($event, index)"
            @dragover.prevent
            @dragenter="handleDragEnter($event, index)"
            @drop="handleDrop($event, index)"
            @dragend="handleDragEnd"
          >
            <td class="col-drag">
              <div v-if="editingField !== field.fieldType" class="drag-handle" title="Drag to reorder">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
                </svg>
              </div>
            </td>
            <td class="col-name">
              {{ field.fieldType }}
              <span v-if="isFieldModified(field.fieldType)" class="modified-badge" title="Field has unsaved changes">*</span>
            </td>
            <td class="col-type">
              <TypeBadge :type="field.fieldSchema.valueType" />
            </td>
            <td class="col-info">
              <template v-if="editingField === field.fieldType">
                <!-- Inline editing mode -->
                <div v-if="field.fieldSchema.valueType === ValueType.Choice" class="property-group">
                  <label>Choices:</label>
                  <div class="choices-list">
                    <div v-for="(choice, index) in field.fieldSchema.choices" :key="index" class="choice-tag">
                      {{ choice }}
                      <button class="delete-choice-btn" @click="removeChoice(field.fieldType, field.fieldSchema, index)" title="Remove option">×</button>
                    </div>
                    <button class="add-choice-btn" @click="addChoiceToField(field.fieldType, field.fieldSchema)" title="Add option">+</button>
                  </div>
                </div>
                <div class="property-group">
                  <label>Permissions:</label>
                  <div class="permissions-row">
                    <span>Read:</span>
                    <input v-model="permissionInputs[field.fieldType].read" class="field-input" />
                  </div>
                  <div class="permissions-row">
                    <span>Write:</span>
                    <input v-model="permissionInputs[field.fieldType].write" class="field-input" />
                  </div>
                </div>
              </template>
              <template v-else>
                <!-- Display mode -->
                <div class="field-properties">
                  <span v-if="field.fieldSchema.valueType === ValueType.Choice" class="field-property">
                    <span class="property-label">Options:</span>
                    <span class="property-value">{{ field.fieldSchema.choices.length }}</span>
                  </span>
                  
                  <span v-if="field.fieldSchema.readPermissions.length > 0" class="field-property">
                    <span class="property-label">Read Perms:</span>
                    <span class="property-value permission-chip">{{ field.fieldSchema.readPermissions.length }}</span>
                  </span>
                  
                  <span v-if="field.fieldSchema.writePermissions.length > 0" class="field-property">
                    <span class="property-label">Write Perms:</span>
                    <span class="property-value permission-chip">{{ field.fieldSchema.writePermissions.length }}</span>
                  </span>
                  
                  <span v-if="field.fieldSchema.valueType === ValueType.Choice && field.fieldSchema.choices.length > 0" class="field-property choices-preview">
                    <span class="options-list">
                      <span v-for="(choice, index) in field.fieldSchema.choices.slice(0, 3)" :key="index" class="option-chip">
                        {{ choice }}
                      </span>
                      <span v-if="field.fieldSchema.choices.length > 3" class="option-more">
                        +{{ field.fieldSchema.choices.length - 3 }} more
                      </span>
                    </span>
                  </span>
                </div>
              </template>
            </td>
            <td class="col-actions">
              <div class="action-buttons">
                <template v-if="editingField === field.fieldType">
                  <button class="schema-editor-btn-secondary" @click="cancelEditField(field.fieldType)">Cancel</button>
                  <button class="schema-editor-btn-primary" @click="confirmEdit(field.fieldType, field.fieldSchema)">Apply</button>
                </template>
                <template v-else>
                  <button class="schema-editor-btn-icon" @click="startEditField(field.fieldType)" title="Edit field">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                    </svg>
                  </button>
                  <button class="schema-editor-btn-icon schema-editor-btn-danger" @click="deleteField(field.fieldType)" title="Delete field">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                    </svg>
                  </button>
                </template>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

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

// Original schema from props
const originalSchema = ref<EntitySchema>(props.schema.clone());
// Working schema with modifications
const workingSchema = ref<EntitySchema>(props.schema.clone());
// Track modified fields
const modifiedFields = ref<Set<string>>(new Set());

// Track if the schema has any changes
const hasChanges = computed(() => modifiedFields.value.size > 0);

const editingField = ref<string | null>(null);
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

// Drag-n-drop state
const draggedIndex = ref<number | null>(null);
const dragTargetIndex = ref<number | null>(null);

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

// Native HTML5 Drag and Drop handlers
function handleDragStart(event: DragEvent, index: number) {
  if (!event.dataTransfer) return;
  
  draggedIndex.value = index;
  event.dataTransfer.effectAllowed = 'move';
  
  // Add visual indicator to the dragged element
  if (event.target instanceof HTMLElement) {
    setTimeout(() => {
      if (event.target instanceof HTMLElement) {
        event.target.classList.add('dragging');
      }
    }, 0);
  }
}

function handleDragEnter(event: DragEvent, index: number) {
  dragTargetIndex.value = index;
}

function handleDrop(event: DragEvent, index: number) {
  if (draggedIndex.value === null || draggedIndex.value === index) return;
  
  // Get the dragged and target items
  const draggedItem = sortedFields.value[draggedIndex.value];
  
  // Create a new array with the reordered items
  const newSortedFields = [...sortedFields.value];
  
  // Remove the dragged item from its original position
  newSortedFields.splice(draggedIndex.value, 1);
  
  // Insert the dragged item at the new position
  newSortedFields.splice(index, 0, draggedItem);
  
  // Update the rank values
  newSortedFields.forEach((item, idx) => {
    if (item.fieldSchema.rank !== idx) {
      item.fieldSchema.rank = idx;
      modifiedFields.value.add(item.fieldType);
    }
  });
  
  // Reset drag state
  draggedIndex.value = null;
  dragTargetIndex.value = null;
}

function handleDragEnd(event: DragEvent) {
  if (event.target instanceof HTMLElement) {
    event.target.classList.remove('dragging');
  }
  
  draggedIndex.value = null;
  dragTargetIndex.value = null;
}

// Check if a field has been modified
function isFieldModified(fieldType: string): boolean {
  return modifiedFields.value.has(fieldType);
}

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
    rank: sortedFields.value.length, // Set rank to the end of the list
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
  
  // Mark as modified
  modifiedFields.value.add(newFieldName.value);
  
  // Close add form
  showAddField.value = false;
}

function startEditField(fieldType: string) {
  // Cancel any existing editing
  if (editingField.value && editingField.value !== fieldType) {
    cancelEditField(editingField.value);
  }
  
  editingField.value = fieldType;
}

function cancelEditField(fieldType: string) {
  // If this is a modified field, restore from original schema
  if (modifiedFields.value.has(fieldType) && originalSchema.value.fields[fieldType]) {
    workingSchema.value.fields[fieldType] = originalSchema.value.fields[fieldType].clone();
    modifiedFields.value.delete(fieldType);
    
    // Reset permission inputs
    permissionInputs.value[fieldType] = {
      read: originalSchema.value.fields[fieldType].readPermissions.join(','),
      write: originalSchema.value.fields[fieldType].writePermissions.join(',')
    };
  }
  
  editingField.value = null;
}

function confirmEdit(fieldType: string, fieldSchema: FieldSchema) {
  // Update permissions from inputs
  fieldSchema.readPermissions = permissionInputs.value[fieldType].read
    .split(',').map(p => p.trim()).filter(p => p);
    
  fieldSchema.writePermissions = permissionInputs.value[fieldType].write
    .split(',').map(p => p.trim()).filter(p => p);
  
  // Ensure rank is a number
  if (typeof fieldSchema.rank === 'string') {
    fieldSchema.rank = parseInt(fieldSchema.rank as any, 10) || 0;
  }
  
  // Mark field as modified
  modifiedFields.value.add(fieldType);
  
  // Close editing mode
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
  delete permissionInputs.value[fieldType];
  
  // Mark as modified even if deleted
  modifiedFields.value.add(fieldType);
  
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
  
  // Mark field as modified
  modifiedFields.value.add(fieldType);
  
  choiceDialog.value.show = false;
}

function removeChoice(fieldType: string, fieldSchema: FieldSchema, index: number) {
  fieldSchema.choices.splice(index, 1);
  
  // Mark field as modified
  modifiedFields.value.add(fieldType);
}

// Save all changes
function saveAllChanges() {
  emit('update:schema', workingSchema.value);
  
  // Update originalSchema to match current working schema
  originalSchema.value = workingSchema.value.clone();
  
  // Clear modified fields
  modifiedFields.value.clear();
}

// Discard all changes
function discardChanges() {
  // Reset working schema to original
  workingSchema.value = originalSchema.value.clone();
  
  // Reset permission inputs
  Object.entries(originalSchema.value.fields).forEach(([fieldType, fieldSchema]) => {
    permissionInputs.value[fieldType] = {
      read: fieldSchema.readPermissions.join(','),
      write: fieldSchema.writePermissions.join(',')
    };
  });
  
  // Clear modified fields
  modifiedFields.value.clear();
  
  // Exit edit mode if active
  editingField.value = null;
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
  overflow: auto;
}

.schema-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: var(--qui-bg-secondary);
  border-bottom: 1px solid var(--qui-hover-border);
  flex-shrink: 0;
}

.schema-title {
  margin: 0;
  font-size: 20px;
  font-weight: var(--qui-font-weight-medium);
  color: var(--qui-text-primary);
}

.schema-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.save-changes-btn {
  background: var(--qui-accent-deep);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: var(--qui-font-weight-medium);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.15);
  transition: all 0.2s ease;
}

.save-changes-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
  background: var(--qui-accent-color);
}

.save-changes-btn svg {
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
}

.table-container {
  flex: 1;
  overflow: auto;
}

.schema-editor-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.col-drag {
  width: 40px;
  position: relative;
}

.col-name {
  width: 15%;
  position: relative;
}

.col-type {
  width: 12%;
}

.col-info {
  width: auto;
}

.col-actions {
  width: 120px;
}

.drag-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  color: var(--qui-text-secondary);
  opacity: 0.6;
  cursor: grab;
  transition: all 0.2s ease;
}

.drag-handle:hover {
  background: var(--qui-overlay-primary);
  color: var(--qui-text-primary);
  opacity: 1;
}

.drag-handle:active {
  cursor: grabbing;
  background: var(--qui-overlay-accent);
  color: var(--qui-accent-color);
}

.field-row.dragging {
  opacity: 0.5;
  background: var(--qui-overlay-accent) !important;
}

.field-row.dragging td {
  border-color: transparent;
}

.field-row.drag-over {
  border-top: 2px solid var(--qui-accent-color);
}

.new-field-row {
  background: var(--qui-overlay-primary);
}

.new-field-row td {
  padding: 12px 16px;
}

.field-row {
  transition: background-color 0.2s ease, transform 0.2s ease;
}

.field-row:hover {
  background-color: var(--qui-overlay-primary);
}

.field-row.editing {
  background-color: var(--qui-bg-secondary);
  border-left: 3px solid var(--qui-accent-color);
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
}

.field-row.modified {
  position: relative;
}

.modified-badge {
  display: inline-block;
  color: var(--qui-accent-color);
  font-weight: bold;
  margin-left: 5px;
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

.btn-add-field {
  display: flex;
  align-items: center;
  gap: 8px;
  background: none;
  border: none;
  padding: 8px 12px;
  color: var(--qui-bg-primary);
  cursor: pointer;
  border-radius: 4px;
  font-size: var(--qui-font-size-small);
  font-weight: var(--qui-font-weight-medium);
}

.main-add-btn {
  background: var(--qui-accent-color);
  color: var(--qui-bg-primary);
  border-radius: 6px;
  border: none;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
}

.main-add-btn:hover {
  background: var(--qui-accent-secondary);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.schema-editor-btn-primary {
  background: var(--qui-accent-color);
  color: var(--qui-bg-primary);
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: var(--qui-font-weight-medium);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  transition: all 0.2s ease;
}

.schema-editor-btn-primary:hover {
  background: var(--qui-accent-secondary);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.schema-editor-btn-secondary {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: var(--qui-font-size-small);
  font-weight: var(--qui-font-weight-medium);
  cursor: pointer;
  transition: all 0.2s ease;
}

.schema-editor-btn-secondary {
  background: var(--qui-overlay-primary);
  color: var(--qui-text-primary);
  border: 1px solid var(--qui-hover-border);
}

.schema-editor-btn-secondary:hover {
  background: var(--qui-overlay-secondary);
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

.property-group {
  margin-bottom: 12px;
}

.property-group:last-child {
  margin-bottom: 0;
}

.property-group label {
  display: block;
  font-size: var(--qui-font-size-small);
  font-weight: var(--qui-font-weight-medium);
  color: var(--qui-text-secondary);
  margin-bottom: 6px;
}

.permissions-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.permissions-row:last-child {
  margin-bottom: 0;
}

.permissions-row span {
  min-width: 45px;
  font-size: var(--qui-font-size-small);
  color: var(--qui-text-secondary);
}

.field-properties {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
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

.choices-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.choice-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background: var(--qui-overlay-primary);
  border: 1px solid var(--qui-hover-border);
  border-radius: 4px;
  font-size: var(--qui-font-size-small);
}

.delete-choice-btn {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: none;
  background: var(--qui-overlay-secondary);
  color: var(--qui-danger-color);
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  cursor: pointer;
}

.add-choice-btn {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: 1px dashed var(--qui-hover-border);
  background: transparent;
  color: var(--qui-accent-color);
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  cursor: pointer;
}

.options-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.option-chip {
  display: inline-block;
  padding: 2px 6px;
  background: var(--qui-overlay-primary);
  border-radius: 3px;
  font-size: 11px;
  color: var(--qui-text-primary);
}

.option-more {
  display: inline-block;
  font-size: 11px;
  color: var(--qui-text-secondary);
  padding: 2px 0;
}

/* Dialog styles */
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
  color: var(--qui-text-secondary);
  cursor: pointer;
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
  color: var(--qui-bg-primary);
  border: none;
}

.schema-editor-btn-primary:hover {
  background: var(--qui-accent-secondary);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.schema-editor-btn-secondary {
  background: var(--qui-overlay-primary);
  color: var(--qui-text-primary);
  border: 1px solid var(--qui-hover-border);
}

.schema-editor-btn-secondary:hover {
  background: var(--qui-overlay-secondary);
}

@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(var(--qui-accent-color-rgb), 0.4); }
  70% { box-shadow: 0 0 0 6px rgba(var(--qui-accent-color-rgb), 0); }
  100% { box-shadow: 0 0 0 0 rgba(var(--qui-accent-color-rgb), 0); }
}

@media (max-width: 1024px) {
  .schema-editor {
    padding: 0;
  }
  
  .schema-header {
    padding: 12px 16px;
  }
  
  .schema-title {
    font-size: 18px;
  }
}

@media (max-width: 768px) {
  .schema-actions {
    flex-wrap: wrap;
  }
  
  .schema-editor-table th, 
  .schema-editor-table td {
    padding: 12px 8px;
  }
  
  .field-properties {
    flex-direction: column;
    gap: 6px;
  }
}
</style>
