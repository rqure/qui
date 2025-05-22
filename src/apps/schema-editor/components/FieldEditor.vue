<template>
  <div class="field-editor">
    <div class="editor-header">
      <h3 class="editor-title">Edit {{ fieldName }}</h3>
      <button class="btn-icon" @click="handleCancel" title="Close">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
          <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </button>
    </div>
    
    <div class="editor-body">
      <!-- Basic settings -->
      <div class="form-section">
        <h4 class="section-title">Basic Information</h4>
        
        <div class="form-row">
          <div class="form-group">
            <label>Field Name</label>
            <input type="text" class="form-control disabled" :value="fieldName" disabled />
            <p class="form-text">Field name cannot be changed</p>
          </div>
          
          <div class="form-group">
            <label for="field-type">Field Type</label>
            <div class="select-wrapper">
              <select id="field-type" class="form-control" v-model="selectedValueType" @change="onFieldTypeChange">
                <option v-for="type in availableFieldTypes" :key="type" :value="type">
                  {{ type }}
                </option>
              </select>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" class="select-arrow">
                <path fill="currentColor" d="M7 10l5 5 5-5z"/>
              </svg>
            </div>
          </div>
          
          <div class="form-group">
            <label for="field-rank">Display Order</label>
            <input id="field-rank" type="number" class="form-control" v-model="fieldRank" min="0" />
            <p class="form-text">Lower numbers appear first</p>
          </div>
        </div>
      </div>
      
      <!-- Choice options -->
      <div v-if="isChoiceType" class="form-section">
        <div class="section-header">
          <h4 class="section-title">Choice Options</h4>
          <button class="btn-text" @click="addChoice">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
              <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
            Add Option
          </button>
        </div>
        
        <div v-if="choiceError" class="form-error">{{ choiceError }}</div>
        
        <div class="choices-container">
          <div v-for="(choice, index) in choices" :key="index" class="choice-item">
            <div class="choice-number">{{ index + 1 }}</div>
            <input 
              type="text" 
              class="form-control" 
              v-model="choice.value" 
              placeholder="Enter choice option"
            />
            <div class="choice-actions">
              <button 
                class="btn-icon-sm" 
                :disabled="index === 0" 
                @click="moveChoice(index, 'up')" 
                title="Move up"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M7 14l5-5 5 5z"/>
                </svg>
              </button>
              <button 
                class="btn-icon-sm" 
                :disabled="index === choices.length - 1" 
                @click="moveChoice(index, 'down')" 
                title="Move down"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M7 10l5 5 5-5z"/>
                </svg>
              </button>
              <button 
                class="btn-icon-sm btn-danger" 
                @click="removeChoice(index)" 
                title="Remove option"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Permissions -->
      <div class="form-section">
        <h4 class="section-title">Access Permissions</h4>
        
        <div class="form-group">
          <label for="read-perm">Read Permissions</label>
          <input 
            id="read-perm"
            type="text"
            class="form-control"
            v-model="readPermissions"
            placeholder="Enter entity IDs (comma separated)"
          />
          <p class="form-text">Leave empty for public read access</p>
        </div>
        
        <div class="form-group">
          <label for="write-perm">Write Permissions</label>
          <input 
            id="write-perm"
            type="text"
            class="form-control"
            v-model="writePermissions"
            placeholder="Enter entity IDs (comma separated)"
          />
          <p class="form-text">Leave empty for public write access</p>
        </div>
      </div>
    </div>
    
    <div class="editor-footer">
      <button class="btn-secondary" @click="handleCancel">Cancel</button>
      <button class="btn-primary" @click="handleSave">Save Changes</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type { FieldSchema } from '@/core/data/types';
import { ValueType } from '@/core/data/types';

const props = defineProps<{
  fieldSchema: FieldSchema;
}>();

const emit = defineEmits<{
  (e: 'update', fieldSchema: FieldSchema): void;
  (e: 'cancel'): void;
}>();

// Clone field schema to prevent direct mutation
const workingSchema = ref<FieldSchema>(props.fieldSchema.clone());

// Form state
const fieldName = ref(workingSchema.value.fieldType);
const selectedValueType = ref<ValueType>(workingSchema.value.valueType);
const fieldRank = ref(workingSchema.value.rank || 0);
const choices = ref<{value: string}[]>(
  workingSchema.value.choices.map(choice => ({ value: choice })) || []
);
const readPermissions = ref(workingSchema.value.readPermissions.join(','));
const writePermissions = ref(workingSchema.value.writePermissions.join(','));
const choiceError = ref<string | null>(null);

// Computed properties for field type checks
const isStringType = computed(() => selectedValueType.value === ValueType.String);
const isNumberType = computed(() => 
  selectedValueType.value === ValueType.Int || 
  selectedValueType.value === ValueType.Float
);
const isBooleanType = computed(() => selectedValueType.value === ValueType.Bool);
const isTimestampType = computed(() => selectedValueType.value === ValueType.Timestamp);
const isChoiceType = computed(() => selectedValueType.value === ValueType.Choice);
const isEntityRefType = computed(() => selectedValueType.value === ValueType.EntityReference);
const isEntityListType = computed(() => selectedValueType.value === ValueType.EntityList);

// Available field types matching the ValueType enum
const availableFieldTypes = computed(() => Object.values(ValueType));

// Field operations
function onFieldTypeChange() {
  // Reset field-specific settings when type changes
  if (selectedValueType.value === ValueType.Choice && choices.value.length === 0) {
    choices.value = [{ value: 'Option 1' }, { value: 'Option 2' }];
  }
}

function addChoice() {
  choices.value.push({ value: `Option ${choices.value.length + 1}` });
}

function removeChoice(index: number) {
  if (choices.value.length <= 1) {
    choiceError.value = 'Choice fields must have at least one option';
    return;
  }
  
  choiceError.value = null;
  choices.value.splice(index, 1);
}

function moveChoice(index: number, direction: 'up' | 'down') {
  if (direction === 'up' && index > 0) {
    const temp = choices.value[index];
    choices.value[index] = choices.value[index - 1];
    choices.value[index - 1] = temp;
  } else if (direction === 'down' && index < choices.value.length - 1) {
    const temp = choices.value[index];
    choices.value[index] = choices.value[index + 1];
    choices.value[index + 1] = temp;
  }
}

function handleSave() {
  // Validate choices for choice type
  if (selectedValueType.value === ValueType.Choice && choices.value.length === 0) {
    choiceError.value = 'Choice fields must have at least one option';
    return;
  }
  
  // Update working schema
  workingSchema.value.valueType = selectedValueType.value;
  workingSchema.value.rank = fieldRank.value;
  
  // Update choices if choice type
  if (selectedValueType.value === ValueType.Choice) {
    workingSchema.value.choices = choices.value.map(c => c.value);
  } else {
    workingSchema.value.choices = [];
  }
  
  // Update permissions
  workingSchema.value.readPermissions = readPermissions.value
    .split(',')
    .map(p => p.trim())
    .filter(p => p !== '');
    
  workingSchema.value.writePermissions = writePermissions.value
    .split(',')
    .map(p => p.trim())
    .filter(p => p !== '');
  
  emit('update', workingSchema.value);
}

function handleCancel() {
  emit('cancel');
}
</script>

<style scoped>
.field-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  animation: fade-in 0.3s ease-out;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 24px;
  background: linear-gradient(to right, var(--qui-accent-color), var(--qui-accent-secondary));
  color: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
}

.editor-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at 30% 50%, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 70%);
}

.editor-title {
  margin: 0;
  font-size: 18px;
  font-weight: var(--qui-font-weight-medium);
  position: relative;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.editor-title::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: -6px;
  width: 30px;
  height: 2px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 1px;
}

.editor-body {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  background: var(--qui-bg-secondary);
}

.editor-footer {
  padding: 18px 24px;
  border-top: 1px solid var(--qui-hover-border);
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  background: var(--qui-titlebar-bg);
}

.form-section {
  margin-bottom: 32px;
  padding-bottom: 32px;
  border-bottom: 1px solid var(--qui-hover-border);
}

.form-section:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-title {
  margin: 0 0 20px 0;
  font-size: 14px;
  font-weight: var(--qui-font-weight-medium);
  color: var(--qui-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  position: relative;
  padding-left: 12px;
}

.section-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 16px;
  background: var(--qui-accent-color);
  border-radius: 2px;
}

.section-header .section-title {
  margin-bottom: 0;
}

.form-row {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  margin-bottom: 8px;
}

.form-group {
  flex: 1;
  min-width: 180px;
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 10px;
  font-weight: var(--qui-font-weight-medium);
  color: var(--qui-text-primary);
}

.form-control {
  display: block;
  width: 100%;
  padding: 14px;
  font-size: var(--qui-font-size-base);
  border: 1px solid var(--qui-hover-border);
  border-radius: 8px;
  background: var(--qui-bg-primary);
  color: var(--qui-text-primary);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.05);
  box-sizing: border-box;
}

.form-control:focus {
  outline: none;
  border-color: var(--qui-accent-color);
  box-shadow: 0 0 0 3px var(--qui-overlay-accent), inset 0 1px 2px rgba(0, 0, 0, 0.05);
}

.form-control.disabled {
  background-color: var(--qui-overlay-primary);
  cursor: not-allowed;
  opacity: 0.7;
}

.select-wrapper {
  position: relative;
}

.select-arrow {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  color: var(--qui-text-secondary);
  transition: transform 0.2s ease;
}

.select-wrapper:hover .select-arrow {
  color: var(--qui-text-primary);
  transform: translateY(-50%) translateY(2px);
}

.form-text {
  margin-top: 8px;
  font-size: var(--qui-font-size-small);
  color: var(--qui-text-secondary);
  line-height: 1.5;
}

.form-error {
  margin-bottom: 20px;
  padding: 14px;
  border-radius: 8px;
  background: var(--qui-danger-bg);
  color: var(--qui-danger-color);
  font-size: var(--qui-font-size-small);
  box-shadow: 0 2px 5px rgba(244, 67, 54, 0.1);
  animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
  line-height: 1.5;
}

.choices-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 4px;
}

.choice-item {
  display: flex;
  align-items: center;
  gap: 14px;
  background: var(--qui-bg-primary);
  padding: 12px 14px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
}

.choice-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.1);
}

.choice-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--qui-accent-color);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.choice-item:hover::before {
  opacity: 1;
}

.choice-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 14px;
  background: var(--qui-overlay-accent);
  color: var(--qui-accent-color);
  font-size: var(--qui-font-size-small);
  font-weight: var(--qui-font-weight-medium);
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

.choice-item:hover .choice-number {
  background: var(--qui-accent-color);
  color: white;
  transform: scale(1.05);
}

.choice-actions {
  display: flex;
  gap: 6px;
}

.btn-primary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 0 20px;
  height: 44px;
  border: none;
  border-radius: 8px;
  background: var(--qui-accent-color);
  color: white;
  font-size: var(--qui-font-size-base);
  font-weight: var(--qui-font-weight-medium);
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.btn-primary:hover {
  background: var(--qui-accent-secondary);
  transform: translateY(-2px);
  box-shadow: 0 6px 15px rgba(0, 0, 0, 0.15);
}

.btn-secondary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 0 20px;
  height: 44px;
  border: 1px solid var(--qui-hover-border);
  border-radius: 8px;
  background: var(--qui-overlay-primary);
  color: var(--qui-text-primary);
  font-size: var(--qui-font-size-base);
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.btn-secondary:hover {
  background: var(--qui-overlay-secondary);
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.05);
}

.btn-secondary:active {
  transform: translateY(0);
  box-shadow: none;
}

.btn-text {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--qui-accent-color);
  font-size: var(--qui-font-size-small);
  font-weight: var(--qui-font-weight-medium);
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-text:hover {
  background: var(--qui-overlay-accent);
}

.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-icon:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

.btn-icon-sm {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid var(--qui-hover-border);
  background: var(--qui-overlay-primary);
  color: var(--qui-text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-icon-sm:hover {
  background: var(--qui-overlay-secondary);
  color: var(--qui-text-primary);
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.btn-icon-sm:active {
  transform: translateY(0);
  box-shadow: none;
}

.btn-icon-sm:disabled {
  opacity: 0.3;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.btn-icon-sm.btn-danger:hover {
  background: var(--qui-danger-bg);
  color: var(--qui-danger-color);
  border-color: var(--qui-danger-border);
  box-shadow: 0 0 0 2px var(--qui-danger-glow);
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes shake {
  10%, 90% { transform: translateX(-1px); }
  20%, 80% { transform: translateX(2px); }
  30%, 50%, 70% { transform: translateX(-3px); }
  40%, 60% { transform: translateX(3px); }
}

@media (max-width: 1024px) {
  .editor-body {
    padding: 20px;
  }
  
  .form-section {
    margin-bottom: 24px;
    padding-bottom: 24px;
  }
}

@media (max-width: 768px) {
  .form-row {
    flex-direction: column;
    gap: 12px;
    margin-bottom: 0;
  }
  
  .editor-body {
    padding: 16px;
  }
  
  .editor-footer {
    padding: 16px;
  }
  
  .editor-header {
    padding: 16px 20px;
  }
  
  .section-title {
    margin-bottom: 16px;
  }
  
  .form-group {
    margin-bottom: 16px;
  }
  
  .btn-primary, 
  .btn-secondary {
    height: 42px;
  }
}
</style>