<script setup lang="ts">
import { computed } from 'vue';

// Define our own Value interface to avoid type errors
interface Value {
  type: string;
  toString: () => string;
  asString: () => string; // Add this to support proper value display
}

const props = defineProps<{
  value: Value;
}>();

// Determine display format based on value type
const displayValue = computed(() => {
  if (!props.value) return 'N/A';
  
  // Use asString() method if available (from data store Value objects)
  if (typeof props.value.asString === 'function') {
    return props.value.asString();
  }
  
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
      <svg v-if="displayValue === 'True'" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
        <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
      </svg>
      <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
        <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
      </svg>
      <span class="bool-label">{{ displayValue }}</span>
    </span>
    
    <span v-else-if="value.type === 'EntityReference'" class="reference-container">
      <span class="reference-indicator">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24">
          <path fill="currentColor" d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/>
        </svg>
      </span>
      {{ displayValue }}
    </span>
    
    <span v-else-if="value.type === 'Timestamp'" class="timestamp-container">
      <span class="timestamp-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24">
          <path fill="currentColor" d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7V7z"/>
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

.bool-indicator, .reference-indicator, .timestamp-icon {
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
  color: #4CAF50;
}

.bool-true .bool-indicator {
  background: rgba(76, 175, 80, 0.1);
}

.bool-false {
  color: #F44336;
}

.bool-false .bool-indicator {
  background: rgba(244, 67, 54, 0.1);
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
  background: rgba(0, 255, 136, 0.05);
  transition: all 0.2s var(--qui-animation-bounce);
}

.entity-reference:hover {
  background: rgba(0, 255, 136, 0.1);
  text-decoration-style: solid;
}

.reference-indicator {
  background: rgba(0, 255, 136, 0.1);
}

.timestamp-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.timestamp-icon {
  background: rgba(255, 255, 255, 0.05);
}

.timestamp {
  font-family: monospace;
  opacity: 0.9;
  letter-spacing: 0.3px;
  padding: 2px 6px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}

.numeric {
  font-family: monospace;
  letter-spacing: 0.5px;
  font-weight: var(--qui-font-weight-medium);
}
</style>
