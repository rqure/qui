<script setup lang="ts">
import { computed } from 'vue';

// Define our own Value interface to avoid type errors
interface Value {
  type: string;
  toString: () => string;
}

const props = defineProps<{
  value: Value;
}>();

// Determine display format based on value type
const displayValue = computed(() => {
  if (!props.value) return 'N/A';
  
  const valueType = props.value.type;
  
  switch (valueType) {
    case "String":
      return props.value.toString();
      
    case "Int":
    case "Float":
      return props.value.toString();
      
    case "Bool":
      const boolValue = props.value.toString().toLowerCase();
      return boolValue === 'true' || boolValue === '1' ? 'True' : 'False';
      
    case "EntityReference":
      return props.value.toString();
      
    case "Timestamp":
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
    case "Bool":
      const boolValue = props.value.toString().toLowerCase();
      return boolValue === 'true' || boolValue === '1' ? 'bool-true' : 'bool-false';
      
    case "EntityReference":
      return 'entity-reference';
      
    case "Timestamp":
      return 'timestamp';
      
    case "Int":
    case "Float":
      return 'numeric';
      
    default:
      return '';
  }
});
</script>

<template>
  <div class="value-display" :class="valueClass">
    <span v-if="value.type === 'Bool'" class="bool-indicator">
      <svg v-if="displayValue === 'True'" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24">
        <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
      </svg>
      <svg v-else xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24">
        <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
      </svg>
    </span>
    
    <span v-if="value.type === 'EntityReference'" class="reference-indicator">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24">
        <path fill="currentColor" d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/>
      </svg>
    </span>
    
    {{ displayValue }}
  </div>
</template>

<style scoped>
.value-display {
  font-family: var(--qui-font-family);
  font-size: var(--qui-font-size-base);
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 0;
}

.bool-indicator, .reference-indicator {
  display: flex;
  align-items: center;
}

.bool-true {
  color: #4CAF50;
}

.bool-false {
  color: #F44336;
}

.entity-reference {
  color: var(--qui-accent-secondary);
  text-decoration: underline;
  text-decoration-style: dotted;
  cursor: pointer;
}

.timestamp {
  font-family: monospace;
  opacity: 0.9;
}

.numeric {
  font-family: monospace;
  letter-spacing: 0.5px;
}
</style>
