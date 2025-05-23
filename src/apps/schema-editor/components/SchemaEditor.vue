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
                        :value="newFieldPermState.searchText.value.read"
                        @input="e => filterNewFieldPermissions('read', (e.target as HTMLInputElement).value)"
                        class="schema-editor-form-control"
                        placeholder="Type to search permissions..."
                        @focus="newFieldPermState.showDropdown.value.read = true"
                        @blur="handleNewFieldSearchBlur('read')"
                        @keydown="handleNewFieldSearchKeydown($event, 'read')"
                      />
                      <div v-if="newFieldPermState.showDropdown.value.read" class="schema-editor-dropdown">
                        <div v-if="filteredPermissions.add.read.length === 0" class="no-results">No permissions found</div>
                        <div
                          v-for="(perm, idx) in filteredPermissions.add.read"
                          :key="perm.entityId"
                          class="schema-editor-dropdown-item"
                          :class="{ 'active': newFieldPermState.activeSuggestionIndex.value.read === idx }"
                          @mousedown.prevent="selectNewFieldPermission('read', perm.entityId)"
                          @mouseover="newFieldPermState.activeSuggestionIndex.value.read = idx"
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
                        :value="newFieldPermState.searchText.value.write"
                        @input="e => filterNewFieldPermissions('write', (e.target as HTMLInputElement).value)"
                        class="schema-editor-form-control"
                        placeholder="Type to search permissions..."
                        @focus="newFieldPermState.showDropdown.value.write = true"
                        @blur="handleNewFieldSearchBlur('write')"
                        @keydown="handleNewFieldSearchKeydown($event, 'write')"
                      />
                      <div v-if="newFieldPermState.showDropdown.value.write" class="schema-editor-dropdown">
                        <div v-if="filteredPermissions.add.write.length === 0" class="no-results">No permissions found</div>
                        <div
                          v-for="(perm, idx) in filteredPermissions.add.write"
                          :key="perm.entityId"
                          class="schema-editor-dropdown-item"
                          :class="{ 'active': newFieldPermState.activeSuggestionIndex.value.write === idx }"
                          @mousedown.prevent="selectNewFieldPermission('write', perm.entityId)"
                          @mouseover="newFieldPermState.activeSuggestionIndex.value.write = idx"
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
                  <TagInput
                    v-model="fieldChoicesMap[field.fieldType]"
                    placeholder="Add an option and press Enter"
                    class="field-tag-input"
                  />
                </div>
                <div class="schema-editor-form-group">
                  <label>Permissions:</label>
                  <div class="permissions-row">
                    <span>Read:</span>
                    <div class="permission-input-container">
                      <div class="schema-editor-select">
                        <input
                          type="text"
                          :value="editFieldPermState.searchText.value.read"
                          @input="e => filterEditFieldPermissions('read', (e.target as HTMLInputElement).value)"
                          class="schema-editor-form-control"
                          placeholder="Type to search permissions..."
                          @focus="editFieldPermState.showDropdown.value.read = true"
                          @blur="handleEditFieldSearchBlur('read')"
                          @keydown="handleEditFieldSearchKeydown($event, 'read')"
                        />
                        <div v-if="editFieldPermState.showDropdown.value.read" class="schema-editor-dropdown">
                          <div v-if="filteredPermissions.edit.read.length === 0" class="no-results">No permissions found</div>
                          <div
                            v-for="(perm, idx) in filteredPermissions.edit.read"
                            :key="perm.entityId"
                            class="schema-editor-dropdown-item"
                            :class="{ 'active': editFieldPermState.activeSuggestionIndex.value.read === idx }"
                            @mousedown.prevent="selectEditFieldPermission('read', perm.entityId)"
                            @mouseover="editFieldPermState.activeSuggestionIndex.value.read = idx"
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
                          :value="editFieldPermState.searchText.value.write"
                          @input="e => filterEditFieldPermissions('write', (e.target as HTMLInputElement).value)"
                          class="schema-editor-form-control"
                          placeholder="Type to search permissions..."
                          @focus="editFieldPermState.showDropdown.value.write = true"
                          @blur="handleEditFieldSearchBlur('write')"
                          @keydown="handleEditFieldSearchKeydown($event, 'write')"
                        />
                        <div v-if="editFieldPermState.showDropdown.value.write" class="schema-editor-dropdown">
                          <div v-if="filteredPermissions.edit.write.length === 0" class="no-results">No permissions found</div>
                          <div
                            v-for="(perm, idx) in filteredPermissions.edit.write"
                            :key="perm.entityId"
                            class="schema-editor-dropdown-item"
                            :class="{ 'active': editFieldPermState.activeSuggestionIndex.value.write === idx }"
                            @mousedown.prevent="selectEditFieldPermission('write', perm.entityId)"
                            @mouseover="editFieldPermState.activeSuggestionIndex.value.write = idx"
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

// Add a map to store field choices during editing
const fieldChoicesMap = ref<Record<string, string[]>>({});

// Validation and references
const nameError = ref<string | null>(null);
const newFieldNameInput = ref<HTMLInputElement | null>(null);

// Add state for confirmation dialog
const confirmDialog = ref({
  show: false,
  title: '',
  message: '',
  fieldToDelete: '',
  type: 'danger' as 'info' | 'warning' | 'danger'
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
// Existing fields permissions
const permissionInputsList = ref<Record<string, { read: string[], write: string[] }>>({});

// Separate state for editing vs adding
// For adding new fields
const newFieldPermState = {
  searchText: ref<StringState>({ read: '', write: '' }),
  showDropdown: ref<BooleanState>({ read: false, write: false }),
  activeSuggestionIndex: ref<IndexState>({ read: -1, write: -1 }),
};

// For editing existing fields
const editFieldPermState = {
  searchText: ref<StringState>({ read: '', write: '' }),
  showDropdown: ref<BooleanState>({ read: false, write: false }),
  activeSuggestionIndex: ref<IndexState>({ read: -1, write: -1 }),
  currentField: ref<string | null>(null), // Track which field is being edited
};

// Shared filtered permissions state
const filteredPermissions = ref<{
  add: SuggestionState;
  edit: SuggestionState;
}>({
  add: { read: [], write: [] },
  edit: { read: [], write: [] }
});

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
  filteredPermissions.value.add.read = [...perms];
  filteredPermissions.value.add.write = [...perms];
  filteredPermissions.value.edit.read = [...perms];
  filteredPermissions.value.edit.write = [...perms];
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
  
  // Reset add field permission state
  newFieldPermState.searchText.value = { read: '', write: '' };
  newFieldPermState.showDropdown.value = { read: false, write: false };
  newFieldPermState.activeSuggestionIndex.value = { read: -1, write: -1 };
  
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
  editFieldPermState.currentField.value = fieldType;
  
  // Initialize choices for the field being edited
  fieldChoicesMap.value[fieldType] = [...workingSchema.value.fields[fieldType].choices || []];
  
  // Reset edit field permission state
  editFieldPermState.searchText.value = { read: '', write: '' };
  editFieldPermState.showDropdown.value = { read: false, write: false };
  editFieldPermState.activeSuggestionIndex.value = { read: -1, write: -1 };
  
  // Set initial values for read/write permissions in search fields
  const permissions = permissionInputsList.value[fieldType];
  if (permissions) {
    // Populate search text with current permission names for better UX
    if (permissions.read.length > 0) {
      const readPermId = permissions.read[0];
      const readPerm = availablePermissions.value.find(p => p.entityId === readPermId);
      if (readPerm) {
        editFieldPermState.searchText.value.read = readPerm.field('Name').value.getString();
      }
    }
    
    if (permissions.write.length > 0) {
      const writePermId = permissions.write[0];
      const writePerm = availablePermissions.value.find(p => p.entityId === writePermId);
      if (writePerm) {
        editFieldPermState.searchText.value.write = writePerm.field('Name').value.getString();
      }
    }
  }
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
  
  // Update choices from the map
  if (fieldSchema.valueType === ValueType.Choice && fieldChoicesMap.value[fieldType]) {
    fieldSchema.choices = [...fieldChoicesMap.value[fieldType]];
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
  
  if (fromIndex === null || fromIndex === toIndex) return; // Fixed missing parenthesis
  
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

// Methods for searchable dropdowns - for adding new fields
function filterNewFieldPermissions(type: 'read' | 'write', searchText: string) {
  newFieldPermState.searchText.value[type] = searchText;
  
  if (!searchText.trim()) {
    filteredPermissions.value.add[type] = [...availablePermissions.value];
  } else {
    const lowerSearch = searchText.toLowerCase();
    filteredPermissions.value.add[type] = availablePermissions.value.filter(perm => {
      const name = perm.field('Name').value.getString().toLowerCase();
      return name.includes(lowerSearch);
    });
  }
  
  // Reset active suggestion index when filtering
  newFieldPermState.activeSuggestionIndex.value[type] = -1;
}

function selectNewFieldPermission(type: 'read' | 'write', permId: string) {
  if (type === 'read') {
    newFieldReadPermsList.value = [permId];
    newFieldPermState.searchText.value.read = availablePermissions.value.find(p => p.entityId === permId)?.field('Name').value.getString() || '';
  } else {
    newFieldWritePermsList.value = [permId];
    newFieldPermState.searchText.value.write = availablePermissions.value.find(p => p.entityId === permId)?.field('Name').value.getString() || '';
  }
  
  // Hide dropdown after selection
  newFieldPermState.showDropdown.value[type] = false;
}

function handleNewFieldSearchBlur(type: 'read' | 'write') {
  // Use timeout to allow click events on dropdown items to complete
  setTimeout(() => {
    newFieldPermState.showDropdown.value[type] = false;
  }, 200);
}

function handleNewFieldSearchKeydown(event: KeyboardEvent, type: 'read' | 'write') {
  const currentIndex = newFieldPermState.activeSuggestionIndex.value[type];
  const items = filteredPermissions.value.add[type];
  
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    newFieldPermState.activeSuggestionIndex.value[type] = Math.min(currentIndex + 1, items.length - 1);
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    newFieldPermState.activeSuggestionIndex.value[type] = Math.max(currentIndex - 1, 0);
  } else if (event.key === 'Enter' && currentIndex >= 0 && items[currentIndex]) {
    event.preventDefault();
    selectNewFieldPermission(type, items[currentIndex].entityId);
  } else if (event.key === 'Escape') {
    event.preventDefault();
    newFieldPermState.showDropdown.value[type] = false;
  }
}

// Methods for searchable dropdowns - for editing fields
function filterEditFieldPermissions(type: 'read' | 'write', searchText: string) {
  editFieldPermState.searchText.value[type] = searchText;
  
  if (!searchText.trim()) {
    filteredPermissions.value.edit[type] = [...availablePermissions.value];
  } else {
    const lowerSearch = searchText.toLowerCase();
    filteredPermissions.value.edit[type] = availablePermissions.value.filter(perm => {
      const name = perm.field('Name').value.getString().toLowerCase();
      return name.includes(lowerSearch);
    });
  }
  
  // Reset active suggestion index when filtering
  editFieldPermState.activeSuggestionIndex.value[type] = -1;
}

function selectEditFieldPermission(type: 'read' | 'write', permId: string) {
  const fieldType = editFieldPermState.currentField.value;
  if (fieldType && permissionInputsList.value[fieldType]) {
    if (type === 'read') {
      permissionInputsList.value[fieldType].read = [permId];
      editFieldPermState.searchText.value.read = availablePermissions.value.find(p => p.entityId === permId)?.field('Name').value.getString() || '';
    } else {
      permissionInputsList.value[fieldType].write = [permId];
      editFieldPermState.searchText.value.write = availablePermissions.value.find(p => p.entityId === permId)?.field('Name').value.getString() || '';
    }
    
    // Hide dropdown after selection
    editFieldPermState.showDropdown.value[type] = false;
  }
}

function handleEditFieldSearchBlur(type: 'read' | 'write') {
  // Use timeout to allow click events on dropdown items to complete
  setTimeout(() => {
    editFieldPermState.showDropdown.value[type] = false;
  }, 200);
}

function handleEditFieldSearchKeydown(event: KeyboardEvent, type: 'read' | 'write') {
  const currentIndex = editFieldPermState.activeSuggestionIndex.value[type];
  const items = filteredPermissions.value.edit[type];
  
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    editFieldPermState.activeSuggestionIndex.value[type] = Math.min(currentIndex + 1, items.length - 1);
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    editFieldPermState.activeSuggestionIndex.value[type] = Math.max(currentIndex - 1, 0);
  } else if (event.key === 'Enter' && currentIndex >= 0 && items[currentIndex]) {
    event.preventDefault();
    selectEditFieldPermission(type, items[currentIndex].entityId);
  } else if (event.key === 'Escape') {
    event.preventDefault();
    editFieldPermState.showDropdown.value[type] = false;
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
  align-items: center;
}

.choice-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: var(--qui-overlay-accent);
  color: var(--qui-accent-color);
  border: 1px solid var(--qui-hover-border);
}

.delete-choice-btn {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  font-size: 14px;
  padding: 0;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.choice-tag:hover .delete-choice-btn {
  background: rgba(255, 255, 255, 0.2);
}

.delete-choice-btn:hover {
  background: rgba(0, 0, 0, 0.1);
  transform: scale(1.1);
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

.option-chip {
  background: var(--qui-overlay-primary);
  color: var(--qui-text-primary);
  border: 1px solid var(--qui-hover-border);
  font-weight: var(--qui-font-weight-medium);
}

.option-chip:hover {
  background: var(--qui-overlay-secondary);
  color: var(--qui-bg-primary);
}

.option-more {
  color: var(--qui-text-secondary);
  font-size: 10px;
}

.action-buttons {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.modified-badge {
  background-color: var(--qui-overlay-secondary);
  color: var(--qui-accent-secondary);
}

/* Form control consistency improvements */
.schema-editor-form-control {
  height: 32px !important; /* Enforce consistent height */
  line-height: 32px;
  padding: 0 10px;
  box-sizing: border-box;
  width: 100%;
}

/* Better dropdown styling */
.schema-editor-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 100;
  margin-top: 4px;
  background-color: var(--qui-bg-primary);
  border: 1px solid var(--qui-hover-border);
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  max-height: 200px;
  overflow-y: auto;
  animation: schema-editor-fade-in-dropdown 0.2s ease;
}

.schema-editor-dropdown-item {
  padding: 8px 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: var(--qui-font-size-small);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.schema-editor-dropdown-item:last-child {
  border-bottom: none;
}

.schema-editor-dropdown-item:hover, 
.schema-editor-dropdown-item.active {
  background: var(--qui-overlay-primary);
  color: var(--qui-accent-color);
}

/* Style select dropdown to match our custom dropdowns */
select.schema-editor-form-control {
  appearance: none;
  padding-right: 28px; /* Space for the dropdown icon */
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.5)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 6px center;
  background-size: 16px;
  cursor: pointer;
}

/* Improve new field row styling */
.new-field-row td {
  padding: 12px;
  vertical-align: top;
}

.new-field-row .schema-editor-form-group {
  margin-bottom: 0;
}

/* Consistent table cell alignment */
.schema-editor-table td {
  vertical-align: middle;
}

/* Animation for dropdown */
@keyframes schema-editor-fade-in-dropdown {
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Ensure dropdown container maintains position context */
.schema-editor-select {
  position: relative;
  width: 100%;
}
</style>
