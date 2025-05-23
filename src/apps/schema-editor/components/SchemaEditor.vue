<template>
  <div class="schema-editor schema-editor-panel">
    <div class="schema-header schema-editor-panel-header">
      <h2 class="schema-title">{{ workingSchema.entityType }}</h2>
      
      <div class="schema-actions">
        <button 
          v-if="hasChanges" 
          class="schema-editor-btn schema-editor-btn-primary"
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
        
        <button class="schema-editor-btn schema-editor-btn-primary" @click="openAddField" title="Add new field">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
            <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
          Add Field
        </button>
      </div>
    </div>
    
    <div class="schema-editor-table-container">
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
              <div class="schema-editor-form-group">
                <input 
                  v-model="newFieldName" 
                  placeholder="Enter field name" 
                  class="schema-editor-form-control" 
                  :class="{'schema-editor-input-invalid': nameError}" 
                  @keyup.enter="addNewField"
                  @keyup.esc="cancelAddField"
                  ref="newFieldNameInput"
                  @input="validateFieldName"
                />
                <div v-if="nameError" class="schema-editor-form-error">{{ nameError }}</div>
              </div>
            </td>
            <td>
              <select 
                v-model="newFieldType" 
                class="schema-editor-form-control"
                @keyup.enter="addNewField"
              >
                <option v-for="type in Object.values(ValueType)" :key="type" :value="type">
                  {{ type }}
                </option>
              </select>
            </td>
            <td class="properties-cell">
              <div v-if="newFieldType === ValueType.Choice" class="schema-editor-form-group">
                <label>Choices:</label>
                <TagInput
                  v-model="newFieldChoicesList"
                  placeholder="Add an option and press Enter"
                  class="field-tag-input"
                  @keyup.esc="cancelAddField"
                />
              </div>
              <div class="schema-editor-form-group">
                <label>Permissions</label>
                <div class="permissions-row">
                  <span>Read:</span>
                  <div class="permission-input-container">
                    <div class="schema-editor-select">
                      <input
                        type="text"
                        :value="permissionSearchText.read"
                        @input="e => filterPermissions('read', (e.target as HTMLInputElement).value)"
                        class="schema-editor-form-control"
                        placeholder="Type to search permissions..."
                        @focus="showDropdown.read = true"
                        @blur="handleSearchBlur('read')"
                        @keydown="handleSearchKeydown($event, 'read')"
                      />
                      <div v-if="showDropdown.read" class="schema-editor-dropdown">
                        <div v-if="filteredPermissions.read.length === 0" class="no-results">No permissions found</div>
                        <div
                          v-for="(perm, idx) in filteredPermissions.read"
                          :key="perm.entityId"
                          class="schema-editor-dropdown-item"
                          :class="{ 'active': activeSuggestionIndex.read === idx }"
                          @mousedown.prevent="selectPermission('read', perm.entityId)"
                          @mouseover="activeSuggestionIndex.read = idx"
                        >
                          {{ perm.field('Name').value.getString() }}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="permissions-row">
                  <span>Write:</span>
                  <div class="permission-input-container">
                    <div class="schema-editor-select">
                      <input
                        type="text"
                        :value="permissionSearchText.write"
                        @input="e => filterPermissions('write', (e.target as HTMLInputElement).value)"
                        class="schema-editor-form-control"
                        placeholder="Type to search permissions..."
                        @focus="showDropdown.write = true"
                        @blur="handleSearchBlur('write')"
                        @keydown="handleSearchKeydown($event, 'write')"
                      />
                      <div v-if="showDropdown.write" class="schema-editor-dropdown">
                        <div v-if="filteredPermissions.write.length === 0" class="no-results">No permissions found</div>
                        <div
                          v-for="(perm, idx) in filteredPermissions.write"
                          :key="perm.entityId"
                          class="schema-editor-dropdown-item"
                          :class="{ 'active': activeSuggestionIndex.write === idx }"
                          @mousedown.prevent="selectPermission('write', perm.entityId)"
                          @mouseover="activeSuggestionIndex.write = idx"
                        >
                          {{ perm.field('Name').value.getString() }}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </td>
            <td>
              <div class="action-buttons">
                <button class="schema-editor-btn schema-editor-btn-secondary" @click="cancelAddField">Cancel</button>
                <button 
                  class="schema-editor-btn schema-editor-btn-primary" 
                  @click="addNewField"
                  :disabled="!!nameError || !newFieldName"
                >
                  Add
                </button>
              </div>
            </td>
          </tr>

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
              <span v-if="isFieldModified(field.fieldType)" class="schema-editor-badge modified-badge" title="Field has unsaved changes">*</span>
            </td>
            <td class="col-type">
              <TypeBadge :type="field.fieldSchema.valueType" />
            </td>
            <td class="col-info">
              <template v-if="editingField === field.fieldType">
                <!-- Inline editing mode -->
                <div v-if="field.fieldSchema.valueType === ValueType.Choice" class="schema-editor-form-group">
                  <label>Choices:</label>
                  <div class="choices-list">
                    <div v-for="(choice, index) in field.fieldSchema.choices" :key="index" class="schema-editor-tag choice-tag">
                      {{ choice }}
                      <button class="delete-choice-btn" @click="removeChoice(field.fieldType, field.fieldSchema, index)" title="Remove option">×</button>
                    </div>
                    <button class="schema-editor-btn schema-editor-btn-icon" @click="addChoiceToField(field.fieldType, field.fieldSchema)" title="Add option">+</button>
                  </div>
                </div>
                <div class="schema-editor-form-group">
                  <label>Permissions:</label>
                  <div class="permissions-row">
                    <span>Read:</span>
                    <div class="permission-input-container">
                      <div class="schema-editor-select">
                        <input
                          type="text"
                          :value="permissionSearchText.read"
                          @input="e => filterPermissions('read', (e.target as HTMLInputElement).value)"
                          class="schema-editor-form-control"
                          placeholder="Type to search permissions..."
                          @focus="showDropdown.read = true"
                          @blur="handleSearchBlur('read')"
                          @keydown="handleSearchKeydown($event, 'read')"
                        />
                        <div v-if="showDropdown.read" class="schema-editor-dropdown">
                          <div v-if="filteredPermissions.read.length === 0" class="no-results">No permissions found</div>
                          <div
                            v-for="(perm, idx) in filteredPermissions.read"
                            :key="perm.entityId"
                            class="schema-editor-dropdown-item"
                            :class="{ 'active': activeSuggestionIndex.read === idx }"
                            @mousedown.prevent="selectPermission('read', perm.entityId)"
                            @mouseover="activeSuggestionIndex.read = idx"
                          >
                            {{ perm.field('Name').value.getString() }}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="permissions-row">
                    <span>Write:</span>
                    <div class="permission-input-container">
                      <div class="schema-editor-select">
                        <input
                          type="text"
                          :value="permissionSearchText.write"
                          @input="e => filterPermissions('write', (e.target as HTMLInputElement).value)"
                          class="schema-editor-form-control"
                          placeholder="Type to search permissions..."
                          @focus="showDropdown.write = true"
                          @blur="handleSearchBlur('write')"
                          @keydown="handleSearchKeydown($event, 'write')"
                        />
                        <div v-if="showDropdown.write" class="schema-editor-dropdown">
                          <div v-if="filteredPermissions.write.length === 0" class="no-results">No permissions found</div>
                          <div
                            v-for="(perm, idx) in filteredPermissions.write"
                            :key="perm.entityId"
                            class="schema-editor-dropdown-item"
                            :class="{ 'active': activeSuggestionIndex.write === idx }"
                            @mousedown.prevent="selectPermission('write', perm.entityId)"
                            @mouseover="activeSuggestionIndex.write = idx"
                          >
                            {{ perm.field('Name').value.getString() }}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
              <template v-else>
                <!-- Display mode -->
                <div class="field-properties">
                  <span v-if="field.fieldSchema.valueType === ValueType.Choice" class="schema-editor-badge">
                    <span class="property-label">Options:</span>
                    <span class="property-value">{{ field.fieldSchema.choices.length }}</span>
                  </span>
                  
                  <span v-if="field.fieldSchema.readPermissions.length > 0" class="schema-editor-badge">
                    <span class="property-label">Read Perms:</span>
                    <span class="property-value permission-chip">{{ field.fieldSchema.readPermissions.length }}</span>
                  </span>
                  
                  <span v-if="field.fieldSchema.writePermissions.length > 0" class="schema-editor-badge">
                    <span class="property-label">Write Perms:</span>
                    <span class="property-value permission-chip">{{ field.fieldSchema.writePermissions.length }}</span>
                  </span>
                  
                  <span v-if="field.fieldSchema.valueType === ValueType.Choice && field.fieldSchema.choices.length > 0" class="choices-preview">
                    <span class="options-list">
                      <span v-for="(choice, index) in field.fieldSchema.choices.slice(0, 3)" :key="index" class="schema-editor-tag option-chip">
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
                  <button class="schema-editor-btn schema-editor-btn-secondary" @click="cancelEditField(field.fieldType)">Cancel</button>
                  <button class="schema-editor-btn schema-editor-btn-primary" @click="confirmEdit(field.fieldType, field.fieldSchema)">Apply</button>
                </template>
                <template v-else>
                  <button class="schema-editor-btn schema-editor-btn-icon" @click="startEditField(field.fieldType)" title="Edit field">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                    </svg>
                  </button>
                  <button class="schema-editor-btn schema-editor-btn-icon schema-editor-btn-danger" @click="deleteField(field.fieldType)" title="Delete field">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
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
      <div class="schema-editor-dialog">
        <div class="schema-editor-dialog-header">
          <h3 class="schema-editor-dialog-title">Add Choice Option</h3>
          <button class="schema-editor-dialog-close" @click="choiceDialog.show = false">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
              <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
        <div class="schema-editor-dialog-body">
          <div class="schema-editor-form-group">
            <label>Choice Value</label>
            <input 
              v-model="choiceDialog.value" 
              class="schema-editor-form-control" 
              placeholder="Enter a choice option" 
              ref="choiceDialogInput"
              @keyup.enter="confirmAddChoice"
              @keyup.esc="choiceDialog.show = false"
            />
          </div>
        </div>
        <div class="schema-editor-dialog-footer">
          <button class="schema-editor-btn schema-editor-btn-secondary" @click="choiceDialog.show = false">Cancel</button>
          <button 
            class="schema-editor-btn schema-editor-btn-primary" 
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

// Editing state
const editingField = ref<string | null>(null);
const showAddField = ref(false);

// New field state
const newFieldName = ref('');
const newFieldType = ref<ValueType>(ValueType.String);
const newFieldRank = ref(0);
const newFieldChoicesList = ref<string[]>([]);
const newFieldReadPermsList = ref<string[]>([]);
const newFieldWritePermsList = ref<string[]>([]);

// Validation and references
const nameError = ref<string | null>(null);
const newFieldNameInput = ref<HTMLInputElement | null>(null);
const choiceDialogInput = ref<HTMLInputElement | null>(null);

// Add state for confirmation dialog
const confirmDialog = ref({
  show: false,
  title: '',
  message: '',
  fieldToDelete: '',
  type: 'danger' as 'info' | 'warning' | 'danger'
});

// Dialog for adding choice options
const choiceDialog = ref({
  show: false,
  fieldType: '',
  fieldSchema: null as FieldSchema | null,
  value: ''
});

// Drag-n-drop state
const draggedIndex = ref<number | null>(null);

// Interface definitions for type safety
interface SuggestionState {
  read: Entity[];
  write: Entity[];
  [key: string]: Entity[];
}

interface IndexState {
  read: number;
  write: number;
  [key: string]: number;
}

interface BooleanState {
  read: boolean;
  write: boolean;
  [key: string]: boolean;
}

interface StringState {
  read: string;
  write: string;
  [key: string]: string;
}

// Permission-related state
const permissionInputsList = ref<Record<string, { read: string[], write: string[] }>>({});
const activeSuggestionIndex = ref<IndexState>({ read: -1, write: -1 });
const permissionSearchText = ref<StringState>({ read: '', write: '' });
const showDropdown = ref<BooleanState>({ read: false, write: false });
const filteredPermissions = ref<SuggestionState>({ read: [], write: [] });
const availablePermissions = ref<Entity[]>([]);

// Get datastore for permission search
const dataStore = useDataStore();

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
    if (!permissionInputsList.value[fieldType]) {
      permissionInputsList.value[fieldType] = {
        read: fieldSchema.readPermissions.length > 0 ? [fieldSchema.readPermissions[0]] : [],
        write: fieldSchema.writePermissions.length > 0 ? [fieldSchema.writePermissions[0]] : []
      };
    }
  });
}, { immediate: true, deep: true });

// Initialize on mount
onMounted(async () => {
  // Load all available permissions
  try {
    const result = await dataStore.find('Permission', ['Name'], () => true);
    availablePermissions.value = result.sort((a, b) => {
      const nameA = a.field('Name').value.getString();
      const nameB = b.field('Name').value.getString();
      return nameA.localeCompare(nameB);
    });
  } catch (err) {
    console.error('Failed to load permissions:', err);
  }
});

// Set initial filtered permissions to all available permissions
watch(() => availablePermissions.value, (perms) => {
  filteredPermissions.value.read = [...perms];
  filteredPermissions.value.write = [...perms];
}, { immediate: true });

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
  nameError.value = null;
  
  // Clear search text and dropdown state
  permissionSearchText.value = { read: '', write: '' };
  showDropdown.value = { read: false, write: false };
  
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
  delete permissionInputsList.value[fieldType];
  
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
  
  // Clear modified fields
  modifiedFields.value.clear();
  
  // Exit edit mode if active
  editingField.value = null;
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

function handleDragEnd() {
  const rows = document.querySelectorAll('.field-row');
  rows.forEach(row => {
    row.classList.remove('drag-over');
  });
}

// Methods for searchable dropdowns
function filterPermissions(type: 'read' | 'write', searchText: string) {
  permissionSearchText.value[type] = searchText;
  
  if (!searchText.trim()) {
    filteredPermissions.value[type] = [...availablePermissions.value];
  } else {
    const lowerSearch = searchText.toLowerCase();
    filteredPermissions.value[type] = availablePermissions.value.filter(perm => {
      const name = perm.field('Name').value.getString().toLowerCase();
      return name.includes(lowerSearch);
    });
  }
  
  // Reset active suggestion index when filtering
  activeSuggestionIndex.value[type] = -1;
}

function selectPermission(type: 'read' | 'write', permId: string) {
  // For new field permissions
  if (type === 'read') {
    newFieldReadPermsList.value = [permId];
    permissionSearchText.value.read = availablePermissions.value.find(p => p.entityId === permId)?.field('Name').value.getString() || '';
  } else {
    newFieldWritePermsList.value = [permId];
    permissionSearchText.value.write = availablePermissions.value.find(p => p.entityId === permId)?.field('Name').value.getString() || '';
  }
  
  // Hide dropdown after selection
  showDropdown.value[type] = false;
}

function handleSearchBlur(type: 'read' | 'write') {
  // Use timeout to allow click events on dropdown items to complete
  setTimeout(() => {
    showDropdown.value[type] = false;
  }, 200);
}

function handleSearchKeydown(event: KeyboardEvent, type: 'read' | 'write') {
  const currentIndex = activeSuggestionIndex.value[type];
  const items = filteredPermissions.value[type];
  
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    activeSuggestionIndex.value[type] = Math.min(currentIndex + 1, items.length - 1);
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    activeSuggestionIndex.value[type] = Math.max(currentIndex - 1, 0);
  } else if (event.key === 'Enter' && currentIndex >= 0 && items[currentIndex]) {
    event.preventDefault();
    selectPermission(type, items[currentIndex].entityId);
  } else if (event.key === 'Escape') {
    event.preventDefault();
    showDropdown.value[type] = false;
  }
}
</script>

<style scoped>
/* Component-specific styles - global shared styles are in global.css */
.schema-editor {
  height: 100%;
  display: flex;
  flex-direction: column;
  margin: 0;
  border-radius: 0;
  box-shadow: none;
}

.schema-header {
  padding: 20px;
  margin-bottom: 0;
}

.schema-title {
  font-size: 24px;
  margin: 0;
}

.schema-actions {
  display: flex;
  gap: 8px;
}

.col-drag {
  width: 40px;
}

.col-name {
  width: 180px;
}

.col-type {
  width: 100px;
}

.col-actions {
  width: 90px;
}

.drag-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  cursor: move;
  color: var(--qui-text-secondary);
}

.field-row.drag-over {
  background-color: var(--qui-overlay-accent);
}

.field-row.modified {
  background-color: var(--qui-overlay-light);
}

.field-row.editing {
  background-color: var(--qui-bg-secondary);
}

.permissions-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.permissions-row span {
  width: 50px;
  color: var(--qui-text-secondary);
  font-size: var(--qui-font-size-small);
}

.permission-input-container {
  flex: 1;
  position: relative;
}

.no-results {
  padding: 10px;
  text-align: center;
  color: var(--qui-text-secondary);
  font-style: italic;
}

.choices-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.choice-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.delete-choice-btn {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  font-size: 14px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.field-properties {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.property-label {
  color: var(--qui-text-secondary);
  font-size: var(--qui-font-size-small);
  margin-right: 4px;
}

.property-value {
  font-weight: var(--qui-font-weight-medium);
}

.permission-chip {
  background-color: var(--qui-overlay-accent);
  color: var(--qui-accent-color);
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 10px;
}

.options-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
}

.option-more {
  color: var(--qui-text-secondary);
  font-size: 10px;
}

.action-buttons {
  display: flex;
  gap: 4px;
  justify-content: flex-end;
}

.modified-badge {
  background-color: var(--qui-overlay-secondary);
  color: var(--qui-accent-secondary);
}
</style>
