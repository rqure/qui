<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import type { Value, FieldType, EntityType } from '@/core/data/types';
import { ValueHelpers } from '@/core/data/types';
import { useDataStore, FieldSchemaHelpers } from '@/stores/data';

const props = defineProps<{
  value: Value;
  fieldType?: FieldType | string;
  entityType?: string;
}>();

const emit = defineEmits<{
  (e: 'save', value: any): void;
  (e: 'cancel'): void;
}>();

const dataStore = useDataStore();
const choiceOptions = ref<string[]>([]);
const currentChoiceIndex = ref<number>(0);

// Get the initial value based on the type
function getInitialValue(): string {
  if (!props.value) return '';
  
  if (ValueHelpers.isString(props.value)) {
    return props.value.String;
  } else if (ValueHelpers.isInt(props.value)) {
    return props.value.Int.toString();
  } else if (ValueHelpers.isFloat(props.value)) {
    return props.value.Float.toString();
  } else if (ValueHelpers.isBool(props.value)) {
    return props.value.Bool.toString();
  } else if (ValueHelpers.isEntityRef(props.value)) {
    return props.value.EntityReference !== null ? String(props.value.EntityReference) : '';
  } else if (ValueHelpers.isTimestamp(props.value)) {
    return formatDateForInput(new Date(props.value.Timestamp));
  } else if (ValueHelpers.isChoice(props.value)) {
    currentChoiceIndex.value = props.value.Choice;
    return currentChoiceIndex.value.toString();
  }
  
  return '';
}

const editValue = ref<string>(getInitialValue());
const inputType = computed(() => {
  if (!props.value) return 'text';
  
  if (ValueHelpers.isInt(props.value)) return 'number';
  if (ValueHelpers.isFloat(props.value)) return 'number';
  if (ValueHelpers.isBool(props.value)) return 'checkbox';
  if (ValueHelpers.isTimestamp(props.value)) return 'datetime-local';
  if (ValueHelpers.isChoice(props.value)) return 'choice';
  
  return 'text';
});

// For boolean values, convert to checked state
const isChecked = computed(() => {
  if (ValueHelpers.isBool(props.value)) {
    return props.value.Bool;
  }
  return false;
});

// Modify the dateTimeValue computed property to be a method
// that will be used to set the initial value but not bind directly
function getInitialDateTimeValue(): string {
  if (ValueHelpers.isTimestamp(props.value)) {
    try {
      const date = new Date(props.value.Timestamp);
      return date.toISOString().slice(0, 16); // Format as yyyy-MM-ddThh:mm
    } catch (e) {
      return '';
    }
  }
  return '';
}

function formatDateForInput(date: Date): string {
  // Format date as YYYY-MM-DDThh:mm
  try {
    return date.toISOString().slice(0, 16);
  } catch (e) {
    return '';
  }
}

// Load choice options for Choice type values
async function loadChoiceOptions() {
  if (!props.entityType || props.entityType.trim() === '') {
    return;
  }
  if (!ValueHelpers.isChoice(props.value) || !props.entityType || !props.fieldType) {
    return;
  }
  
  try {
    // Get the entity type ID
    const entityTypeId = await dataStore.getEntityType(props.entityType);
    
    // Get the complete entity schema
    const schema = await dataStore.getCompleteEntitySchema(entityTypeId);
    
    // Get field type as number
    const fieldTypeNum = typeof props.fieldType === 'number' ? props.fieldType : Number(props.fieldType);
    
    if (schema?.fields && schema.fields[fieldTypeNum]) {
      const fieldSchema = schema.fields[fieldTypeNum];
      const choices = FieldSchemaHelpers.getChoices(fieldSchema);
      if (choices) {
        choiceOptions.value = choices;
      }
      currentChoiceIndex.value = props.value.Choice;
    }
  } catch (error) {
    console.error('Error loading choice options:', error);
  }
}

function handleSave() {
  // Create appropriate value based on type
  let newValue;
  
  try {
    if (ValueHelpers.isBool(props.value)) {
      // For checkbox, use checked state
      const checkboxEl = document.getElementById('value-editor-checkbox') as HTMLInputElement;
      newValue = ValueHelpers.bool(checkboxEl.checked);
    } else if (ValueHelpers.isInt(props.value)) {
      newValue = ValueHelpers.int(parseInt(editValue.value, 10));
    } else if (ValueHelpers.isFloat(props.value)) {
      newValue = ValueHelpers.float(parseFloat(editValue.value));
    } else if (ValueHelpers.isString(props.value)) {
      newValue = ValueHelpers.string(editValue.value);
    } else if (ValueHelpers.isEntityRef(props.value)) {
      newValue = ValueHelpers.entityRef(editValue.value ? Number(editValue.value) : null);
    } else if (ValueHelpers.isTimestamp(props.value)) {
      const date = new Date(editValue.value);
      newValue = ValueHelpers.timestamp(date.getTime());
    } else if (ValueHelpers.isChoice(props.value)) {
      // For Choice type, use the selected index
      newValue = ValueHelpers.choice(currentChoiceIndex.value);
    } else {
      // Default fallback
      newValue = ValueHelpers.string(editValue.value);
    }
  } catch (e) {
    console.error('Error creating value:', e);
    newValue = props.value; // Keep original on error
  }
  
  emit('save', newValue);
}

function handleCancel() {
  emit('cancel');
}

function handleChoiceChange(event: Event) {
  const selectElement = event.target as HTMLSelectElement;
  currentChoiceIndex.value = parseInt(selectElement.value, 10);
}

onMounted(() => {
  // Set the initial value for timestamp type
  if (ValueHelpers.isTimestamp(props.value)) {
    editValue.value = getInitialDateTimeValue();
  }

  // Load choice options if this is a Choice type
  if (ValueHelpers.isChoice(props.value) && props.entityType && props.fieldType) {
    loadChoiceOptions();
  }
  
  // Focus the input when mounted
  const input = document.querySelector('.value-editor input, .value-editor textarea, .value-editor select');
  if (input) {
    (input as HTMLElement).focus();
  }
});

// Watch for relevant prop changes
watch(
  [() => ValueHelpers.isChoice(props.value), () => props.entityType, () => props.fieldType],
  () => {
    if (ValueHelpers.isChoice(props.value) && props.entityType && props.fieldType) {
      loadChoiceOptions();
    }
  },
  { immediate: true }
);
</script>

<template>
  <div class="value-editor">
    <!-- Boolean checkbox -->
    <div v-if="ValueHelpers.isBool(value)" class="checkbox-container">
      <input 
        id="value-editor-checkbox" 
        type="checkbox" 
        :checked="isChecked" 
        class="bool-checkbox"
      />
      <label for="value-editor-checkbox">{{ isChecked ? 'True' : 'False' }}</label>
    </div>
    
    <!-- Choice dropdown -->
    <div v-else-if="ValueHelpers.isChoice(value)" class="choice-container">
      <div class="input-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
          <path fill="currentColor" d="M4 14h4v-4H4v4zm0 5h4v-4H4v4zM4 9h4V5H4v4zm5 5h12v-4H9v4zm0 5h12v-4H9v4zM9 5v4h12V5H9z"/>
        </svg>
      </div>
      <select 
        class="db-choice-select"
        :value="currentChoiceIndex"
        @change="handleChoiceChange"
      >
        <option 
          v-for="(option, index) in choiceOptions" 
          :key="index" 
          :value="index"
        >
          {{ option }}
        </option>
      </select>
    </div>
    
    <!-- Timestamp input -->
    <div v-else-if="ValueHelpers.isTimestamp(value)" class="timestamp-container">
      <div class="input-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
          <path fill="currentColor" d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7V7z"/>
        </svg>
      </div>
      <input 
        type="datetime-local" 
        v-model="editValue"
        class="timestamp-input"
      />
    </div>
    
    <!-- Always use Text area for String type -->
    <div v-else-if="ValueHelpers.isString(value)" class="text-container">
      <div class="input-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
          <path fill="currentColor" d="M14 17H4v2h10v-2zm6-8H4v2h16V9zM4 15h16v-2H4v2zM4 5v2h16V5H4z"/>
        </svg>
      </div>
      <textarea 
        v-model="editValue" 
        class="text-area"
        :rows="Math.min(10, Math.max(3, (editValue.split('\n').length + 1)))"
      ></textarea>
    </div>
    
    <!-- Entity Reference input -->
    <div v-else-if="ValueHelpers.isEntityRef(value)" class="reference-container">
      <div class="input-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
          <path fill="currentColor" d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/>
        </svg>
      </div>
      <input 
        type="text"
        v-model="editValue" 
        class="reference-input"
        placeholder="Entity ID"
      />
    </div>
    
    <!-- Default input for most types -->
    <div v-else class="input-container">
      <div class="input-icon" v-if="ValueHelpers.isInt(value) || ValueHelpers.isFloat(value)">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
          <path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z M7.5 17h2v-7h-4v2h2zM13.5 17h2v-7h-4v2h2z"/>
        </svg>
      </div>
      <input 
        :type="inputType" 
        v-model="editValue" 
        class="text-input"
        :step="ValueHelpers.isFloat(value) ? '0.01' : '1'"
      />
    </div>
    
    <div class="editor-buttons">
      <button class="save-button" @click="handleSave">
        <span class="button-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24">
            <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
          </svg>
        </span>
        Save
      </button>
      <button class="cancel-button" @click="handleCancel">
        <span class="button-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24">
            <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </span>
        Cancel
      </button>
    </div>
  </div>
</template>

<style scoped>
.value-editor {
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 6px;
  padding: 10px;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
}

.input-container, .timestamp-container, .text-container, .reference-container, .choice-container {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--qui-text-secondary);
  opacity: 0.6;
  display: flex;
  align-items: center;
  justify-content: center;
}

.text-container .input-icon {
  top: 12px;
  transform: none;
}

.text-input, .timestamp-input, .text-area, .reference-input, .db-choice-select {
  font-family: var(--qui-font-family);
  font-size: var(--qui-font-size-base);
  padding: 8px 10px 8px 36px;
  background: var(--qui-bg-primary);
  border: 1px solid var(--qui-hover-border);
  border-radius: 6px;
  color: var(--qui-text-primary);
  width: 100%;
  transition: all 0.2s var(--qui-animation-bounce);
}

.text-input:focus, .timestamp-input:focus, .text-area:focus, .reference-input:focus, .db-choice-select:focus {
  border-color: var(--qui-accent-color);
  outline: none;
  box-shadow: 0 0 0 2px rgba(0, 255, 136, 0.2);
}

.text-area {
  resize: vertical;
  min-height: 80px;
  padding-top: 32px; /* Make room for the icon */
  width: 100%;
  line-height: 1.4;
  font-family: var(--qui-font-family);
}

.checkbox-container {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--qui-bg-primary);
  border: 1px solid var(--qui-hover-border);
  border-radius: 6px;
  padding: 8px 12px;
  transition: all 0.2s var(--qui-animation-bounce);
}

.checkbox-container:hover {
  border-color: var(--qui-accent-color);
  box-shadow: 0 0 0 2px rgba(0, 255, 136, 0.1);
}

.bool-checkbox {
  width: 18px;
  height: 18px;
  accent-color: var(--qui-accent-color);
  cursor: pointer;
}

.timestamp-input {
  font-family: monospace;
  letter-spacing: 0.5px;
}

.reference-input {
  color: var(--qui-accent-secondary);
  font-family: monospace;
}

/* Choice select styling */
.db-choice-select {
  appearance: none;
  padding-right: 30px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath fill='%23888888' d='M7 10l5 5 5-5z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
  background-size: 16px;
  cursor: pointer;
  color: var(--qui-accent-color);
}

.choice-container .input-icon {
  color: var(--qui-accent-color);
  opacity: 0.7;
}

.editor-buttons {
  display: flex;
  gap: 8px;
  margin-top: 6px;
  justify-content: flex-end;
}

.save-button, .cancel-button {
  padding: 6px 14px;
  border-radius: 20px;
  border: none;
  font-size: var(--qui-font-size-small);
  font-weight: var(--qui-font-weight-medium);
  cursor: pointer;
  transition: all 0.2s var(--qui-animation-bounce);
  display: flex;
  align-items: center;
  gap: 6px;
}

.button-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.save-button {
  background: var(--qui-accent-color);
  color: var(--qui-bg-primary);
}

.save-button:hover {
  background: var(--qui-accent-secondary);
  transform: translateY(-1px);
  box-shadow: 0 3px 8px var(--qui-accent-glow);
}

.save-button:active {
  transform: translateY(0);
}

.cancel-button {
  background: var(--qui-overlay-primary);
  color: var(--qui-text-primary);
  border: 1px solid var(--qui-hover-border);
}

.cancel-button:hover {
  background: var(--qui-overlay-secondary);
  transform: translateY(-1px);
}

.cancel-button:active {
  transform: translateY(0);
}
</style>
