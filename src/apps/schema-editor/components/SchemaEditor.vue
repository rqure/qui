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
            <td>
              <div class="field-input-wrapper">
                <input 
                  v-model="newFieldName" 
                  placeholder="Enter field name" 
                  class="field-input" 
                  :class="{'has-error': nameError}" 
                  @keyup.enter="addNewField"
                  @keyup.esc="cancelAddField"
                  ref="newFieldNameInput"
                  @input="validateFieldName"
                />
                <div v-if="nameError" class="input-error-message">{{ nameError }}</div>
              </div>
            </td>
            <td>
              <select 
                v-model="newFieldType" 
                class="field-select"
                @keyup.enter="addNewField"
              >
                <option v-for="type in Object.values(ValueType)" :key="type" :value="type">
                  {{ type }}
                </option>
              </select>
            </td>
            <td class="properties-cell">
              <div v-if="newFieldType === ValueType.Choice" class="property-group">
                <label>Choices:</label>
                <TagInput
                  v-model="newFieldChoicesList"
                  placeholder="Add an option and press Enter"
                  class="field-tag-input"
                  @keyup.esc="cancelAddField"
                />
              </div>
              <div class="property-group">
                <div class="permissions-section">
                  <label>Permissions</label>
                  <div class="permissions-row">
                    <span>Read:</span>
                    <div class="permission-input-container">
                      <select
                        :value="newFieldReadPermsList.length > 0 ? newFieldReadPermsList[0] : ''"
                        class="field-select permission-select"
                        @change="(e) => handleReadPermissionChange(e)"
                      >
                        <option value="">Select permission</option>
                        <option v-for="perm in availablePermissions" :key="perm.entityId" :value="perm.entityId">
                          {{ perm.field('Name').value.getString() }}
                        </option>
                      </select>
                    </div>
                  </div>
                  <div class="permissions-row">
                    <span>Write:</span>
                    <div class="permission-input-container">
                      <select
                        :value="newFieldWritePermsList.length > 0 ? newFieldWritePermsList[0] : ''"
                        class="field-select permission-select"
                        @change="(e) => handleWritePermissionChange(e)"
                      >
                        <option value="">Select permission</option>
                        <option v-for="perm in availablePermissions" :key="perm.entityId" :value="perm.entityId">
                          {{ perm.field('Name').value.getString() }}
                        </option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </td>
            <td>
              <div class="action-buttons">
                <button class="schema-editor-btn-secondary" @click="cancelAddField">Cancel</button>
                <button 
                  class="schema-editor-btn-primary" 
                  @click="addNewField"
                  :disabled="!!nameError || !newFieldName"
                >
                  Add
                </button>
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
                    <div class="permission-input-container">
                      <select
                        :value="permissionInputsList[field.fieldType].read.length > 0 ? permissionInputsList[field.fieldType].read[0] : ''"
                        class="field-select permission-select"
                        @change="(e) => handleEditPermissionChange(field.fieldType, 'read', e)"
                      >
                        <option value="">Select permission</option>
                        <option v-for="perm in availablePermissions" :key="perm.entityId" :value="perm.entityId">
                          {{ perm.field('Name').value.getString() }}
                        </option>
                      </select>
                    </div>
                  </div>
                  <div class="permissions-row">
                    <span>Write:</span>
                    <div class="permission-input-container">
                      <select
                        :value="permissionInputsList[field.fieldType].write.length > 0 ? permissionInputsList[field.fieldType].write[0] : ''"
                        class="field-select permission-select"
                        @change="(e) => handleEditPermissionChange(field.fieldType, 'write', e)"
                      >
                        <option value="">Select permission</option>
                        <option v-for="perm in availablePermissions" :key="perm.entityId" :value="perm.entityId">
                          {{ perm.field('Name').value.getString() }}
                        </option>
                      </select>
                    </div>
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
            <input 
              v-model="choiceDialog.value" 
              class="field-input" 
              placeholder="Enter a choice option" 
              ref="choiceDialogInput"
              @keyup.enter="confirmAddChoice"
              @keyup.esc="choiceDialog.show = false"
            />
          </div>
        </div>
        <div class="dialog-footer">
          <button class="schema-editor-btn-secondary" @click="choiceDialog.show = false">Cancel</button>
          <button 
            class="schema-editor-btn-primary" 
            @click="confirmAddChoice"
            :disabled="!choiceDialog.value.trim()"
          >Add</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import type { EntitySchema, FieldSchema, Entity, EntityId } from '@/core/data/types';
import { ValueType } from '@/core/data/types';
import { useDataStore } from '@/stores/data';
import TypeBadge from './TypeBadge.vue';
import ConfirmDialog from './ConfirmDialog.vue';
import TagInput from './TagInput.vue';

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

// Form validation state
const nameError = ref<string | null>(null);
const newFieldNameInput = ref<HTMLInputElement | null>(null);
const choiceDialogInput = ref<HTMLInputElement | null>(null);

// Convert comma-separated strings to arrays for tag inputs
const newFieldChoicesList = ref<string[]>([]);
const newFieldReadPermsList = ref<string[]>([]);
const newFieldWritePermsList = ref<string[]>([]);

// Permission inputs converted to arrays for tag inputs
const permissionInputsList = ref<Record<string, { read: string[], write: string[] }>>({});

// Permission suggestions for autocomplete
const readPermSuggestions = ref<Entity[]>([]);
const writePermSuggestions = ref<Entity[]>([]);
const editPermSuggestions = ref<{read: Entity[], write: Entity[]}>({
  read: [],
  write: []
});

// Active suggestion index for keyboard navigation
const activeSuggestionIndex = ref<number>(-1);
const editActiveSuggestionIndex = ref<{read: number, write: number}>({
  read: -1,
  write: -1
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

// Get datastore for permission search
const dataStore = useDataStore();

// Add state for permission search input
const permissionSearchReadInput = ref('');
const permissionSearchWriteInput = ref('');

// Add state for edit field permission inputs
const editFieldPermissionInputs = ref<Record<string, { read: string, write: string }>>({});

// Available permissions for dropdowns
const availablePermissions = ref<Entity[]>([]);

// Initialize permission inputs when fields change
watch(() => workingSchema.value.fields, (newFields) => {
  Object.entries(newFields).forEach(([fieldType, fieldSchema]) => {
    if (!permissionInputsList.value[fieldType]) {
      permissionInputsList.value[fieldType] = {
        read: fieldSchema.readPermissions.length > 0 ? [fieldSchema.readPermissions[0]] : [],
        write: fieldSchema.writePermissions.length > 0 ? [fieldSchema.writePermissions[0]] : []
      };
    }
    
    if (!editFieldPermissionInputs.value[fieldType]) {
      editFieldPermissionInputs.value[fieldType] = {
        read: '',
        write: ''
      };
    }
  });
}, { immediate: true, deep: true });

// Initialize on mount
onMounted(async () => {
  // Initialize permission inputs for all fields
  Object.entries(workingSchema.value.fields).forEach(([fieldType, fieldSchema]) => {
    permissionInputs.value[fieldType] = {
      read: fieldSchema.readPermissions.join(','),
      write: fieldSchema.writePermissions.join(',')
    };
    
    editFieldPermissionInputs.value[fieldType] = {
      read: '',
      write: ''
    };
  });

  // Load all available permissions
  try {
    // Using 3 arguments instead of 4 (fixed)
    const result = await dataStore.find('Permission', ['Name'], () => true);
    availablePermissions.value = result.sort((a, b) => {
      const nameA = a.field('Name').value.getString();
      const nameB = b.field('Name').value.getString();
      return nameA.localeCompare(nameB);
    });
    console.log(`Loaded ${availablePermissions.value.length} permissions`);
  } catch (err) {
    console.error('Failed to load permissions:', err);
  }
});

// Check if a field has been modified
function isFieldModified(fieldType: string): boolean {
  return modifiedFields.value.has(fieldType);
}

// Validate field name
function validateFieldName() {
  if (!newFieldName.value) {
    nameError.value = null;
    return;
  }
  
  // Check for valid format (no spaces, special characters)
  const validName = /^[a-zA-Z][a-zA-Z0-9_]*$/.test(newFieldName.value);
  if (!validName) {
    nameError.value = "Invalid name format";
    return;
  }
  
  // Check if field name already exists
  if (workingSchema.value.fields[newFieldName.value]) {
    nameError.value = "Field name already exists";
    return;
  }
  
  nameError.value = null;
}

function openAddField() {
  showAddField.value = true;
  newFieldName.value = '';
  newFieldType.value = ValueType.String;
  newFieldRank.value = sortedFields.value.length;
  newFieldChoicesList.value = [];
  newFieldReadPermsList.value = [];
  newFieldWritePermsList.value = [];
  permissionSearchReadInput.value = '';
  permissionSearchWriteInput.value = '';
  nameError.value = null;
  
  // Focus on the field name input after DOM update
  nextTick(() => {
    newFieldNameInput.value?.focus();
  });
}

function cancelAddField() {
  showAddField.value = false;
}

function addNewField() {
  if (!newFieldName.value.trim()) {
    nameError.value = "Field name is required";
    return;
  }
  
  if (nameError.value) {
    return; // Don't proceed if there are validation errors
  }
  
  // Create field options
  let newFieldSchema = workingSchema.value.fields[newFieldName.value]?.clone() || {
    fieldType: newFieldName.value,
    valueType: newFieldType.value,
    rank: sortedFields.value.length,
    choices: [],
    readPermissions: [],
    writePermissions: [],
    clone() { return { ...this }; }
  };
  
  // Set choices if it's a choice type
  if (newFieldType.value === ValueType.Choice) {
    newFieldSchema.choices = newFieldChoicesList.value;
  }
  
  // Set permissions
  newFieldSchema.readPermissions = newFieldReadPermsList.value;
  newFieldSchema.writePermissions = newFieldWritePermsList.value;
  
  workingSchema.value.fields[newFieldName.value] = newFieldSchema;
  
  // Add to permission inputs map using the array format
  permissionInputsList.value[newFieldName.value] = {
    read: [...newFieldSchema.readPermissions],
    write: [...newFieldSchema.writePermissions]
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
  // Update permissions - limit to first permission only
  if (permissionInputsList.value[fieldType].read.length > 0) {
    fieldSchema.readPermissions = [permissionInputsList.value[fieldType].read[0]];
  } else {
    fieldSchema.readPermissions = [];
  }
  
  if (permissionInputsList.value[fieldType].write.length > 0) {
    fieldSchema.writePermissions = [permissionInputsList.value[fieldType].write[0]];
  } else {
    fieldSchema.writePermissions = [];
  }
  
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
  
  // Focus on the input after dialog is shown
  nextTick(() => {
    choiceDialogInput.value?.focus();
  });
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

// Native HTML5 Drag and Drop handlers
function handleDragStart(event: DragEvent, index: number) {
  draggedIndex.value = index;
  event.dataTransfer?.setData('text/plain', String(index));
}

function handleDragEnter(event: DragEvent, index: number) {
  if (draggedIndex.value === null) return;
  
  // Highlight the target row
  const rows = document.querySelectorAll('.field-row');
  rows.forEach((row, i) => {
    if (i === index) {
      row.classList.add('drag-over');
    } else {
      row.classList.remove('drag-over');
    }
  });
}

function handleDrop(event: DragEvent, index: number) {
  event.preventDefault();
  
  const fromIndex = draggedIndex.value;
  const toIndex = index;
  
  if (fromIndex === null || fromIndex === toIndex) return;
  
  // Reorder fields array
  const fieldsArray = sortedFields.value.map(field => field.fieldType);
  const [movedField] = fieldsArray.splice(fromIndex, 1);
  fieldsArray.splice(toIndex, 0, movedField);
  
  // Update ranks based on new order
  fieldsArray.forEach((fieldType, index) => {
    const field = workingSchema.value.fields[fieldType];
    if (field) {
      field.rank = index;
    }
  });
  
  // Mark as modified
  modifiedFields.value.add(fieldsArray[toIndex]);
  
  draggedIndex.value = null;
}

function handleDragEnd(event: DragEvent) {
  const rows = document.querySelectorAll('.field-row');
  rows.forEach(row => {
    row.classList.remove('drag-over');
  });
}

// Handle permission changes for new fields
function handleReadPermissionChange(event: Event): void {
  const target = event.target as HTMLSelectElement;
  const value = target?.value || '';
  
  if (value) {
    newFieldReadPermsList.value = [value];
  } else {
    newFieldReadPermsList.value = [];
  }
}

function handleWritePermissionChange(event: Event): void {
  const target = event.target as HTMLSelectElement;
  const value = target?.value || '';
  
  if (value) {
    newFieldWritePermsList.value = [value];
  } else {
    newFieldWritePermsList.value = [];
  }
}

// Update the edit permissions handler
function handleEditPermissionChange(fieldType: string, type: 'read' | 'write', event: Event): void {
  const target = event.target as HTMLSelectElement;
  const value = target?.value || '';
  
  if (value) {
    permissionInputsList.value[fieldType][type] = [value];
  } else {
    permissionInputsList.value[fieldType][type] = [];
  }
  
  // Mark the field as modified when permissions change
  modifiedFields.value.add(fieldType);
  console.log(`Updated ${type} permissions for ${fieldType}`);
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
  width: 20%;
  position: relative;
}

.col-type {
  width: 15%;
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
  padding: 16px;
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
  padding: 10px 12px;
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
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: var(--qui-font-size-small);
  font-weight: var(--qui-font-weight-medium);
  color: var(--qui-text-secondary);
  margin-bottom: 6px;
}

.permissions-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.permissions-row:last-child {
  margin-bottom: 0;
}

.permissions-row span {
  min-width: 45px;
  font-size: var(--qui-font-size-small);
  color: var(--qui-text-secondary);
}

.permissions-section {
  padding: 8px 0;
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

.field-input-wrapper {
  position: relative;
  width: 100%;
}

.field-input.has-error {
  border-color: var(--qui-danger-color);
  box-shadow: 0 0 0 1px var(--qui-danger-color);
}

.input-error-message {
  color: var(--qui-danger-color);
  font-size: 11px;
  margin-top: 4px;
  animation: fade-in 0.2s ease;
}

.field-tag-input {
  width: 100%;
  min-height: 36px;
}

/* Hover and focus effect for inputs */
.field-input:hover, 
.field-select:hover {
  border-color: var(--qui-hover-border-dark, #aaa);
}

.field-input:focus, 
.field-select:focus {
  outline: none;
  border-color: var(--qui-accent-color);
  box-shadow: 0 0 0 2px var(--qui-overlay-accent);
  transform: translateY(-1px);
  transition: all 0.2s ease;
}

/* New styles for toggle button */
.toggle-perms-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--qui-overlay-primary);
  border: 1px solid var(--qui-hover-border);
  border-radius: 4px;
  color: var(--qui-text-secondary);
  font-size: var(--qui-font-size-small);
  cursor: pointer;
  transition: all 0.2s ease;
}

.toggle-perms-btn:hover {
  background: var(--qui-overlay-secondary);
  color: var(--qui-text-primary);
}

.toggle-perms-btn svg {
  opacity: 0.7;
}

.toggle-btn {
  background: var(--qui-overlay-primary);
  border: none;
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 11px;
  color: var(--qui-text-secondary);
  cursor: pointer;
}

.toggle-btn:hover {
  background: var(--qui-overlay-secondary);
  color: var(--qui-text-primary);
}

.permission-group {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed var(--qui-hover-border);
}

@keyframes shake {
  10%, 90% { transform: translateX(-1px); }
  20%, 80% { transform: translateX(2px); }
  30%, 50%, 70% { transform: translateX(-3px); }
  40%, 60% { transform: translateX(3px); }
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.permission-input-container {
  position: relative;
  width: 100%;
}

.permission-input {
  width: 100%;
  padding: 10px 12px;
  font-size: var(--qui-font-size-small);
}

.permission-select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--qui-hover-border);
  border-radius: 4px;
  background: var(--qui-bg-primary);
  color: var(--qui-text-primary);
  font-size: var(--qui-font-size-small);
  cursor: pointer;
  appearance: auto; /* Allow native dropdown appearance */
}

.permission-select:focus {
  outline: none;
  border-color: var(--qui-accent-color);
  box-shadow: 0 0 0 2px var(--qui-overlay-accent);
}

/* Remove these style rules as they're for the old approach */
.permission-suggestions,
.suggestion-item,
.permission-tag,
.permission-tag-remove {
  display: none;
}
</style>
