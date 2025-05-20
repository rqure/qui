<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue';
import { useDataStore } from '@/stores/data';
import { ValueType } from '@/core/data/types';

// Define our own Value interface to avoid type errors
interface Value {
  type: string;
  toString: () => string;
  asString: () => string; // Add this to support proper value display
  getChoice?: () => number; // Add optional getChoice method for Choice type values
}

const props = defineProps<{
  value: Value;
  fieldType?: string; // Add fieldType prop to get schema information
  entityType?: string; // Add entityType prop to get schema information
}>();

const dataStore = useDataStore();
const choiceOptions = ref<string[]>([]);
const choiceLabel = ref<string>('');

// Determine display format based on value type
const displayValue = computed(() => {
  if (!props.value) return 'N/A';
  
  const valueType = props.value.type;
  
  // First check for Choice type and use our resolved label if available
  if (valueType === ValueType.Choice) {
    // If we have a choice label already resolved, use that
    if (choiceLabel.value) {
      console.log(`Returning choice label: ${choiceLabel.value} instead of raw value`);
      return choiceLabel.value;
    }
    
    // Otherwise, return a loading indicator
    return `Loading...`;
  }
  
  // Then try asString() for other types
  if (typeof props.value.asString === 'function') {
    return props.value.asString();
  }
  
  switch (valueType) {
    case ValueType.String:
      return props.value.toString();
      
    case ValueType.Int:
    case ValueType.Float:
      return props.value.toString();
      
    case ValueType.Bool:
      const boolValue = props.value.toString().toLowerCase();
      return boolValue === 'true' || boolValue === '1' ? 'True' : 'False';
      
    case ValueType.EntityReference:
      return props.value.toString();
      
    case ValueType.Timestamp:
      try {
        const date = new Date(props.value.toString());
        return new Intl.DateTimeFormat('default', {
          year: 'numeric', month: 'short', day: 'numeric',
          hour: 'numeric', minute: 'numeric'
        }).format(date);
      } catch (e) {
        return props.value.toString();
      }
      
    default:
      return props.value.toString();
  }
});

// Determine if we should use special styling based on type
const valueClass = computed(() => {
  if (!props.value) return '';
  
  const valueType = props.value.type;
  
  switch (valueType) {
    case ValueType.Bool:
      const boolValue = props.value.toString().toLowerCase();
      return boolValue === 'true' || boolValue === '1' ? 'bool-true' : 'bool-false';
      
    case ValueType.EntityReference:
      return 'entity-reference';
      
    case ValueType.Timestamp:
      return 'timestamp';
      
    case ValueType.Int:
    case ValueType.Float:
      return 'numeric';
      
    case ValueType.Choice:
      return 'choice';
      
    default:
      return '';
  }
});

// Load choice options when the component mounts or when props change
async function loadChoiceOptions() {
  if (props.value?.type !== ValueType.Choice || !props.entityType || !props.fieldType) {
    return;
  }
  
  try {
    console.log(`Loading choice options for ${props.entityType}.${props.fieldType}`);
    
    // Get the entity schema
    const schema = await dataStore.getEntitySchema(props.entityType);
    
    // Check if we have a field schema for this field
    if (schema?.fields && schema.fields[props.fieldType]) {
      const fieldSchema = schema.fields[props.fieldType];
      
      console.log(`Found field schema with choices:`, fieldSchema.choices);
      
      // Store the choice options
      choiceOptions.value = fieldSchema.choices || [];
      
      // If we have a getChoice method, get the choice index and resolve the label
      if (typeof props.value.getChoice === 'function') {
        const choiceIndex = props.value.getChoice();
        console.log(`Choice index from getChoice():`, choiceIndex);
        
        // Get the choice label based on the index
        if (choiceIndex >= 0 && choiceIndex < choiceOptions.value.length) {
          choiceLabel.value = choiceOptions.value[choiceIndex];
          console.log(`Setting choice label to "${choiceLabel.value}"`);
        } else {
          choiceLabel.value = `Unknown choice (${choiceIndex})`;
        }
      } else {
        // Try to parse the value as a number for the index
        const index = parseInt(props.value.toString(), 10);
        if (!isNaN(index) && index >= 0 && index < choiceOptions.value.length) {
          choiceLabel.value = choiceOptions.value[index];
          console.log(`Setting choice label from parsed index to "${choiceLabel.value}"`);
        } else {
          choiceLabel.value = `Invalid choice (${props.value.toString()})`;
        }
      }
      
      console.log(`Final choice label:`, choiceLabel.value);
    } else {
      console.warn(`No field schema found for ${props.entityType}.${props.fieldType}`);
      choiceLabel.value = 'Unknown choice';
    }
  } catch (error) {
    console.error('Error loading choice options:', error);
    choiceLabel.value = `Error loading choice`;
  }
}

// Watch for changes in relevant props
watch(
  [() => props.value?.type === ValueType.Choice, () => props.entityType, () => props.fieldType], 
  (newVals) => {
    console.log('Watch triggered for choice detection:', newVals);
    if (props.value?.type === ValueType.Choice) {
      loadChoiceOptions();
    }
  },
  { immediate: true }
);

onMounted(() => {
  if (props.value?.type === ValueType.Choice && props.entityType && props.fieldType) {
    console.log('Mounted: loading choice options');
    loadChoiceOptions();
  }
});
</script>

<template>
  <div class="value-display" :class="valueClass">
    <span v-if="value.type === ValueType.Bool" class="bool-indicator">
      <svg v-if="displayValue === 'True'" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
        <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
      </svg>
      <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
        <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
      </svg>
      <span class="bool-label">{{ displayValue }}</span>
    </span>
    
    <span v-else-if="value.type === ValueType.EntityReference" class="reference-container">
      <span class="reference-indicator">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24">
          <path fill="currentColor" d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/>
        </svg>
      </span>
      {{ displayValue }}
    </span>
    
    <span v-else-if="value.type === ValueType.Timestamp" class="timestamp-container">
      <span class="timestamp-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24">
          <path fill="currentColor" d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7V7z"/>
        </svg>
      </span>
      {{ displayValue }}
    </span>
    
    <span v-else-if="value.type === ValueType.Choice" class="choice-container">
      <span class="choice-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24">
          <path fill="currentColor" d="M4 14h4v-4H4v4zm0 5h4v-4H4v4zM4 9h4V5H4v4zm5 5h12v-4H9v4zm0 5h12v-4H9v4zM9 5v4h12V5H9z"/>
        </svg>
      </span>
      {{ displayValue }}
    </span>
    
    <span v-else>{{ displayValue }}</span>
  </div>
</template>

<style scoped>
.value-display {
  font-family: var(--qui-font-family);
  font-size: var(--qui-font-size-base);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 2px;
  border-radius: 4px;
}

.bool-indicator, .reference-indicator, .timestamp-icon, .choice-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  width: 24px;
  height: 24px;
}

.bool-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.bool-label {
  font-weight: var(--qui-font-weight-medium);
}

.bool-true {
  color: var(--qui-success-color);
}

.bool-true .bool-indicator {
  background: var(--qui-success-bg);
}

.bool-false {
  color: var(--qui-danger-color);
}

.bool-false .bool-indicator {
  background: var(--qui-danger-bg);
}

.reference-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.entity-reference {
  color: var(--qui-accent-secondary);
  text-decoration: underline;
  text-decoration-style: dotted;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--qui-accent-secondary-bg);
  transition: all 0.2s var(--qui-animation-bounce);
}

.entity-reference:hover {
  background: var(--qui-accent-secondary-hover);
  text-decoration-style: solid;
}

.reference-indicator {
  background: var(--qui-accent-secondary-bg);
}

.timestamp-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.timestamp-icon {
  background: var(--qui-overlay-primary);
}

.timestamp {
  font-family: monospace;
  opacity: 0.9;
  letter-spacing: 0.3px;
  padding: 2px 6px;
  background: var(--qui-overlay-primary);
  border-radius: 4px;
}

.numeric {
  font-family: monospace;
  letter-spacing: 0.5px;
  font-weight: var(--qui-font-weight-medium);
}

/* Styles for Choice type */
.choice-container {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--qui-accent-bg-faint);
  border-radius: 12px;
  padding: 2px 8px;
  color: var(--qui-accent-color);
  font-weight: var(--qui-font-weight-medium);
}

.choice-icon {
  background: var(--qui-accent-bg-faint);
  color: var(--qui-accent-color);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  width: 24px;
  height: 24px;
}

.choice-index {
  font-size: 0.8em;
  opacity: 0.5;
  color: var(--qui-text-secondary);
}

.choice {
  background: var(--qui-accent-bg-faint);
  color: var(--qui-accent-color);
  font-weight: var(--qui-font-weight-medium);
  transition: all 0.2s var(--qui-animation-bounce);
}

.choice:hover {
  background: var(--qui-accent-bg-light);
}
</style>
