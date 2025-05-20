<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { ValueFactories, ValueType } from '@/core/data/types';
import { useDataStore } from '@/stores/data';

// Define our own Value interface to avoid type errors
interface Value {
  type: string;
  toString: () => string;
  asString?: () => string; // Add optional asString method
  // Add type-specific getters
  getInt?: () => number;
  getFloat?: () => number;
  getString?: () => string;
  getBool?: () => boolean;
  getTimestamp?: () => Date;
  getEntityReference?: () => string;
  getChoice?: () => number;
}

const props = defineProps<{
  value: Value;
  fieldType?: string;
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
  
  // Use type-specific getters if available
  if (props.value.type === ValueType.String && typeof props.value.getString === 'function') {
    return props.value.getString();
  } else if (props.value.type === ValueType.Int && typeof props.value.getInt === 'function') {
    return props.value.getInt().toString();
  } else if (props.value.type === ValueType.Float && typeof props.value.getFloat === 'function') {
    return props.value.getFloat().toString();
  } else if (props.value.type === ValueType.Bool && typeof props.value.getBool === 'function') {
    return props.value.getBool().toString();
  } else if (props.value.type === ValueType.EntityReference && typeof props.value.getEntityReference === 'function') {
    return props.value.getEntityReference();
  } else if (props.value.type === ValueType.Timestamp && typeof props.value.getTimestamp === 'function') {
    return formatDateForInput(props.value.getTimestamp());
  } else if (props.value.type === ValueType.Choice && typeof props.value.getChoice === 'function') {
    currentChoiceIndex.value = props.value.getChoice();
    return currentChoiceIndex.value.toString();
  }
  
  // Use asString if available
  if (typeof props.value.asString === 'function') {
    return props.value.asString();
  }
  
  // Fallback to toString
  return props.value.toString();
}

const editValue = ref<string>(getInitialValue());
const inputType = computed(() => {
  if (!props.value) return 'text';
  
  const valueType = props.value.type;
  
  switch (valueType) {
    case ValueType.Int:
      return 'number';
    case ValueType.Float:
      return 'number';
    case ValueType.Bool:
      return 'checkbox';
    case ValueType.Timestamp:
      return 'datetime-local';
    case ValueType.Choice:
      return 'choice';
    default:
      return 'text';
  }
});

// For boolean values, convert to checked state
const isChecked = computed(() => {
  if (props.value?.type === ValueType.Bool) {
    const val = props.value.toString().toLowerCase();
    return val === 'true' || val === '1';
  }
  return false;
});

// Modify the dateTimeValue computed property to be a method
// that will be used to set the initial value but not bind directly
function getInitialDateTimeValue(): string {
  if (props.value?.type === ValueType.Timestamp) {
    try {
      const date = new Date(props.value.toString());
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
  if (props.value?.type !== ValueType.Choice || !props.entityType || !props.fieldType) {
    return;
  }
  
  try {
    console.log(`Editor: Loading choice options for ${props.entityType}.${props.fieldType}`);
    const schema = await dataStore.getEntitySchema(props.entityType);
    if (schema?.fields && schema.fields[props.fieldType]) {
      const fieldSchema = schema.fields[props.fieldType];
      choiceOptions.value = fieldSchema.choices || [];
      console.log(`Editor: Found choices:`, choiceOptions.value);
      
      // Set current choice index
      if (typeof props.value.getChoice === 'function') {
        currentChoiceIndex.value = props.value.getChoice();
        console.log(`Editor: Current choice index:`, currentChoiceIndex.value);
      }
    }
  } catch (error) {
    console.error('Error loading choice options:', error);
  }
}

function handleSave() {
  // Create appropriate value based on type
  let newValue;
  
  try {
    if (props.value.type === ValueType.Bool) {
      // For checkbox, use checked state
      const checkboxEl = document.getElementById('value-editor-checkbox') as HTMLInputElement;
      newValue = ValueFactories.newBool(checkboxEl.checked);
    } else if (props.value.type === ValueType.Int) {
      newValue = ValueFactories.newInt(parseInt(editValue.value, 10));
    } else if (props.value.type === ValueType.Float) {
      newValue = ValueFactories.newFloat(parseFloat(editValue.value));
    } else if (props.value.type === ValueType.String) {
      newValue = ValueFactories.newString(editValue.value);
    } else if (props.value.type === ValueType.EntityReference) {
      newValue = ValueFactories.newEntityReference(editValue.value);
    } else if (props.value.type === ValueType.Timestamp) {
      const date = new Date(editValue.value);
      newValue = ValueFactories.newTimestamp(date);
    } else if (props.value.type === ValueType.Choice) {
      // For Choice type, use the selected index
      newValue = ValueFactories.newChoice(currentChoiceIndex.value);
    } else {
      // Default fallback
      newValue = ValueFactories.newString(editValue.value);
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
  if (props.value?.type === ValueType.Timestamp) {
    editValue.value = getInitialDateTimeValue();
  }

  // Load choice options if this is a Choice type
  if (props.value?.type === ValueType.Choice && props.entityType && props.fieldType) {
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
  [() => props.value?.type === ValueType.Choice, () => props.entityType, () => props.fieldType],
  () => {
    if (props.value?.type === ValueType.Choice && props.entityType && props.fieldType) {
      loadChoiceOptions();
    }
  },
  { immediate: true }
);
</script>

<template>
  <div class="value-editor">
    <!-- Boolean checkbox -->
    <div v-if="value.type === ValueType.Bool" class="checkbox-container">
      <input 
        id="value-editor-checkbox" 
        type="checkbox" 
        :checked="isChecked" 
        class="bool-checkbox"
      />
      <label for="value-editor-checkbox">{{ isChecked ? 'True' : 'False' }}</label>
    </div>
    
    <!-- Choice dropdown -->
    <div v-else-if="value.type === ValueType.Choice" class="choice-container">
      <div class="input-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
          <path fill="currentColor" d="M4 14h4v-4H4v4zm0 5h4v-4H4v4zM4 9h4V5H4v4zm5 5h12v-4H9v4zm0 5h12v-4H9v4zM9 5v4h12V5H9z"/>
        </svg>
      </div>
      <select 
        class="choice-select"
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
    
    <!-- Timestamp input - Fix the issue by removing the :value binding -->
    <div v-else-if="value.type === ValueType.Timestamp" class="timestamp-container">
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
    
    <!-- Text area for longer text content -->
    <div v-else-if="value.type === ValueType.String && value.toString().length > 50" class="text-container">
      <div class="input-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
          <path fill="currentColor" d="M14 17H4v2h10v-2zm6-8H4v2h16V9zM4 15h16v-2H4v2zM4 5v2h16V5H4z"/>
        </svg>
      </div>
      <textarea 
        v-model="editValue" 
        class="text-area"
        rows="4"
      ></textarea>
    </div>
    
    <!-- Entity Reference input -->
    <div v-else-if="value.type === ValueType.EntityReference" class="reference-container">
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
      <div class="input-icon" v-if="value.type === ValueType.Int || value.type === ValueType.Float">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
          <path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z M7.5 17h2v-7h-4v2h2zM13.5 17h2v-7h-4v2h2z"/>
        </svg>
      </div>
      <div class="input-icon" v-else-if="value.type === ValueType.String">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
          <path fill="currentColor" d="M9.93 13.5h4.14L12 7.98zM20 2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-4.05 16.5-1.14-3H9.17l-1.12 3H5.96l5.11-13h1.86l5.11 13h-2.09z"/>
        </svg>
      </div>
      <input 
        :type="inputType" 
        v-model="editValue" 
        class="text-input"
        :step="value.type === 'Float' ? '0.01' : '1'"
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

.text-input, .timestamp-input, .text-area, .reference-input, .choice-select {
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

.text-input:focus, .timestamp-input:focus, .text-area:focus, .reference-input:focus, .choice-select:focus {
  border-color: var(--qui-accent-color);
  outline: none;
  box-shadow: 0 0 0 2px rgba(0, 255, 136, 0.2);
}

.text-area {
  resize: vertical;
  min-height: 100px;
  padding-top: 32px; /* Make room for the icon */
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
.choice-select {
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
