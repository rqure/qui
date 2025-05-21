<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { EntitySchema, FieldSchema, ValueType } from '@/core/data/types';
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
    <div class="schema-header">
      <div class="schema-info">
        <div class="schema-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24">
            <path fill="currentColor" d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
          </svg>
        </div>
        <div>
          <h1 class="schema-title">{{ workingSchema.entityType }}</h1>
          <div class="schema-subtitle">Entity Schema Definition</div>
        </div>
      </div>
      
      <button class="btn-primary btn-add-field" @click="openAddField">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
          <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
        </svg>
        Add Field
      </button>
    </div>
    
    <div v-if="showAddField" class="add-field-panel">
      <div class="panel-header">
        <h3 class="panel-title">Add New Field</h3>
        <button class="btn-icon" @click="cancelAddField" title="Close">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
            <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>
      
      <div class="panel-body">
        <div class="form-row">
          <div class="form-group">
            <label for="field-name">Field Name</label>
            <input 
              id="field-name" 
              v-model="newFieldName" 
              class="form-control"
              placeholder="Enter field name"
            />
            <p class="form-text">Start with a letter, use only letters, numbers, and underscores</p>
          </div>
          
          <div class="form-group">
            <label for="field-type">Field Type</label>
            <div class="select-wrapper">
              <select id="field-type" v-model="newFieldType" class="form-control">
                <option v-for="type in Object.values(ValueType)" :key="type" :value="type">
                  {{ getValueTypeLabel(type) }}
                </option>
              </select>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" class="select-arrow">
                <path fill="currentColor" d="M7 10l5 5 5-5z"/>
              </svg>
            </div>
          </div>
        </div>
        
        <div v-if="fieldError" class="form-error">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
            <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
          {{ fieldError }}
        </div>
        
        <div class="form-actions">
          <button class="btn-secondary" @click="cancelAddField">Cancel</button>
          <button class="btn-primary" @click="addNewField">Add Field</button>
        </div>
      </div>
    </div>
    
    <div v-if="sortedFields.length === 0" class="empty-fields">
      <div class="empty-state-content">
        <div class="empty-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24">
            <path fill="currentColor" d="M19.84 9.81C22.07 12.1 22.07 15.9 19.84 18.19L17 15.28C17.5 14.43 17.5 13.57 17 12.72L19.84 9.81M20.64 8L12 17.82L3.36 8C6.43 4.15 16.39 4.47 20.64 8M4.16 9.81L7 12.72C6.5 13.57 6.5 14.43 7 15.28L4.16 18.19C1.93 15.9 1.93 12.1 4.16 9.81Z"/>
          </svg>
        </div>
        <h2 class="empty-title">No Fields Defined</h2>
        <p class="empty-description">This entity type doesn't have any fields yet. Add your first field to define the schema.</p>
        <button class="btn-primary" @click="openAddField">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
            <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
          Add First Field
        </button>
      </div>
    </div>
    
    <div v-else class="fields-container">
      <div v-for="{ fieldType, fieldSchema } in sortedFields" :key="fieldType" class="field-card" :class="{ 'editing': editingField === fieldType }">
        <template v-if="editingField === fieldType">
          <FieldEditor 
            :field-schema="fieldSchema"
            @update="updateField(fieldType, $event)"
            @cancel="cancelEditField"
          />
        </template>
        
        <template v-else>
          <div class="field-card-header">
            <div class="field-name-container">
              <span class="field-name">{{ fieldType }}</span>
              <TypeBadge :type="fieldSchema.valueType" />
            </div>
            
            <div class="field-actions">
              <button class="btn-icon" @click="startEditField(fieldType)" title="Edit field">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                </svg>
              </button>
              <button class="btn-icon btn-danger" @click="deleteField(fieldType)" title="Delete field">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                </svg>
              </button>
            </div>
          </div>
          
          <div class="field-card-body">
            <div class="field-properties">
              <div class="property">
                <div class="property-label">Display Order</div>
                <div class="property-value">{{ fieldSchema.rank || 0 }}</div>
              </div>
              
              <div v-if="fieldSchema.valueType === ValueType.Choice" class="property">
                <div class="property-label">Options</div>
                <div class="property-value">{{ fieldSchema.choices.length }}</div>
              </div>
              
              <div v-if="fieldSchema.readPermissions.length > 0" class="property">
                <div class="property-label">Read Permissions</div>
                <div class="property-value permission-chip">{{ fieldSchema.readPermissions.length }}</div>
              </div>
              
              <div v-if="fieldSchema.writePermissions.length > 0" class="property">
                <div class="property-label">Write Permissions</div>
                <div class="property-value permission-chip">{{ fieldSchema.writePermissions.length }}</div>
              </div>
            </div>
            
            <!-- For Choice type fields, show options -->
            <div v-if="fieldSchema.valueType === ValueType.Choice && fieldSchema.choices.length > 0" class="choice-options">
              <div class="section-label">Options</div>
              <div class="options-list">
                <div v-for="(choice, index) in fieldSchema.choices" :key="index" class="option-chip">
                  {{ choice }}
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
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

<style scoped>
.schema-editor {
  display: flex;
  flex-direction: column;
  padding: 24px;
  height: 100%;
  overflow-y: auto;
  box-sizing: border-box;
}

.schema-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--qui-hover-border);
}

.schema-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.schema-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 8px;
  background: var(--qui-overlay-accent);
  color: var(--qui-accent-color);
}

.schema-title {
  margin: 0 0 4px 0;
  font-size: 24px;
  font-weight: var(--qui-font-weight-medium);
  color: var(--qui-text-primary);
}

.schema-subtitle {
  font-size: var(--qui-font-size-small);
  color: var(--qui-text-secondary);
}

.btn-primary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 16px;
  height: 38px;
  border: none;
  border-radius: 4px;
  background: var(--qui-accent-color);
  color: white;
  font-size: var(--qui-font-size-base);
  font-weight: var(--qui-font-weight-medium);
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary:hover {
  background: var(--qui-accent-secondary);
  transform: translateY(-1px);
  box-shadow: var(--qui-shadow-accent);
}

.btn-secondary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 16px;
  height: 38px;
  border: 1px solid var(--qui-hover-border);
  border-radius: 4px;
  background: var(--qui-overlay-primary);
  color: var(--qui-text-primary);
  font-size: var(--qui-font-size-base);
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  background: var(--qui-overlay-secondary);
}

.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 4px;
  border: 1px solid var(--qui-hover-border);
  background: var(--qui-overlay-primary);
  color: var(--qui-text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-icon:hover {
  background: var(--qui-overlay-secondary);
  color: var(--qui-text-primary);
  transform: translateY(-1px);
}

.btn-danger:hover {
  background: var(--qui-danger-bg);
  color: var(--qui-danger-color);
  border-color: var(--qui-danger-border);
}

.add-field-panel {
  margin-bottom: 24px;
  border-radius: 8px;
  overflow: hidden;
  background: var(--qui-bg-secondary);
  box-shadow: var(--qui-shadow-default);
  border: 1px solid var(--qui-hover-border);
  animation: slide-down 0.3s ease;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--qui-titlebar-bg);
  border-bottom: 1px solid var(--qui-hover-border);
}

.panel-title {
  margin: 0;
  font-size: 16px;
  font-weight: var(--qui-font-weight-medium);
  color: var(--qui-text-primary);
}

.panel-body {
  padding: 16px;
}

.form-row {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.form-group {
  flex: 1;
  min-width: 0;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: var(--qui-font-weight-medium);
  color: var(--qui-text-primary);
}

.form-control {
  display: block;
  width: 100%;
  padding: 10px 12px;
  font-size: var(--qui-font-size-base);
  border: 1px solid var(--qui-hover-border);
  border-radius: 4px;
  background: var(--qui-bg-primary);
  color: var(--qui-text-primary);
  transition: all 0.2s ease;
}

.form-control:focus {
  outline: none;
  border-color: var(--qui-accent-color);
  box-shadow: 0 0 0 2px var(--qui-overlay-accent);
}

.select-wrapper {
  position: relative;
}

.select-arrow {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  color: var(--qui-text-secondary);
}

.form-text {
  margin-top: 6px;
  font-size: var(--qui-font-size-small);
  color: var(--qui-text-secondary);
}

.form-error {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  padding: 12px;
  border-radius: 4px;
  background: var(--qui-danger-bg);
  color: var(--qui-danger-color);
  font-size: var(--qui-font-size-small);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
}

.empty-fields {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
}

.empty-state-content {
  max-width: 400px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.empty-icon {
  color: var(--qui-accent-deep);
  opacity: 0.3;
  margin-bottom: 24px;
}

.empty-title {
  margin: 0 0 16px 0;
  font-size: 24px;
  font-weight: var(--qui-font-weight-medium);
  color: var(--qui-text-primary);
}

.empty-description {
  margin: 0 0 32px 0;
  color: var(--qui-text-secondary);
  line-height: 1.5;
}

.fields-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.field-card {
  background: var(--qui-bg-secondary);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: var(--qui-shadow-default);
  border: 1px solid var(--qui-hover-border);
  transition: all 0.2s ease;
}

.field-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--qui-shadow-glow);
  border-color: var(--qui-hover-border);
}

.field-card.editing {
  transform: none;
  border-color: var(--qui-accent-color);
  box-shadow: 0 0 0 2px var(--qui-overlay-accent);
}

.field-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--qui-hover-border);
  background: var(--qui-titlebar-bg);
}

.field-name-container {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field-name {
  font-weight: var(--qui-font-weight-medium);
  color: var(--qui-text-primary);
}

.field-badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: var(--qui-font-weight-medium);
  background: var(--qui-overlay-primary);
  color: var(--qui-text-secondary);
}

.field-actions {
  display: flex;
  gap: 8px;
}

.field-card-body {
  padding: 16px;
}

.field-properties {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.property {
  margin-bottom: 4px;
}

.property-label {
  font-size: 11px;
  color: var(--qui-text-secondary);
  margin-bottom: 4px;
}

.property-value {
  font-weight: var(--qui-font-weight-medium);
  color: var(--qui-text-primary);
}

.permission-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 10px;
  background: var(--qui-overlay-secondary);
  color: var(--qui-accent-deep);
  font-size: 11px;
}

.choice-options {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--qui-hover-border);
}

.section-label {
  font-size: 11px;
  color: var(--qui-text-secondary);
  margin-bottom: 8px;
}

.options-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.option-chip {
  padding: 4px 8px;
  border-radius: 4px;
  background: var(--qui-overlay-primary);
  color: var(--qui-text-primary);
  font-size: 12px;
}

.schema-editor-type-String {
  background: var(--qui-overlay-primary);
  color: var(--qui-text-primary);
}

.schema-editor-type-Int, .schema-editor-type-Float {
  background: var(--qui-overlay-accent);
  color: var(--qui-accent-color);
}

.schema-editor-type-Bool {
  background: rgba(76, 175, 80, 0.1);
  color: #4CAF50;
}

.schema-editor-type-EntityReference, .schema-editor-type-EntityList {
  background: var(--qui-overlay-secondary);
  color: var(--qui-accent-deep);
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

@keyframes slide-down {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
