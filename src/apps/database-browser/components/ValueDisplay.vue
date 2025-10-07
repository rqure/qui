<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue';
import { useDataStore } from '@/stores/data';
import type { Value, FieldType, EntityType, EntityId } from '@/core/data/types';
import { ValueHelpers, FieldSchemaHelpers } from '@/core/data/types';
import { useEntityDrag, ENTITY_MIME_TYPE } from '@/core/utils/composables';
import { fetchEntityName } from '@/apps/database-browser/utils/formatters';

const props = defineProps<{
  value: Value;
  fieldType?: FieldType | string; // Add fieldType prop to get schema information
  entityType?: string; // Add entityType prop to get schema information
}>();

const dataStore = useDataStore();
const choiceOptions = ref<string[]>([]);
const choiceLabel = ref<string>('');
const entityNames = ref<Map<EntityId, string>>(new Map());
// Fix the type declaration for cleanupFunction
let cleanupFunction: (() => void) | null = null;

// Register onUnmounted at the top level before any async operations
onUnmounted(() => {
  if (cleanupFunction) {
    cleanupFunction();
  }
});

// Determine display format based on value type
const displayValue = computed(() => {
  if (!props.value) return 'N/A';
  
  // Check type using ValueHelpers
  if (ValueHelpers.isChoice(props.value)) {
    // If we have a choice label already resolved, use that
    if (choiceLabel.value) {
      return `${choiceLabel.value} (${props.value.Choice})`;
    }
    return `Choice ${props.value.Choice}`;
  }
  
  if (ValueHelpers.isString(props.value)) {
    return props.value.String || '';
  }
  
  if (ValueHelpers.isInt(props.value)) {
    return String(props.value.Int);
  }
  
  if (ValueHelpers.isFloat(props.value)) {
    return String(props.value.Float);
  }
  
  if (ValueHelpers.isBool(props.value)) {
    return props.value.Bool ? 'True' : 'False';
  }
  
  if (ValueHelpers.isEntityRef(props.value)) {
    if (props.value.EntityReference !== null) {
      const entityId = props.value.EntityReference;
      const name = entityNames.value.get(entityId);
      return name ? `${entityId} (${name})` : String(entityId);
    }
    return 'None';
  }
  
  if (ValueHelpers.isEntityList(props.value)) {
    return `[${props.value.EntityList.length} items]`;
  }
  
  if (ValueHelpers.isTimestamp(props.value)) {
    try {
      const date = new Date(props.value.Timestamp);
      return new Intl.DateTimeFormat('default', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: 'numeric', minute: 'numeric'
      }).format(date);
    } catch (e) {
      return String(props.value.Timestamp);
    }
  }
  
  if (ValueHelpers.isBlob(props.value)) {
    return `[Binary: ${props.value.Blob.length} bytes]`;
  }
  
  return 'Unknown';
});

// Determine if we should use special styling based on type
const valueClass = computed(() => {
  if (!props.value) return '';
  
  if (ValueHelpers.isBool(props.value)) {
    return props.value.Bool ? 'bool-true' : 'bool-false';
  }
  
  if (ValueHelpers.isEntityRef(props.value)) {
    return 'entity-reference';
  }
  
  if (ValueHelpers.isTimestamp(props.value)) {
    return 'timestamp';
  }
  
  if (ValueHelpers.isInt(props.value) || ValueHelpers.isFloat(props.value)) {
    return 'numeric';
  }
  
  if (ValueHelpers.isChoice(props.value)) {
    return 'choice';
  }
  
  return '';
});

// Load choice options when the component mounts or when props change
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
    
    // Get the complete entity schema (includes inherited fields)
    const schema = await dataStore.getCompleteEntitySchema(entityTypeId);
    
    // Get field type as number
    const fieldTypeNum = typeof props.fieldType === 'number' ? props.fieldType : Number(props.fieldType);
    
    // Check if we have a field schema for this field
    if (schema?.fields && schema.fields[fieldTypeNum]) {
      const fieldSchema = schema.fields[fieldTypeNum];
      const choices = FieldSchemaHelpers.getChoices(fieldSchema);
      const choiceIndex = props.value.Choice;
      
      if (choices && choices.length > 0 && choiceIndex >= 0 && choiceIndex < choices.length) {
        choiceOptions.value = choices;
        choiceLabel.value = choices[choiceIndex];
      } else if (choices && choices.length > 0) {
        // Have choices but index out of range
        choiceOptions.value = choices;
        choiceLabel.value = `Invalid index ${choiceIndex}`;
      } else {
        // No choices available
        choiceLabel.value = '';
      }
    } else {
      console.warn('Field schema not found for field type:', fieldTypeNum, 'in schema:', schema);
      choiceLabel.value = '';
    }
  } catch (error) {
    console.error('Error loading choice options:', error);
    choiceLabel.value = '';
  }
}

// Load entity names for EntityReference and EntityList
async function loadEntityNames() {
  const idsToLoad: EntityId[] = [];
  
  if (ValueHelpers.isEntityRef(props.value) && props.value.EntityReference !== null) {
    idsToLoad.push(props.value.EntityReference);
  } else if (ValueHelpers.isEntityList(props.value)) {
    idsToLoad.push(...props.value.EntityList);
  }
  
  // Clear existing names and reload (names can change)
  entityNames.value.clear();
  
  // Load names for all entity IDs
  for (const entityId of idsToLoad) {
    try {
      const name = await fetchEntityName(entityId);
      entityNames.value.set(entityId, name);
    } catch (error) {
      console.warn(`Failed to load name for entity ${entityId}:`, error);
    }
  }
}

// Watch for changes in relevant props
watch(
  [() => ValueHelpers.isChoice(props.value), () => props.entityType, () => props.fieldType], 
  (newVals) => {
    if (ValueHelpers.isChoice(props.value)) {
      loadChoiceOptions();
    }
  },
  { immediate: true }
);

// Watch for changes in value to reload entity names
watch(
  () => props.value,
  async () => {
    if (ValueHelpers.isEntityRef(props.value) || ValueHelpers.isEntityList(props.value)) {
      await loadEntityNames();
    }
  },
  { immediate: true, deep: true }
);

onMounted(async () => {
  if (ValueHelpers.isChoice(props.value) && props.entityType && props.fieldType) {
    await loadChoiceOptions();
  }
  
  // Load entity names if needed
  if (ValueHelpers.isEntityRef(props.value) || ValueHelpers.isEntityList(props.value)) {
    await loadEntityNames();
  }
  
  // Store any cleanup function from hooks used inside onMounted
  // so we can call it in onUnmounted
  const dragCleanup = () => {
    // Any cleanup needed for drag functionality
  };
  
  cleanupFunction = dragCleanup;
});

// Get drag and drop utilities from composable
const { startEntityDrag, navigateToEntity } = useEntityDrag();

// Add drag functionality for entity references and entity lists
function handleDragStart(event: DragEvent, entityId: number | string) {
  // Pass numeric ID to composable; it will stringify for browser APIs
  const idVal = typeof entityId === 'number' ? entityId : (isNaN(Number(entityId)) ? entityId : Number(entityId));
  startEntityDrag(event, idVal as any, props.entityType, undefined, props.fieldType as any);
}

// Make an EntityId clickable - emitting a navigation event
function handleEntityClick(entityId: number | string) {
  const idVal = typeof entityId === 'number' ? entityId : (isNaN(Number(entityId)) ? entityId : Number(entityId));
  navigateToEntity(idVal);
}

// Helper to get formatted entity ID with name
function getEntityDisplayText(entityId: EntityId): string {
  const name = entityNames.value.get(entityId);
  return name ? `${entityId} (${name})` : String(entityId);
}
</script>

<template>
  <div class="value-display" :class="valueClass">
    <span v-if="ValueHelpers.isBool(value)" class="bool-indicator">
      <svg v-if="displayValue === 'True'" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
        <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
      </svg>
      <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
        <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
      </svg>
      <span class="bool-label">{{ displayValue }}</span>
    </span>
    
    <span 
      v-else-if="ValueHelpers.isEntityRef(value)" 
      class="reference-container"
      draggable="true"
      @dragstart="handleDragStart($event, value.EntityReference || 0)"
      @click="handleEntityClick(value.EntityReference || 0)"
    >
      <span class="reference-indicator">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24">
          <path fill="currentColor" d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/>
        </svg>
      </span>
      {{ displayValue }}
    </span>
    
    <span v-else-if="ValueHelpers.isTimestamp(value)" class="timestamp-container">
      <span class="timestamp-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24">
          <path fill="currentColor" d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7V7z"/>
        </svg>
      </span>
      {{ displayValue }}
    </span>
    
    <span v-else-if="ValueHelpers.isChoice(value)" class="choice-container">
      <span class="choice-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24">
          <path fill="currentColor" d="M4 14h4v-4H4v4zm0 5h4v-4H4v4zM4 9h4V5H4v4zm5 5h12v-4H9v4zm0 5h12v-4H9v4zM9 5v4h12V5H9z"/>
        </svg>
      </span>
      {{ displayValue }}
    </span>
    
    <!-- Add EntityList rendering with draggable items -->
    <span v-else-if="ValueHelpers.isEntityList(value)" class="entity-list-container">
      <div class="entity-list-value">
        <div 
          v-for="(entityId, index) in value.EntityList" 
          :key="`${entityId}-${index}`"
          class="entity-list-item"
          draggable="true"
          @dragstart="handleDragStart($event, entityId)"
          @click="handleEntityClick(entityId)"
        >
          <span class="entity-list-item-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24">
              <path fill="currentColor" d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
            </svg>
          </span>
          {{ getEntityDisplayText(entityId) }}
        </div>
        <div v-if="value.EntityList.length === 0" class="entity-list-empty">
          No items
        </div>
      </div>
    </span>
    
    <!-- Special rendering for String values to preserve line breaks -->
    <span v-else-if="ValueHelpers.isString(value)" class="string-container">
      <pre v-if="displayValue.includes('\n')" class="string-multiline">{{ displayValue }}</pre>
      <span v-else>{{ displayValue }}</span>
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

/* Add styling for the Reference Container to make it obviously draggable */
.reference-container {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  border: 1px dotted transparent;
  padding: 2px 6px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.reference-container:hover {
  border-color: var(--qui-accent-secondary);
  background: var(--qui-accent-secondary-bg);
}

.reference-container:active {
  transform: scale(0.98);
}

/* New styles for entity lists */
.entity-list-container {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.entity-list-value {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 150px;
  overflow-y: auto;
  padding: 4px;
  background: var(--qui-overlay-primary);
  border-radius: 4px;
}

.entity-list-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 6px;
  border-radius: 4px;
  font-family: monospace;
  background: var(--qui-accent-secondary-bg);
  color: var(--qui-accent-secondary);
  font-size: var(--qui-font-size-small);
  transition: all 0.2s var(--qui-animation-bounce);
  cursor: pointer;
  border: 1px dotted transparent;
}

.entity-list-item:hover {
  background: var(--qui-accent-secondary-hover);
  border-color: var(--qui-accent-secondary);
}

.entity-list-item:active {
  transform: scale(0.98);
}

.entity-list-item-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.7;
}

.entity-list-empty {
  font-style: italic;
  color: var(--qui-text-secondary);
  opacity: 0.7;
  padding: 4px;
  text-align: center;
}

/* Add styles for string values */
.string-container {
  white-space: pre-wrap;
  overflow-wrap: break-word;
  max-width: 100%;
}

.string-multiline {
  background: var(--qui-overlay-primary);
  border-radius: 4px;
  padding: 8px;
  margin: 0;
  overflow: auto;
  max-height: 200px;
  font-family: var(--qui-font-family);
  font-size: var(--qui-font-size-base);
  line-height: 1.4;
  border: 1px solid var(--qui-hover-border);
  width: 100%;
}

/* Add scrollbar styling for multiline strings */
.string-multiline::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.string-multiline::-webkit-scrollbar-track {
  background: var(--qui-scrollbar-track);
}

.string-multiline::-webkit-scrollbar-thumb {
  background: var(--qui-scrollbar-thumb);
  border-radius: 3px;
}

.string-multiline::-webkit-scrollbar-thumb:hover {
  background: var(--qui-scrollbar-thumb-hover);
}
</style>
