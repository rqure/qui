<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';

// Define our own Value interface to avoid type errors
interface Value {
  type: string;
  toString: () => string;
}

const props = defineProps<{
  value: Value;
}>();

const emit = defineEmits<{
  (e: 'save', value: any): void;
  (e: 'cancel'): void;
}>();

const editValue = ref<string>(props.value?.toString() || '');
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

// Format date value for datetime-local input
const dateTimeValue = computed(() => {
  if (props.value?.type === "Timestamp") {
    try {
      const date = new Date(props.value.toString());
      return date.toISOString().slice(0, 16); // Format as yyyy-MM-ddThh:mm
    } catch (e) {
      return '';
    }
  }
  return '';
});

function handleSave() {
  // Create appropriate value based on type
  let newValue;
  
  if (props.value?.type === "Bool") {
    // For checkbox, use checked state
    const checkboxEl = document.getElementById('value-editor-checkbox') as HTMLInputElement;
    newValue = {
      type: 'Bool',
      toString: () => checkboxEl.checked ? 'true' : 'false'
    };
  } else if (props.value?.type === "Timestamp") {
    // For datetime, convert to ISO string
    try {
      const date = new Date(editValue.value);
      newValue = {
        type: 'Timestamp',
        toString: () => date.toISOString()
      };
    } catch (e) {
      // Invalid date, use original
      newValue = props.value;
    }
  } else {
    // For other types, just use the string value
    newValue = {
      type: props.value?.type || 'String',
      toString: () => editValue.value
    };
  }
  
  emit('save', newValue);
}

function handleCancel() {
  emit('cancel');
}

onMounted(() => {
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
    
    <!-- Timestamp input -->
    <input 
      v-else-if="value.type === 'Timestamp'" 
      type="datetime-local" 
      v-model="editValue" 
      :value="dateTimeValue"
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
