<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ValueFactories } from '@/core/data/types';

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
}

const props = defineProps<{
  value: Value;
}>();

const emit = defineEmits<{
  (e: 'save', value: any): void;
  (e: 'cancel'): void;
}>();

// Get the initial value based on the type
function getInitialValue(): string {
  if (!props.value) return '';
  
  // Use type-specific getters if available
  if (props.value.type === 'String' && typeof props.value.getString === 'function') {
    return props.value.getString();
  } else if (props.value.type === 'Int' && typeof props.value.getInt === 'function') {
    return props.value.getInt().toString();
  } else if (props.value.type === 'Float' && typeof props.value.getFloat === 'function') {
    return props.value.getFloat().toString();
  } else if (props.value.type === 'Bool' && typeof props.value.getBool === 'function') {
    return props.value.getBool().toString();
  } else if (props.value.type === 'EntityReference' && typeof props.value.getEntityReference === 'function') {
    return props.value.getEntityReference();
  } else if (props.value.type === 'Timestamp' && typeof props.value.getTimestamp === 'function') {
    return formatDateForInput(props.value.getTimestamp());
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
    case "Int":
      return 'number';
    case "Float":
      return 'number';
    case "Bool":
      return 'checkbox';
    case "Timestamp":
      return 'datetime-local';
    default:
      return 'text';
  }
});

// For boolean values, convert to checked state
const isChecked = computed(() => {
  if (props.value?.type === "Bool") {
    const val = props.value.toString().toLowerCase();
    return val === 'true' || val === '1';
  }
  return false;
});

// Modify the dateTimeValue computed property to be a method
// that will be used to set the initial value but not bind directly
function getInitialDateTimeValue(): string {
  if (props.value?.type === "Timestamp") {
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

function handleSave() {
  // Create appropriate value based on type
  let newValue;
  
  try {
    if (props.value.type === 'Bool') {
      // For checkbox, use checked state
      const checkboxEl = document.getElementById('value-editor-checkbox') as HTMLInputElement;
      newValue = ValueFactories.newBool(checkboxEl.checked);
    } else if (props.value.type === 'Int') {
      newValue = ValueFactories.newInt(parseInt(editValue.value, 10));
    } else if (props.value.type === 'Float') {
      newValue = ValueFactories.newFloat(parseFloat(editValue.value));
    } else if (props.value.type === 'String') {
      newValue = ValueFactories.newString(editValue.value);
    } else if (props.value.type === 'EntityReference') {
      newValue = ValueFactories.newEntityReference(editValue.value);
    } else if (props.value.type === 'Timestamp') {
      const date = new Date(editValue.value);
      newValue = ValueFactories.newTimestamp(date);
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

onMounted(() => {
  // Set the initial value for timestamp type
  if (props.value?.type === "Timestamp") {
    editValue.value = getInitialDateTimeValue();
  }
  
  // Focus the input when mounted
  const input = document.querySelector('.value-editor input, .value-editor textarea');
  if (input) {
    (input as HTMLElement).focus();
  }
});
</script>

<template>
  <div class="value-editor">
    <!-- Boolean checkbox -->
    <div v-if="value.type === 'Bool'" class="checkbox-container">
      <input 
        id="value-editor-checkbox" 
        type="checkbox" 
        :checked="isChecked" 
        class="bool-checkbox"
      />
      <label for="value-editor-checkbox">{{ isChecked ? 'True' : 'False' }}</label>
    </div>
    
    <!-- Timestamp input - Fix the issue by removing the :value binding -->
    <input 
      v-else-if="value.type === 'Timestamp'" 
      type="datetime-local" 
      v-model="editValue"
      class="timestamp-input"
    />
    
    <!-- Text area for longer text content -->
    <textarea 
      v-else-if="value.type === 'String' && value.toString().length > 50" 
      v-model="editValue" 
      class="text-area"
      rows="4"
    ></textarea>
    
    <!-- Default input for most types -->
    <input 
      v-else 
      :type="inputType" 
      v-model="editValue" 
      class="text-input"
      :step="value.type === 'Float' ? '0.01' : '1'"
    />
    
    <div class="editor-buttons">
      <button class="save-button" @click="handleSave">Save</button>
      <button class="cancel-button" @click="handleCancel">Cancel</button>
    </div>
  </div>
</template>

<style scoped>
.value-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.text-input, .timestamp-input, .text-area, .checkbox-container {
  font-family: var(--qui-font-family);
  font-size: var(--qui-font-size-base);
  padding: 6px 8px;
  background: var(--qui-bg-secondary);
  border: 1px solid var(--qui-hover-border);
  border-radius: 4px;
  color: var(--qui-text-primary);
  width: 100%;
}

.text-area {
  resize: vertical;
  min-height: 80px;
}

.checkbox-container {
  display: flex;
  align-items: center;
  gap: 8px;
  background: transparent;
  border: none;
}

.bool-checkbox {
  width: 16px;
  height: 16px;
  accent-color: var(--qui-accent-color);
}

.editor-buttons {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

.save-button, .cancel-button {
  padding: 4px 12px;
  border-radius: 4px;
  border: none;
  font-size: var(--qui-font-size-small);
  cursor: pointer;
  transition: all 0.2s var(--qui-animation-bounce);
}

.save-button {
  background: var(--qui-accent-color);
  color: var(--qui-bg-primary);
}

.save-button:hover {
  background: var(--qui-accent-secondary);
  transform: translateY(-1px);
}

.cancel-button {
  background: var(--qui-overlay-primary);
  color: var(--qui-text-primary);
}

.cancel-button:hover {
  background: var(--qui-overlay-secondary);
}
</style>
