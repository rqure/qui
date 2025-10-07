<template>
  <div class="schema-editor schema-editor-panel">
    <div class="schema-header schema-editor-panel-header">
      <h2 class="schema-title">{{ entityTypeName }}</h2>
      
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
            <th class="col-info">Default Value</th>
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
                <option value="String">String</option>
                <option value="Int">Int</option>
                <option value="Float">Float</option>
                <option value="Bool">Bool</option>
                <option value="EntityReference">EntityReference</option>
                <option value="EntityList">EntityList</option>
                <option value="Timestamp">Timestamp</option>
                <option value="Blob">Blob</option>
                <option value="Choice">Choice</option>
              </select>
            </td>
            <td class="properties-cell">
              <input 
                v-if="newFieldType === 'String'"
                v-model="newFieldDefaultString"
                placeholder="Default string value"
                class="schema-editor-form-control"
              />
              <input 
                v-else-if="newFieldType === 'Int'"
                v-model.number="newFieldDefaultInt"
                type="number"
                placeholder="Default number"
                class="schema-editor-form-control"
              />
              <input 
                v-else-if="newFieldType === 'Float'"
                v-model.number="newFieldDefaultFloat"
                type="number"
                step="0.01"
                placeholder="Default float"
                class="schema-editor-form-control"
              />
              <select 
                v-else-if="newFieldType === 'Bool'"
                v-model="newFieldDefaultBool"
                class="schema-editor-form-control"
              >
                <option :value="true">True</option>
                <option :value="false">False</option>
              </select>
              <TagInput
                v-else-if="newFieldType === 'Choice'"
                v-model="newFieldChoicesList"
                placeholder="Add choice options"
                class="field-tag-input"
              />
              <span v-else class="field-default-display">{{ getDefaultValueDisplay(newFieldType) }}</span>
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
              {{ field.fieldName }}
              <span v-if="isFieldModified(field.fieldType)" class="schema-editor-badge modified-badge" title="Field has unsaved changes">*</span>
            </td>
            <td class="col-type">
              <TypeBadge :type="field.valueType" />
            </td>
            <td class="col-info">
              <template v-if="editingField === field.fieldType">
                <!-- Editing default value -->
                <input 
                  v-if="field.valueType === 'String'"
                  v-model="editingDefaults[field.fieldType].string"
                  placeholder="Default string value"
                  class="schema-editor-form-control"
                />
                <input 
                  v-else-if="field.valueType === 'Int'"
                  v-model.number="editingDefaults[field.fieldType].int"
                  type="number"
                  placeholder="Default number"
                  class="schema-editor-form-control"
                />
                <input 
                  v-else-if="field.valueType === 'Float'"
                  v-model.number="editingDefaults[field.fieldType].float"
                  type="number"
                  step="0.01"
                  placeholder="Default float"
                  class="schema-editor-form-control"
                />
                <select 
                  v-else-if="field.valueType === 'Bool'"
                  v-model="editingDefaults[field.fieldType].bool"
                  class="schema-editor-form-control"
                >
                  <option :value="true">True</option>
                  <option :value="false">False</option>
                </select>
                <TagInput
                  v-else-if="field.valueType === 'Choice'"
                  v-model="editingDefaults[field.fieldType].choices"
                  placeholder="Add choice options"
                  class="field-tag-input"
                />
                <span v-else class="field-default-display">{{ formatValue(field.fieldSchema.default_value) }}</span>
              </template>
              <template v-else>
                <!-- Display default value -->
                <span class="field-default-display">{{ formatValue(field.fieldSchema.default_value) }}</span>
              </template>
            </td>
            <td class="col-actions">
              <div class="action-buttons">
                <template v-if="editingField === field.fieldType">
                  <button class="schema-editor-btn schema-editor-btn-secondary" @click="cancelEditField(field.fieldType)">Cancel</button>
                  <button class="schema-editor-btn schema-editor-btn-primary" @click="confirmEdit(field.fieldType)">Apply</button>
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
import type { EntitySchema, FieldSchema } from '@/stores/data';
import type { FieldType, Value } from '@/core/data/types';
import { ValueHelpers } from '@/core/data/types';
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

const dataStore = useDataStore();

// Original schema from props
const originalSchema = ref<EntitySchema>(JSON.parse(JSON.stringify(props.schema)));
// Working schema with modifications
const workingSchema = ref<EntitySchema>(JSON.parse(JSON.stringify(props.schema)));
// Track modified fields
const modifiedFields = ref<Set<FieldType>>(new Set());

// Entity type name
const entityTypeName = ref<string>('');

// Track if the schema has any changes
const hasChanges = computed(() => modifiedFields.value.size > 0);

// Editing state
const editingField = ref<FieldType | null>(null);
const showAddField = ref(false);

// New field state
const newFieldName = ref('');
const newFieldType = ref<string>('String');
const newFieldDefaultString = ref('');
const newFieldDefaultInt = ref(0);
const newFieldDefaultFloat = ref(0.0);
const newFieldDefaultBool = ref(false);
const newFieldChoicesList = ref<string[]>([]);

// Editing defaults storage
const editingDefaults = ref<Record<FieldType, any>>({});

// Validation and references
const nameError = ref<string | null>(null);
const newFieldNameInput = ref<HTMLInputElement | null>(null);

// Add state for confirmation dialog
const confirmDialog = ref({
  show: false,
  title: '',
  message: '',
  fieldToDelete: 0 as FieldType,
  type: 'danger' as 'info' | 'warning' | 'danger'
});

// Drag-n-drop state
const draggedIndex = ref<number | null>(null);

// Field type helpers
function getValueType(value: Value): string {
  if (ValueHelpers.isString(value)) return 'String';
  if (ValueHelpers.isInt(value)) return 'Int';
  if (ValueHelpers.isFloat(value)) return 'Float';
  if (ValueHelpers.isBool(value)) return 'Bool';
  if (ValueHelpers.isEntityRef(value)) return 'EntityReference';
  if (ValueHelpers.isEntityList(value)) return 'EntityList';
  if (ValueHelpers.isTimestamp(value)) return 'Timestamp';
  if (ValueHelpers.isBlob(value)) return 'Blob';
  if (ValueHelpers.isChoice(value)) return 'Choice';
  return 'Unknown';
}

function createDefaultValue(type: string): Value {
  switch (type) {
    case 'String': return ValueHelpers.string(newFieldDefaultString.value);
    case 'Int': return ValueHelpers.int(newFieldDefaultInt.value);
    case 'Float': return ValueHelpers.float(newFieldDefaultFloat.value);
    case 'Bool': return ValueHelpers.bool(newFieldDefaultBool.value);
    case 'EntityReference': return ValueHelpers.entityRef(null);
    case 'EntityList': return ValueHelpers.entityList([]);
    case 'Timestamp': return ValueHelpers.timestamp(Date.now());
    case 'Blob': return ValueHelpers.blob([]);
    case 'Choice': return ValueHelpers.choice(0);
    default: return ValueHelpers.string('');
  }
}

function formatValue(value: Value): string {
  if (ValueHelpers.isString(value)) return `"${value.String}"`;
  if (ValueHelpers.isInt(value)) return String(value.Int);
  if (ValueHelpers.isFloat(value)) return String(value.Float);
  if (ValueHelpers.isBool(value)) return value.Bool ? 'true' : 'false';
  if (ValueHelpers.isEntityRef(value)) return value.EntityReference === null ? 'null' : `Ref(${value.EntityReference})`;
  if (ValueHelpers.isEntityList(value)) return `List[${value.EntityList.length}]`;
  if (ValueHelpers.isTimestamp(value)) return new Date(value.Timestamp).toLocaleString();
  if (ValueHelpers.isBlob(value)) return `Blob[${value.Blob.length} bytes]`;
  if (ValueHelpers.isChoice(value)) return `Choice(${value.Choice})`;
  return 'Unknown';
}

function getDefaultValueDisplay(type: string): string {
  switch (type) {
    case 'EntityReference': return 'null';
    case 'EntityList': return 'List[]';
    case 'Timestamp': return 'Now';
    case 'Blob': return 'Blob[]';
    default: return '';
  }
}

// Sort fields by rank
const sortedFields = computed(() => {
  return Object.entries(workingSchema.value.fields)
    .map(([fieldType, fieldSchema]) => ({
      fieldType: Number(fieldType),
      fieldName: fieldNames.value[Number(fieldType)] || `Field_${fieldType}`,
      fieldSchema,
      valueType: getValueType(fieldSchema.default_value)
    }))
    .sort((a, b) => a.fieldSchema.rank - b.fieldSchema.rank);
});

// Field names cache
const fieldNames = ref<Record<FieldType, string>>({});

// Load field names
async function loadFieldNames() {
  const types = Object.keys(workingSchema.value.fields).map(Number);
  for (const fieldType of types) {
    try {
      fieldNames.value[fieldType] = await dataStore.resolveFieldType(fieldType);
    } catch (err) {
      console.error(`Failed to resolve field type ${fieldType}:`, err);
      fieldNames.value[fieldType] = `Field_${fieldType}`;
    }
  }
}

// Load entity type name
async function loadEntityTypeName() {
  try {
    entityTypeName.value = await dataStore.resolveEntityType(workingSchema.value.entity_type);
  } catch (err) {
    console.error('Failed to resolve entity type:', err);
    entityTypeName.value = `Type_${workingSchema.value.entity_type}`;
  }
}

// Initialize on mount
onMounted(async () => {
  await loadFieldNames();
  await loadEntityTypeName();
});

// Check if a field has been modified
function isFieldModified(fieldType: FieldType): boolean {
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
  const existingNames = Object.values(fieldNames.value);
  if (existingNames.includes(newFieldName.value)) {
    nameError.value = "Field name already exists";
    return;
  }
  
  nameError.value = null;
}

function openAddField() {
  showAddField.value = true;
  newFieldName.value = '';
  newFieldType.value = 'String';
  newFieldDefaultString.value = '';
  newFieldDefaultInt.value = 0;
  newFieldDefaultFloat.value = 0.0;
  newFieldDefaultBool.value = false;
  newFieldChoicesList.value = [];
  nameError.value = null;
  
  // Focus on the field name input after DOM update
  nextTick(() => {
    newFieldNameInput.value?.focus();
  });
}

function cancelAddField() {
  showAddField.value = false;
}

async function addNewField() {
  if (!newFieldName.value.trim()) {
    nameError.value = "Field name is required";
    return;
  }
  
  if (nameError.value) {
    return;
  }
  
  try {
    // Get field type ID
    const fieldType = await dataStore.getFieldType(newFieldName.value);
    
    // Create field schema
    const fieldSchema: FieldSchema = {
      field_type: fieldType,
      rank: Object.keys(workingSchema.value.fields).length,
      default_value: createDefaultValue(newFieldType.value),
      storage_scope: 'Runtime'
    };
    
    // Add to working schema
    workingSchema.value.fields[fieldType] = fieldSchema;
    
    // Add to field names cache
    fieldNames.value[fieldType] = newFieldName.value;
    
    // Mark as modified
    modifiedFields.value.add(fieldType);
    
    // Close add form
    showAddField.value = false;
  } catch (err) {
    console.error('Failed to add field:', err);
    nameError.value = 'Failed to create field';
  }
}

function startEditField(fieldType: FieldType) {
  // Cancel any existing editing
  if (editingField.value && editingField.value !== fieldType) {
    cancelEditField(editingField.value);
  }
  
  editingField.value = fieldType;
  
  // Initialize editing defaults
  const fieldSchema = workingSchema.value.fields[fieldType];
  const value = fieldSchema.default_value;
  const valueType = getValueType(value);
  
  editingDefaults.value[fieldType] = {};
  
  if (ValueHelpers.isString(value)) {
    editingDefaults.value[fieldType].string = value.String;
  } else if (ValueHelpers.isInt(value)) {
    editingDefaults.value[fieldType].int = value.Int;
  } else if (ValueHelpers.isFloat(value)) {
    editingDefaults.value[fieldType].float = value.Float;
  } else if (ValueHelpers.isBool(value)) {
    editingDefaults.value[fieldType].bool = value.Bool;
  } else if (ValueHelpers.isChoice(value)) {
    // For choice, we'd need to store the options somewhere
    // For now, just initialize empty
    editingDefaults.value[fieldType].choices = [];
  }
}

function cancelEditField(fieldType: FieldType) {
  // If this is a modified field, restore from original schema
  if (modifiedFields.value.has(fieldType) && originalSchema.value.fields[fieldType]) {
    workingSchema.value.fields[fieldType] = JSON.parse(JSON.stringify(originalSchema.value.fields[fieldType]));
    modifiedFields.value.delete(fieldType);
  }
  
  editingField.value = null;
  delete editingDefaults.value[fieldType];
}

function confirmEdit(fieldType: FieldType) {
  const fieldSchema = workingSchema.value.fields[fieldType];
  const valueType = getValueType(fieldSchema.default_value);
  
  // Update default value from editing defaults
  if (valueType === 'String') {
    fieldSchema.default_value = ValueHelpers.string(editingDefaults.value[fieldType].string || '');
  } else if (valueType === 'Int') {
    fieldSchema.default_value = ValueHelpers.int(editingDefaults.value[fieldType].int || 0);
  } else if (valueType === 'Float') {
    fieldSchema.default_value = ValueHelpers.float(editingDefaults.value[fieldType].float || 0.0);
  } else if (valueType === 'Bool') {
    fieldSchema.default_value = ValueHelpers.bool(editingDefaults.value[fieldType].bool || false);
  } else if (valueType === 'Choice') {
    // For choice fields, keep the default choice index
    // The choices list would need to be stored separately in a full implementation
    fieldSchema.default_value = ValueHelpers.choice(0);
  }
  
  // Mark field as modified
  modifiedFields.value.add(fieldType);
  
  // Close editing mode
  editingField.value = null;
  delete editingDefaults.value[fieldType];
}

function deleteField(fieldType: FieldType) {
  confirmDialog.value = {
    show: true,
    title: 'Delete Field',
    message: `Are you sure you want to delete the field "${fieldNames.value[fieldType]}"? This cannot be undone.`,
    fieldToDelete: fieldType,
    type: 'danger'
  };
}

function confirmDeleteField() {
  const fieldType = confirmDialog.value.fieldToDelete;
  delete workingSchema.value.fields[fieldType];
  
  // Mark as modified
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
  originalSchema.value = JSON.parse(JSON.stringify(workingSchema.value));
  
  // Clear modified fields
  modifiedFields.value.clear();
}

// Discard all changes
function discardChanges() {
  // Reset working schema to original
  workingSchema.value = JSON.parse(JSON.stringify(originalSchema.value));
  
  // Clear modified fields
  modifiedFields.value.clear();
  
  // Exit edit mode if active
  editingField.value = null;
  editingDefaults.value = {};
}

// Drag and drop handlers
function handleDragStart(event: DragEvent, index: number) {
  draggedIndex.value = index;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(index));
  }
}

function handleDragEnter(event: DragEvent, index: number) {
  if (draggedIndex.value === null) return;
  
  const rows = document.querySelectorAll('.field-row');
  rows.forEach((row, i) => {
    if (i === index) {
      row.classList.add('drag-over');
    } else {
      row.classList.remove('drag-over');
    }
  });
}

function handleDrop(event: DragEvent, toIndex: number) {
  event.preventDefault();
  
  const fromIndex = draggedIndex.value;
  
  if (fromIndex === null || fromIndex === toIndex) return;
  
  // Get the sorted fields array
  const fields = sortedFields.value;
  
  // Update ranks
  const fromField = fields[fromIndex];
  const toField = fields[toIndex];
  
  if (fromIndex < toIndex) {
    // Moving down
    for (let i = fromIndex; i < toIndex; i++) {
      const field = fields[i + 1];
      workingSchema.value.fields[field.fieldType].rank = i;
      modifiedFields.value.add(field.fieldType);
    }
    workingSchema.value.fields[fromField.fieldType].rank = toIndex;
  } else {
    // Moving up
    for (let i = fromIndex; i > toIndex; i--) {
      const field = fields[i - 1];
      workingSchema.value.fields[field.fieldType].rank = i;
      modifiedFields.value.add(field.fieldType);
    }
    workingSchema.value.fields[fromField.fieldType].rank = toIndex;
  }
  
  modifiedFields.value.add(fromField.fieldType);
  
  draggedIndex.value = null;
}

function handleDragEnd() {
  draggedIndex.value = null;
  const rows = document.querySelectorAll('.field-row');
  rows.forEach(row => {
    row.classList.remove('drag-over');
  });
}
</script>

<style scoped>
/* Component-specific styles */
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
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--qui-hover-border);
  background: var(--qui-titlebar-bg);
}

.schema-title {
  font-size: 24px;
  margin: 0;
  font-weight: var(--qui-font-weight-medium);
  color: var(--qui-text-primary);
}

.schema-actions {
  display: flex;
  gap: 8px;
}

.schema-editor-table-container {
  flex: 1;
  overflow: auto;
  padding: 20px;
}

.schema-editor-table {
  width: 100%;
  border-collapse: collapse;
  background: var(--qui-bg-secondary);
  border-radius: 8px;
  overflow: hidden;
}

.schema-editor-table thead {
  background: var(--qui-overlay-primary);
}

.schema-editor-table th {
  padding: 12px;
  text-align: left;
  font-weight: var(--qui-font-weight-medium);
  color: var(--qui-text-secondary);
  font-size: var(--qui-font-size-small);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.schema-editor-table td {
  padding: 12px;
  border-top: 1px solid var(--qui-hover-border);
  vertical-align: middle;
}

.col-drag {
  width: 40px;
}

.col-name {
  width: 180px;
}

.col-type {
  width: 120px;
}

.col-actions {
  width: 100px;
}

.drag-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  cursor: move;
  color: var(--qui-text-secondary);
  border-radius: 4px;
  transition: all 0.2s ease;
}

.drag-handle:hover {
  background: var(--qui-overlay-primary);
  color: var(--qui-text-primary);
}

.field-row {
  transition: background-color 0.2s ease;
}

.field-row:hover {
  background-color: var(--qui-overlay-primary);
}

.field-row.drag-over {
  background-color: var(--qui-overlay-accent);
  border-top: 2px solid var(--qui-accent-color);
}

.field-row.modified {
  background-color: rgba(255, 152, 0, 0.05);
}

.field-row.editing {
  background-color: var(--qui-overlay-secondary);
}

.new-field-row {
  background-color: var(--qui-overlay-primary);
}

.field-default-display {
  font-family: 'Courier New', monospace;
  color: var(--qui-text-secondary);
  font-size: var(--qui-font-size-small);
}

.action-buttons {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.modified-badge {
  background-color: var(--qui-overlay-secondary);
  color: var(--qui-accent-secondary);
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 10px;
  margin-left: 6px;
}

.schema-editor-form-group {
  margin-bottom: 0;
}

.schema-editor-form-control {
  width: 100%;
  height: 32px;
  padding: 0 10px;
  border: 1px solid var(--qui-hover-border);
  border-radius: 4px;
  background: var(--qui-bg-primary);
  color: var(--qui-text-primary);
  font-size: var(--qui-font-size-base);
  transition: all 0.2s ease;
}

.schema-editor-form-control:focus {
  outline: none;
  border-color: var(--qui-accent-color);
  box-shadow: 0 0 0 3px var(--qui-overlay-accent);
}

.schema-editor-form-control.schema-editor-input-invalid {
  border-color: var(--qui-danger-color);
}

.schema-editor-form-error {
  color: var(--qui-danger-color);
  font-size: var(--qui-font-size-small);
  margin-top: 4px;
}

select.schema-editor-form-control {
  cursor: pointer;
}

.field-tag-input {
  width: 100%;
}

.properties-cell {
  min-width: 200px;
}
</style>
