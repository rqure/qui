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
                      <div class="searchable-select">
                        <input
                          type="text"
                          :value="permissionSearchText.read"
                          @input="e => filterPermissions('read', (e.target as HTMLInputElement).value)"
                          class="permission-search-input"
                          placeholder="Type to search permissions..."
                          @focus="showDropdown.read = true"
                          @blur="handleSearchBlur('read')"
                          @keydown="handleSearchKeydown($event, 'read')"
                        />
                        <div v-if="showDropdown.read" class="permission-dropdown">
                          <div v-if="filteredPermissions.read.length === 0" class="no-results">No permissions found</div>
                          <div
                            v-for="(perm, idx) in filteredPermissions.read"
                            :key="perm.entityId"
                            class="permission-option"
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
                      <div class="searchable-select">
                        <input
                          type="text"
                          :value="permissionSearchText.write"
                          @input="e => filterPermissions('write', (e.target as HTMLInputElement).value)"
                          class="permission-search-input"
                          placeholder="Type to search permissions..."
                          @focus="showDropdown.write = true"
                          @blur="handleSearchBlur('write')"
                          @keydown="handleSearchKeydown($event, 'write')"
                        />
                        <div v-if="showDropdown.write" class="permission-dropdown">
                          <div v-if="filteredPermissions.write.length === 0" class="no-results">No permissions found</div>
                          <div
                            v-for="(perm, idx) in filteredPermissions.write"
                            :key="perm.entityId"
                            class="permission-option"
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
                      <div class="searchable-select">
                        <input
                          type="text"
                          :value="permissionSearchText.read"
                          @input="e => filterPermissions('read', (e.target as HTMLInputElement).value)"
                          class="permission-search-input"
                          placeholder="Type to search permissions..."
                          @focus="showDropdown.read = true"
                          @blur="handleSearchBlur('read')"
                          @keydown="handleSearchKeydown($event, 'read')"
                        />
                        <div v-if="showDropdown.read" class="permission-dropdown">
                          <div v-if="filteredPermissions.read.length === 0" class="no-results">No permissions found</div>
                          <div
                            v-for="(perm, idx) in filteredPermissions.read"
                            :key="perm.entityId"
                            class="permission-option"
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
                      <div class="searchable-select">
                        <input
                          type="text"
                          :value="permissionSearchText.write"
                          @input="e => filterPermissions('write', (e.target as HTMLInputElement).value)"
                          class="permission-search-input"
                          placeholder="Type to search permissions..."
                          @focus="showDropdown.write = true"
                          @blur="handleSearchBlur('write')"
                          @keydown="handleSearchKeydown($event, 'write')"
                        />
                        <div v-if="showDropdown.write" class="permission-dropdown">
                          <div v-if="filteredPermissions.write.length === 0" class="no-results">No permissions found</div>
                          <div
                            v-for="(perm, idx) in filteredPermissions.write"
                            :key="perm.entityId"
                            class="permission-option"
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

// Properly define type for these objects with index signatures
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

// Create a type for field-specific state management
interface FieldStateManager {
  permissionSearchText: Record<string, StringState>;
  filteredPermissions: Record<string, SuggestionState>;
  showDropdown: Record<string, BooleanState>;
  activeSuggestionIndex: Record<string, IndexState>;
}

// Create the field state manager
const fieldStateManager: FieldStateManager = {
  permissionSearchText: {},
  filteredPermissions: {},
  showDropdown: {},
  activeSuggestionIndex: {}
};

// Fix the ref types with proper interfaces
const editPermSuggestions = ref<SuggestionState>({
  read: [],
  write: []
});

// Fix activeSuggestionIndex type
const activeSuggestionIndex = ref<IndexState>({
  read: -1,
  write: -1
});

// Add state for searchable dropdowns with proper types
const permissionSearchText = ref<StringState>({
  read: '',
  write: ''
});

const showDropdown = ref<BooleanState>({
  read: false,
  write: false
});

const filteredPermissions = ref<SuggestionState>({
  read: [],
  write: []
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

// Initialize complex nested reactive objects
onMounted(() => {
  // Initialize search state for each field
  Object.keys(workingSchema.value.fields).forEach(fieldType => {
    // Create objects for field-specific state management
    fieldStateManager.permissionSearchText[fieldType] = { read: '', write: '' };
    
    fieldStateManager.filteredPermissions[fieldType] = { 
      read: [...availablePermissions.value], 
      write: [...availablePermissions.value] 
    };
    
    fieldStateManager.showDropdown[fieldType] = { read: false, write: false };
    
    fieldStateManager.activeSuggestionIndex[fieldType] = { read: -1, write: -1 };
  });
});

// Set initial filtered permissions to all available permissions
watch(() => availablePermissions.value, (perms) => {
  filteredPermissions.value.read = [...perms];
  filteredPermissions.value.write = [...perms];
}, { immediate: true });
</script>

<style scoped>
.schema-editor {
  font-family: var(--qui-font-family);
  background-color: var(--qui-bg-primary);
  padding: 20px;
  border-radius: 8px;
  box-shadow: var(--qui-shadow-default);
}

.schema-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.schema-title {
  font-size: 24px;
  font-weight: var(--qui-font-weight-medium);
  margin: 0;
  color: var(--qui-text-primary);
}

.schema-actions {
  display: flex;
  gap: 10px;
}

/* Button styles unified for consistency */
.schema-editor-btn,
.btn-add-field,
.schema-editor-btn-primary,
.schema-editor-btn-secondary,
.schema-editor-btn-danger,
.schema-editor-btn-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 6px;
  font-size: var(--qui-font-size-base);
  font-weight: var(--qui-font-weight-medium);
  font-family: var(--qui-font-family);
  cursor: pointer;
  transition: all var(--qui-transition-speed) var(--qui-animation-bounce);
  border: none;
  position: relative;
  overflow: hidden;
  text-align: center;
  white-space: nowrap;
  outline: none;
  box-sizing: border-box;
}

/* Primary button - for confirmations, saves, etc. */
.schema-editor-btn-primary {
  background-color: var(--qui-accent-color);
  color: var(--qui-bg-primary);
  padding: 8px 16px;
  box-shadow: var(--qui-shadow-default);
  border: 1px solid transparent;
}

.schema-editor-btn-primary:hover {
  background-color: var(--qui-accent-secondary);
  transform: translateY(-2px);
  box-shadow: var(--qui-shadow-accent);
}

.schema-editor-btn-primary:active {
  transform: translateY(0);
  box-shadow: var(--qui-shadow-default);
}

.schema-editor-btn-primary:disabled {
  background-color: var(--qui-overlay-secondary);
  color: var(--qui-text-secondary);
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
  opacity: 0.7;
}

/* Secondary button - for cancellations, less important actions */
.schema-editor-btn-secondary {
  background-color: var(--qui-overlay-primary);
  color: var(--qui-text-primary);
  padding: 8px 16px;
  border: 1px solid var(--qui-hover-border);
  box-shadow: var(--qui-inset-shadow);
}

.schema-editor-btn-secondary:hover {
  background-color: var(--qui-overlay-secondary);
  transform: translateY(-2px);
  box-shadow: var(--qui-shadow-default);
}

.schema-editor-btn-secondary:active {
  transform: translateY(0);
  box-shadow: var(--qui-inset-shadow);
}

/* Danger button - for deletions, destructive actions */
.schema-editor-btn-danger {
  background-color: var(--qui-danger-bg);
  color: var(--qui-danger-color);
  padding: 8px 16px;
  border: 1px solid var(--qui-danger-border);
}

.schema-editor-btn-danger:hover {
  background-color: var(--qui-danger-color);
  color: var(--qui-bg-primary);
  transform: translateY(-2px);
  box-shadow: 0 0 0 2px var(--qui-danger-glow);
}

.schema-editor-btn-danger:active {
  transform: translateY(0);
  box-shadow: var(--qui-inset-shadow);
}

/* Icon buttons - compact buttons with just icons */
.schema-editor-btn-icon {
  width: 36px;
  height: 36px;
  padding: 0;
  border-radius: 6px;
  background-color: transparent;
  color: var(--qui-text-secondary);
  border: 1px solid transparent;
}

.schema-editor-btn-icon:hover {
  background-color: var(--qui-overlay-primary);
  color: var(--qui-text-primary);
  transform: translateY(-2px);
  box-shadow: var(--qui-shadow-default);
}

.schema-editor-btn-icon:active {
  transform: translateY(0);
  background-color: var(--qui-overlay-secondary);
  box-shadow: none;
}

.schema-editor-btn-icon.schema-editor-btn-danger {
  color: var(--qui-danger-color);
}

.schema-editor-btn-icon.schema-editor-btn-danger:hover {
  background-color: var(--qui-danger-bg);
  border-color: var(--qui-danger-border);
}

/* Add field button - special styling for the add button */
.btn-add-field {
  background-color: var(--qui-bg-primary);
  color: var(--qui-accent-color);
  padding: 8px 14px;
  border: 1.5px solid var(--qui-accent-color);
  box-shadow: 0 2px 0 var(--qui-overlay-accent);
}

.btn-add-field:hover {
  background-color: var(--qui-accent-color);
  color: var(--qui-bg-primary);
  transform: translateY(-2px);
  box-shadow: var(--qui-shadow-accent);
}

.btn-add-field:active {
  transform: translateY(0);
  box-shadow: var(--qui-inset-shadow);
}

/* Action buttons container */
.action-buttons {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

/* Table and column styles */
.table-container {
  max-width: 100%;
  overflow-x: auto;
  background-color: var(--qui-bg-primary);
  border-radius: 4px;
  box-shadow: var(--qui-shadow-default);
}

.schema-editor-table {
  width: 100%;
  border-collapse: collapse;
}

.schema-editor-table th,
.schema-editor-table td {
  padding: 12px 15px;
  text-align: left;
  border-bottom: 1px solid var(--qui-hover-border);
  color: var(--qui-text-primary);
}

.schema-editor-table th {
  background-color: var(--qui-bg-secondary);
  font-weight: var(--qui-font-weight-medium);
  color: var(--qui-text-secondary);
}

.schema-editor-table tr:hover {
  background-color: var(--qui-overlay-primary);
}

.field-row {
  transition: background-color var(--qui-transition-speed);
}

.field-row.drag-over {
  background-color: var(--qui-overlay-accent);
}

.field-row.modified {
  background-color: var(--qui-overlay-light);
}

.col-drag {
  width: 40px;
  cursor: move;
}

.col-name {
  width: 200px;
}

.col-type {
  width: 120px;
}

.col-info {
  width: 250px;
}

.col-actions {
  width: 100px;
}

/* Dialog styling updates */
.dialog-footer {
  padding: 15px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  border-top: 1px solid var(--qui-hover-border);
  background-color: var(--qui-bg-secondary);
}

/* Close button styling for dialogs */
.close-btn {
  background: none;
  border: none;
  color: var(--qui-text-secondary);
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--qui-transition-speed) ease;
}

.close-btn:hover {
  background-color: var(--qui-overlay-primary);
  color: var(--qui-text-primary);
  transform: rotate(90deg);
}

.close-btn:active {
  transform: rotate(90deg) scale(0.95);
}

/* Uniform height for form inputs and buttons */
.field-input, 
.field-select, 
.schema-editor-btn-primary,
.schema-editor-btn-secondary,
.btn-add-field {
  height: 38px;
}

.schema-editor-dialog-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(var(--qui-backdrop-blur));
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.schema-editor-panel {
  background-color: var(--qui-bg-primary);
  border-radius: 8px;
  overflow: hidden;
  width: 90%;
  max-width: 500px;
  box-shadow: var(--qui-shadow-window);
  border: 1px solid var(--qui-hover-border);
}

.dialog-header {
  background-color: var(--qui-gradient-primary);
  color: var(--qui-accent-color);
  padding: 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--qui-hover-border);
}

.dialog-title {
  font-size: 18px;
  font-weight: var(--qui-font-weight-medium);
  margin: 0;
}

.field-input {
  width: 100%;
  padding: 10px;
  font-size: var(--qui-font-size-base);
  border: 1px solid var(--qui-hover-border);
  border-radius: 4px;
  transition: all var(--qui-transition-speed);
  background-color: var(--qui-bg-primary);
  color: var(--qui-text-primary);
}

.field-input:focus {
  border-color: var(--qui-accent-color);
  outline: none;
  box-shadow: 0 0 0 2px var(--qui-overlay-accent);
}

.field-input.has-error {
  border-color: var(--qui-danger-color);
}

.input-error-message {
  color: var(--qui-danger-color);
  font-size: var(--qui-font-size-small);
  margin-top: 5px;
}

.field-select {
  width: 100%;
  padding: 10px;
  font-size: var(--qui-font-size-base);
  border: 1px solid var(--qui-hover-border);
  border-radius: 4px;
  transition: all var(--qui-transition-speed);
  background-color: var(--qui-bg-primary);
  color: var(--qui-text-primary);
}

.field-select:focus {
  border-color: var(--qui-accent-color);
  outline: none;
  box-shadow: 0 0 0 2px var(--qui-overlay-accent);
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

.permission-input-container {
  position: relative;
}

.searchable-select {
  position: relative;
}

.permission-search-input {
  width: 100%;
  padding: 10px;
  font-size: var(--qui-font-size-base);
  border: 1px solid var(--qui-hover-border);
  border-radius: 4px;
  transition: border-color var(--qui-transition-speed);
  background-color: var(--qui-bg-primary);
  color: var(--qui-text-primary);
}

.permission-search-input:focus {
  border-color: var(--qui-accent-color);
  outline: none;
  box-shadow: 0 0 0 2px var(--qui-overlay-accent);
}

.permission-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background-color: var(--qui-bg-secondary);
  border: 1px solid var(--qui-hover-border);
  border-radius: 4px;
  z-index: 100;
  max-height: 200px;
  overflow-y: auto;
  box-shadow: var(--qui-shadow-default);
}

.permission-option {
  padding: 10px;
  font-size: var(--qui-font-size-base);
  cursor: pointer;
  color: var(--qui-text-primary);
}

.permission-option:hover, .permission-option.active {
  background-color: var(--qui-overlay-primary);
  color: var(--qui-accent-color);
}

.no-results {
  padding: 10px;
  color: var(--qui-text-secondary);
  font-size: var(--qui-font-size-small);
  text-align: center;
}

.choices-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.choice-tag {
  background-color: var(--qui-overlay-accent);
  color: var(--qui-accent-color);
  padding: 6px 12px;
  border-radius: 16px;
  font-size: var(--qui-font-size-small);
  display: flex;
  align-items: center;
  gap: 4px;
  border: 1px solid var(--qui-accent-color);
}

.delete-choice-btn {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
}

.delete-choice-btn:hover {
  color: var(--qui-danger-color);
}

.add-choice-btn {
  background-color: var(--qui-overlay-accent);
  color: var(--qui-accent-color);
  padding: 6px 12px;
  border-radius: 4px;
  font-size: var(--qui-font-size-small);
  cursor: pointer;
  transition: all var(--qui-transition-speed);
  border: 1px solid var(--qui-accent-color);
}

.add-choice-btn:hover {
  background-color: var(--qui-accent-color);
  color: var(--qui-bg-primary);
  box-shadow: var(--qui-shadow-accent);
}

.modified-badge {
  background-color: var(--qui-overlay-secondary);
  color: var(--qui-accent-secondary);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: var(--qui-font-size-small);
  margin-left: 8px;
}

.schema-editor-anim-scale {
  animation: scaleIn var(--qui-transition-speed) var(--qui-animation-bounce);
}

.field-properties {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.field-property {
  background-color: var(--qui-overlay-primary);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: var(--qui-font-size-small);
  color: var(--qui-text-primary);
  display: flex;
  align-items: center;
  gap: 5px;
}

.property-label {
  color: var(--qui-text-secondary);
}

.property-value {
  font-weight: var(--qui-font-weight-medium);
}

.permission-chip {
  background-color: var(--qui-overlay-accent);
  color: var(--qui-accent-color);
  padding: 1px 5px;
  border-radius: 3px;
}

.options-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.option-chip {
  background-color: var(--qui-overlay-accent);
  color: var(--qui-accent-color);
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 10px;
}

.option-more {
  color: var(--qui-text-secondary);
  font-size: 10px;
}

@keyframes scaleIn {
  from {
    transform: scale(0.9);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
