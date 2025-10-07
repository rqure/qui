<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from 'vue';
import { useDataStore } from '@/stores/data';
import type { EntityId, EntityType, FieldType, Value, Timestamp } from '@/core/data/types';
import type { EntitySchema, FieldSchema, Notification, NotifyConfig } from '@/stores/data';
import { extractEntityType, ValueHelpers } from '@/core/data/types';
import { formatTimestamp } from '@/apps/database-browser/utils/formatters';
import ValueDisplay from '@/apps/database-browser/components/ValueDisplay.vue';
import ValueEditor from '@/apps/database-browser/components/ValueEditor.vue';
import { useEntityDropZone } from '@/core/utils/composables';

// Define our own field interface for display
interface DisplayField {
  fieldType: FieldType;
  value: Value;
  writeTime: Timestamp;
  writerId: EntityId | null;
  _dragHandlers?: {
    isEntityDrag: (event: DragEvent) => boolean;
    handleDragOver: (event: DragEvent) => void;
    handleDragLeave: () => void;
    handleDrop: (event: DragEvent) => void;
  };
}

const props = defineProps<{
  entityId: EntityId;
  standalone?: boolean; // Add new prop for standalone mode in window
}>();

const dataStore = useDataStore();
const loading = ref(true);
const error = ref<string | null>(null);
const fields = ref<DisplayField[]>([]);
const entityName = ref('');
const entityType = ref<EntityType>(0);
const entityTypeName = ref<string>('');
const editingField = ref<FieldType | null>(null);
const writerNames = ref<Record<number, string>>({});
const loadingWriterNames = ref<Record<number, boolean>>({});
const notificationCallbacks = ref<Map<number, (n: Notification) => void>>(new Map());
const notificationSubscriptions = ref<Array<{ token: string; unsubscribe: () => Promise<void> }>>([]);
const refreshTimestampsTimer = ref<number | null>(null);
const currentTimestamp = ref(Date.now());
const fieldDropTargets = ref<Record<number, boolean>>({});
const schema = ref<EntitySchema | null>(null);
const fieldTypeNames = ref<Record<number, string>>({});

// Register cleanup function at top level before any await
onUnmounted(async () => {
  await cleanupNotifications();
  
  // Clear the refresh timestamps timer
  if (refreshTimestampsTimer.value !== null) {
    clearInterval(refreshTimestampsTimer.value);
    refreshTimestampsTimer.value = null;
  }
});

// Start a timer to update the current timestamp
onMounted(() => {
  // Update timestamps every 10 seconds
  refreshTimestampsTimer.value = window.setInterval(() => {
    currentTimestamp.value = Date.now();
  }, 1000);
  
  // If there are already fields loaded, ensure writer names are loaded
  if (fields.value.length > 0) {
    loadWriterNames();
  }
});

// Load entity details when component mounts or entity ID changes
watch(() => props.entityId, async (newId, oldId) => {
  console.log('EntityId changed:', { newId, oldId, loading: loading.value });
  // Clean up previous notification subscriptions when entity changes
  await cleanupNotifications();
  await loadEntityDetails();
  console.log('After loadEntityDetails, loading:', loading.value);
}, { immediate: true });

// Function to format a timestamp with reactivity to currentTimestamp
const formatTimestampReactive = (date: Date | string | number) => {
  // Force re-evaluation when currentTimestamp changes
  currentTimestamp.value;
  return formatTimestamp(date);
};

// Helper function to convert timestamp array format to Date
// Format: [year, day_of_year, hour, minute, second, nanoseconds, ...]
const timestampToDate = (timestamp: any): Date | null => {
  if (!timestamp) return null;
  
  // If it's already a number (milliseconds), use it directly
  if (typeof timestamp === 'number') {
    return new Date(timestamp);
  }
  
  // If it's an array (Rust timestamp format)
  if (Array.isArray(timestamp) && timestamp.length >= 5) {
    try {
      const year = timestamp[0];
      const dayOfYear = timestamp[1];
      const hour = timestamp[2];
      const minute = timestamp[3];
      const second = timestamp[4];
      const nanoseconds = timestamp[5] || 0;
      
      // Convert day of year to month and day
      const date = new Date(year, 0); // January 1st of the year
      date.setDate(dayOfYear); // Set to the day of year
      date.setHours(hour, minute, second, Math.floor(nanoseconds / 1000000));
      
      return date;
    } catch (e) {
      console.error('Error converting timestamp array to date:', e, timestamp);
      return null;
    }
  }
  
  // Try to parse as a date
  try {
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? null : date;
  } catch (e) {
    return null;
  }
};

// Helper function to safely convert timestamp to ISO string
const toSafeISOString = (timestamp: any): string => {
  const date = timestampToDate(timestamp);
  if (!date || isNaN(date.getTime())) return 'Unknown';
  
  try {
    return date.toISOString();
  } catch (e) {
    return 'Invalid Date';
  }
};

async function cleanupNotifications() {
  // Unregister all field notifications
  for (const field of fields.value) {
    const notifyConfig: NotifyConfig = {
      EntityId: {
        entity_id: props.entityId,
        field_type: field.fieldType,
        trigger_on_change: true,
        context: []
      }
    };
    
    try {
      await dataStore.unregisterNotification(notifyConfig);
    } catch (err) {
      console.warn(`Error unregistering notification for field ${field.fieldType}:`, err);
    }
  }
}

// Helper to coerce fieldType-like values into numeric keys when possible
function toNumericFieldType(fieldType: any): number | null {
  if (typeof fieldType === 'number') return fieldType;
  if (typeof fieldType === 'string' && !isNaN(Number(fieldType))) return Number(fieldType);
  return null;
}

// Process drop on a specific field
async function processFieldDrop(fieldType: FieldType | string, entityId: EntityId) {
  try {
    // Find the field in our fields array
    const field = fields.value.find(f => f.fieldType === fieldType);
    if (!field) return;
    
    // First, clear the drop target highlight to prevent flickering
    const ftNum = toNumericFieldType(fieldType);
    if (ftNum !== null) fieldDropTargets.value[ftNum] = false;
    
    // Check the field's value type to determine handling
    if (ValueHelpers.isEntityRef(field.value)) {
      // For entity reference, set the reference to the dropped entity
      const newValue = ValueHelpers.entityRef(entityId);
      field.value = newValue;
      if (ftNum !== null) {
        await dataStore.write(props.entityId, [ftNum], newValue);
        console.log(`Updated reference field ${fieldType} to ${entityId}`);
      }
    } 
    else if (ValueHelpers.isEntityList(field.value)) {
      // For entity list, append the entity to the list if not already present
      const currentList = field.value.EntityList;
      
      // Check if the entity is already in the list
      if (!currentList.includes(entityId)) {
        // Create a new list with the added entity
        const newList = [...currentList, entityId];
        const newValue = ValueHelpers.entityList(newList);
        field.value = newValue;
        if (ftNum !== null) {
          await dataStore.write(props.entityId, [ftNum], newValue);
          console.log(`Added ${entityId} to entity list ${fieldType}`);
        }
      } else {
        console.log(`Entity ${entityId} already exists in list ${fieldType}`);
      }
    }
  } catch (error) {
    console.error(`Error handling drop on field ${fieldType}:`, error);
  }
}

// Set up drop zones for entity fields without using composable lifecycle hooks
function setupFieldDropZones() {
  // Create drop zones for appropriate field types
  fields.value.forEach(field => {
    if (ValueHelpers.isEntityRef(field.value) || ValueHelpers.isEntityList(field.value)) {
      // Manual implementation of drop handling
      const isEntityDrag = (event: DragEvent): boolean => {
        if (!event.dataTransfer) return false;
        // Fix: Check for the correct MIME type 
        return event.dataTransfer.types.includes('application/x-qui-entity');
      };
      
      let dragOverTimeout: number | null = null;
      
          const handleFieldDragOver = (event: DragEvent) => {
        if (isEntityDrag(event)) {
          event.preventDefault();
          
          // Clear any existing timeout to debounce the state change
          if (dragOverTimeout) {
            window.clearTimeout(dragOverTimeout);
          }
          
          // Set the state after a small delay to avoid flickering
            dragOverTimeout = window.setTimeout(() => {
            const ft = toNumericFieldType(field.fieldType);
            if (ft !== null) fieldDropTargets.value[ft] = true;
          }, 50);
          
          // Set drop effect based on field type
            if (event.dataTransfer) {
            event.dataTransfer.dropEffect = ValueHelpers.isEntityRef(field.value) ? 'link' : 'copy';
          }
        }
      };
      
  const handleFieldDragLeave = () => {
        // Clear any pending timeout
        if (dragOverTimeout) {
          window.clearTimeout(dragOverTimeout);
          dragOverTimeout = null;
        }
        
        // Delay the state update slightly to prevent flickering
        window.setTimeout(() => {
          const ft = toNumericFieldType(field.fieldType);
          if (ft !== null) fieldDropTargets.value[ft] = false;
        }, 50);
      };
      
      // Fix the field drop handler to properly handle the drop event
      const handleFieldDrop = (dropEvent: DragEvent) => {
        if (!isEntityDrag(dropEvent) || !dropEvent.dataTransfer) return;
        
        dropEvent.preventDefault();
        dropEvent.stopPropagation();
        
  // Immediately clear the drop highlight - Critical for visual feedback
  const ft2 = toNumericFieldType(field.fieldType);
  if (ft2 !== null) fieldDropTargets.value[ft2] = false;
        
        // Get the entity ID from the dataTransfer
        const entityIdStr = dropEvent.dataTransfer.getData('application/x-qui-entity');
        
        if (entityIdStr) {
          // Parse to bigint and call the handler
            try {
            const parsedId = Number(entityIdStr);
            updateFieldWithEntityId(field.fieldType, parsedId);
          } catch (e) {
            console.error('Invalid dropped entity ID:', entityIdStr, e);
          }
        }
      };
      
      // Store these in a map keyed by field type
      field._dragHandlers = {
        isEntityDrag,
        handleDragOver: handleFieldDragOver,
        handleDragLeave: handleFieldDragLeave,
        handleDrop: handleFieldDrop
      };
    }
  });
}

// Enhanced loadEntityDetails to include schema and setup drop zones
async function loadEntityDetails() {
  loading.value = true;
  error.value = null;
  fields.value = [];
  writerNames.value = {};
  loadingWriterNames.value = {};
  fieldDropTargets.value = {};
  
  try {
    // Check if props.entityId is defined before proceeding
    if (!props.entityId) {
      error.value = "No entity ID provided";
      loading.value = false;
      return;
    }

    // Extract entity type number from the entity ID
    const entityTypeNumber = extractEntityType(props.entityId);
    if (entityTypeNumber === 0) {
      error.value = 'Invalid entity type extracted from ID';
      loading.value = false;
      return;
    }
    
    // Verify if the entity exists before trying to load its schema
    const exists = await dataStore.entityExists(props.entityId);
    if (!exists) {
      error.value = `Entity ${props.entityId} does not exist`;
      loading.value = false;
      return;
    }
    
    // Store the entity type and resolve its name
    entityType.value = entityTypeNumber;
    entityTypeName.value = await dataStore.resolveEntityType(entityTypeNumber);
    if (!entityTypeName.value || entityTypeName.value.trim() === '') {
      error.value = 'Failed to resolve entity type name';
      loading.value = false;
      return;
    }
    
    // Get the complete entity schema (includes inherited fields)
    console.log('Loading schema for entity type:', entityTypeName.value);
    schema.value = await dataStore.getCompleteEntitySchema(entityTypeNumber);
    console.log('Schema loaded:', schema.value);
    
    if (!schema.value || !schema.value.fields) {
      error.value = `Failed to load schema for ${entityTypeName.value}`;
      loading.value = false;
      return;
    }
    
    // Get field types from schema
    const fieldTypes = Object.keys(schema.value.fields).map(ft => Number(ft));
    console.log('Schema field types:', fieldTypes);
    
    if (fieldTypes.length === 0) {
      error.value = "Entity schema has no fields";
      loading.value = false;
      return;
    }
    
    // Read all fields for this entity (one at a time, as read() takes a field path)
    console.log('Reading fields for entity:', props.entityId);
    const fieldData: { value: Value; timestamp: Timestamp; writerId: EntityId | null }[] = [];
    
    for (const ft of fieldTypes) {
      try {
        const [value, timestamp, writerId] = await dataStore.read(props.entityId, [ft]);
        fieldData.push({ value, timestamp, writerId });
      } catch (err) {
        console.warn(`Error reading field ${ft}:`, err);
        // Use default values for failed reads
        fieldData.push({ 
          value: ValueHelpers.string(''), 
          timestamp: Date.now(), 
          writerId: null 
        });
      }
    }
    
    console.log('Fields read successfully:', fieldData.length);
    
    // Create DisplayField objects
    fields.value = fieldTypes.map((ft, index) => ({
      fieldType: ft,
      value: fieldData[index].value,
      writeTime: fieldData[index].timestamp,
      writerId: fieldData[index].writerId
    }));
    
    // Sort fields by rank from schema
    fields.value.sort((a, b) => {
      const aField = schema.value!.fields[a.fieldType];
      const bField = schema.value!.fields[b.fieldType];
      if (!aField || !bField) return 0;
      if (aField.rank === bField.rank) {
        return a.fieldType - b.fieldType;
      }
      return aField.rank - bField.rank;
    });
    
    // Get entity name
    const NameFieldType = await dataStore.getFieldType('Name');
    const nameField = fields.value.find(f => f.fieldType === NameFieldType);
    if (nameField && ValueHelpers.isString(nameField.value)) {
      entityName.value = nameField.value.String || String(props.entityId);
    } else {
      entityName.value = String(props.entityId);
    }
    
    // Set up drop zones for entity reference and entity list fields
    setupFieldDropZones();
    
    // Load writer names and field type names after loading fields
    console.log('Loading writer names...');
    await loadWriterNames();
    console.log('Writer names loaded');
    
    console.log('Loading field type names...');
    await loadFieldTypeNames();
    console.log('Field type names loaded');
    
    // Register for notifications on all fields
    console.log('Registering field notifications...');
    await registerFieldNotifications();
    console.log('Field notifications registered');

    loading.value = false;
    console.log('Entity details loaded successfully, loading.value:', loading.value);
  } catch (err) {
    console.error(`Error in loadEntityDetails: ${err}`);
    error.value = `Error: ${err}`;
    loading.value = false;
    console.log('Error in loadEntityDetails, loading.value:', loading.value);
  }
}

async function registerFieldNotifications() {
  try {
    // Clear existing notification subscriptions first
    await cleanupNotifications();
    
    // Register notifications for each field
    for (const field of fields.value) {
      const notifyConfig: NotifyConfig = {
        EntityId: {
          entity_id: props.entityId,
          field_type: field.fieldType,
          trigger_on_change: true,
          context: []
        }
      };
      
      try {
        await dataStore.registerNotification(notifyConfig, handleFieldNotification);
      } catch (error) {
        console.warn(`Failed to register notification for field ${field.fieldType}:`, error);
      }
    }
  } catch (err) {
    console.error('Error registering field notifications:', err);
  }
}

function handleFieldNotification(notification: Notification) {
  try {
    if (!notification || !notification.current) return;
    
    // Extract field info from the notification
    const fieldPath = notification.current.field_path;
    if (!fieldPath || fieldPath.length === 0) return;
    
    const fieldType = fieldPath[0];
    
    // Find the field in our fields array
    const fieldIndex = fields.value.findIndex(f => f.fieldType === fieldType);
    if (fieldIndex === -1) return;
    
    const field = fields.value[fieldIndex];
    
    // Update the field with new data from notification
    if (notification.current.value) {
      field.value = notification.current.value;
    }
    
    if (notification.current.timestamp) {
      field.writeTime = notification.current.timestamp;
    }
    
    if (notification.current.writer_id !== undefined) {
      field.writerId = notification.current.writer_id;
      
      // Load the writer name if not already loaded
      if (field.writerId && !writerNames.value[field.writerId]) {
        loadWriterName(field.writerId);
      }
    }
    
    // If this is the Name field, update the entity name
    const NameFieldType = dataStore.getFieldType('Name').then(ft => {
      if (field.fieldType === ft && ValueHelpers.isString(field.value)) {
        entityName.value = field.value.String;
      }
    });
    
    // Force a UI update
    fields.value = [...fields.value];
  } catch (err) {
    console.error('Error handling field notification:', err);
  }
}

async function startEditing(fieldType: FieldType | string) {
  const ftNum = toNumericFieldType(fieldType);
  editingField.value = ftNum !== null ? ftNum : (typeof fieldType === 'number' ? fieldType : 0);
}

async function saveField(fieldType: FieldType | string, newValue: any) {
  try {
    const field = fields.value.find(f => {
      const a = toNumericFieldType(f.fieldType);
      const b = toNumericFieldType(fieldType);
      if (a !== null && b !== null) return a === b;
      return String(f.fieldType) === String(fieldType);
    });
    if (!field) return;
    
    // Set the new value - assuming newValue is a properly created Value object
    field.value = newValue;
    
    // Write to the database using new API
    await dataStore.write(props.entityId, [field.fieldType], newValue);
    
    // Update timestamp
    field.writeTime = Date.now();
    
    // Close editor
    editingField.value = null;
    
    // If we edited the Name field, update the display name
    const NameFieldType = await dataStore.getFieldType('Name');
    if (field.fieldType === NameFieldType && ValueHelpers.isString(newValue)) {
      entityName.value = newValue.String;
    }
  } catch (err) {
    console.error(`Error saving field ${fieldType}:`, err);
    error.value = `Failed to save field: ${err}`;
  }
}

function cancelEditing() {
  editingField.value = null;
}

// Load writer names for all fields
async function loadWriterNames() {
  // Extract unique writer IDs from all fields
  const writerIds = [...new Set(fields.value.map(f => f.writerId).filter((id): id is number => id != null))];
  
  // Load names for all writer IDs (non-null)
  await Promise.all(writerIds.map(writerId => loadWriterName(writerId)));
}

async function loadFieldTypeNames() {
  // Get unique field type identifiers (may be numeric or string)
  const fieldTypeIds = [...new Set(fields.value.map(f => f.fieldType))];

  // Resolve each field type to a human name and store keyed by numeric ID when possible
  await Promise.all(fieldTypeIds.map(async (fieldTypeId) => {
    const ftNum = toNumericFieldType(fieldTypeId);
    if (ftNum !== null) {
      try {
        const name = await dataStore.resolveFieldType(ftNum as any);
        fieldTypeNames.value[ftNum] = name;
      } catch (err) {
        console.warn(`Failed to resolve field type ${ftNum}:`, err);
        fieldTypeNames.value[ftNum] = String(ftNum);
      }
    } else {
      // Field type IDs should always be numeric at this point
      // If we somehow got here, just use the string representation
      console.warn(`Non-numeric field type ID encountered: ${fieldTypeId}`);
      fieldTypeNames.value[fieldTypeId as any] = String(fieldTypeId);
    }
  }));
}

// Extract the loading of a single writer name into a separate function
async function loadWriterName(writerId: EntityId) {
  if (!writerId || writerNames.value[writerId]) return;
  
  loadingWriterNames.value[writerId] = true;
  
  try {
    // Check if entity exists before trying to read it
    const exists = await dataStore.entityExists(writerId);
    if (!exists) {
      writerNames.value[writerId] = "Unknown User";
      loadingWriterNames.value[writerId] = false;
      return;
    }
    
    // Get Name field type and read it
    const NameFieldType = await dataStore.getFieldType('Name');
    const [nameValue] = await dataStore.read(writerId, [NameFieldType]);
    
    let writerName = String(writerId);
    if (ValueHelpers.isString(nameValue)) {
      writerName = nameValue.String || String(writerId);
    }
    writerNames.value[writerId] = writerName;
  } catch (err) {
    console.error(`Error loading writer name for ${writerId}:`, err);
    writerNames.value[writerId] = String(writerId); // Fallback to ID on error
  } finally {
    loadingWriterNames.value[writerId] = false;
  }
}

// Call loadWriterNames on component mount
onMounted(() => {
  if (fields.value.length > 0) {
    loadWriterNames();
  }
});

// Check if a field is droppable (entity reference or entity list)
function isFieldDroppable(field: DisplayField): boolean {
  return ValueHelpers.isEntityRef(field.value) || ValueHelpers.isEntityList(field.value);
}

// Helper to indicate whether a given field currently has drop highlight
function isDropTarget(field: DisplayField): boolean {
  const n = toNumericFieldType(field.fieldType);
  return n !== null ? !!fieldDropTargets.value[n] : false;
}

// Helper to get a human label for a field type (resolve via cache)
function getFieldTypeLabel(field: DisplayField): string {
  const n = toNumericFieldType(field.fieldType);
  if (n !== null && fieldTypeNames.value[n]) return fieldTypeNames.value[n];
  return String(field.fieldType);
}

// Get appropriate drop message based on field type
function getDropMessage(field: DisplayField): string {
  return ValueHelpers.isEntityRef(field.value)
    ? 'Drop to set reference' 
    : 'Drop to add to list';
}

// Process drop on a specific field - renamed to avoid naming conflict
async function updateFieldWithEntityId(fieldType: FieldType | string, entityId: EntityId) {
  try {
    console.log(`Updating field ${fieldType} with entity ${entityId}`);
    
    // Find the field in our fields array (numeric-safe)
    const field = fields.value.find(f => {
      const a = toNumericFieldType(f.fieldType);
      const b = toNumericFieldType(fieldType);
      if (a !== null && b !== null) return a === b;
      return String(f.fieldType) === String(fieldType);
    });
    if (!field) {
      console.error(`Field ${fieldType} not found`);
      return;
    }

    // Important: Immediately clear the drop target highlight 
  const ftNum = toNumericFieldType(fieldType);
  if (ftNum !== null) fieldDropTargets.value[ftNum] = false;

    // Double check the current value before changing
    console.log('Current field value before update:', field.value);
    
    try {
      const ftNum = toNumericFieldType(fieldType);
      if (ftNum === null) {
        console.error('Could not resolve field type to numeric ID');
        return;
      }
      
      // Check the field's value type to determine handling
      if (ValueHelpers.isEntityRef(field.value)) {
        // For entity reference, set the new value
        const newValue = ValueHelpers.entityRef(entityId);
        
        console.log('Writing entity reference:', { entityId: props.entityId, fieldType: ftNum, value: newValue });
        
        // Update local state first
        field.value = newValue;
        fields.value = [...fields.value]; // Force reactivity
        
        // Perform write operation
        await dataStore.write(props.entityId, [ftNum], newValue);
        console.log(`Updated reference field ${fieldType} to ${entityId}`);
      } 
      else if (ValueHelpers.isEntityList(field.value)) {
        // For entity list, append the entity to the list if not already present
        const currentList = field.value.EntityList;
        
        // Check if the entity is already in the list
        if (!currentList.includes(entityId)) {
          // Create a new list with the added entity
          const newList = [...currentList, entityId];
          const newValue = ValueHelpers.entityList(newList);
          
          console.log('Writing entity list:', { entityId: props.entityId, fieldType: ftNum, value: newValue });
          
          // Update local state first
          field.value = newValue;
          fields.value = [...fields.value]; // Force reactivity
          
          // Perform write operation
          await dataStore.write(props.entityId, [ftNum], newValue);
          console.log(`Added ${entityId} to entity list ${fieldType}`);
        } else {
          console.log(`Entity ${entityId} already exists in list ${fieldType}`);
        }
      }
    } catch (writeError) {
      console.error('Error during write operation:', writeError);
      // Provide more detailed error info
      if (writeError instanceof Error) {
        console.error(writeError.message);
        if (writeError.stack) console.error(writeError.stack);
      }
    }
  } catch (error) {
    console.error(`Error handling drop on field ${fieldType}:`, error);
    } finally {
    // Ensure drop targets are cleared in all cases
    const ftFinal = toNumericFieldType(fieldType);
    if (ftFinal !== null) fieldDropTargets.value[ftFinal] = false;
  }
}

// Add computed property for container class
const containerClass = computed(() => {
  return {
    'entity-details': true,
    'entity-details-standalone': props.standalone
  };
});
</script>

<template>
  <div :class="containerClass">
    <div class="details-header">
      <div class="header-content">
        <h2 class="entity-title">{{ entityName }}</h2>
        <div class="entity-metadata">
          <div class="entity-type">{{ entityType }}</div>
          <div class="entity-id" :title="String(entityId)">{{ String(entityId) }}</div>
        </div>
      </div>
    </div>
    
    <div v-if="loading" class="details-loading">
      <div class="spinner"></div>
      <span>Loading entity details...</span>
    </div>
    
    <div v-else-if="error" class="details-error">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
        <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
      </svg>
      <span>{{ error }}</span>
      <button @click="loadEntityDetails" class="retry-button">Retry</button>
    </div>
    
    <div v-else class="fields-container">
      <table class="fields-table">
        <thead>
          <tr>
            <th class="field-name-header">Field</th>
            <th class="field-value-header">Value</th>
            <th class="field-meta-header">Last Modified</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="field in fields" :key="String(field.fieldType)" class="field-row">
            <td class="field-name">
              {{ getFieldTypeLabel(field) }}
              <div v-if="isFieldDroppable(field)" class="droppable-indicator">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                </svg>
              </div>
            </td>
            <td class="field-value">
              <ValueEditor
                v-if="editingField === field.fieldType"
                :value="field.value"
                :field-type="field.fieldType"
                :entity-type="entityTypeName"
                @save="saveField(field.fieldType, $event)"
                @cancel="cancelEditing"
              />
              <div 
                v-else 
                class="db-value-display-container" 
                :class="{
                  'droppable': isFieldDroppable(field),
                  'drop-target': isDropTarget(field)
                }"
                @dblclick="startEditing(field.fieldType)"
                @dragover="field._dragHandlers?.handleDragOver($event)"
                @dragleave="field._dragHandlers?.handleDragLeave()"
                @drop="field._dragHandlers?.handleDrop($event)"
              >
                <ValueDisplay 
                  :value="field.value"
                  :field-type="field.fieldType"
                  :entity-type="entityTypeName"
                />
                
                <!-- Drop zone overlay for droppable fields - improved for less flickering -->
                <div v-if="isDropTarget(field)" class="field-drop-overlay">
                  <div class="field-drop-message">
                    {{ getDropMessage(field) }}
                  </div>
                </div>
                
                <button class="edit-button" @click="startEditing(field.fieldType)" title="Edit value">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                  </svg>
                </button>
              </div>
            </td>
            <td class="field-meta">
              <div class="field-timestamp" :title="toSafeISOString(field.writeTime)">
                {{ field.writeTime ? formatTimestampReactive(field.writeTime) : 'N/A' }}
              </div>
              <div class="field-writer" :title="field.writerId != null ? String(field.writerId) : 'Unknown'">
                <span class="writer-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                </span>
                <span v-if="field.writerId != null && writerNames[field.writerId]">
                  {{ writerNames[field.writerId] }}
                </span>
                <span v-else-if="field.writerId != null && loadingWriterNames[field.writerId]" class="loading-writer">
                  Loading...
                </span>
                <span v-else>
                  {{ field.writerId ? String(field.writerId) : '' }}
                </span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.entity-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--qui-bg-primary);
  border-left: 1px solid var(--qui-hover-border);
  position: relative;
  min-width: 300px; /* minimum width */
}

/* Add styling for standalone mode in window */
.entity-details-standalone {
  border-left: none;
  border-radius: var(--qui-window-radius);
  height: 100%;
}

.details-header {
  padding: 18px;
  border-bottom: 1px solid var(--qui-hover-border);
  background: linear-gradient(to right, var(--qui-bg-secondary), rgba(0, 0, 0, 0.3));
  position: relative;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  margin-bottom: 2px;
}

.header-content {
  display: flex;
  flex-direction: column;
}

.entity-title {
  margin: 0 0 10px 0;
  font-size: 20px;
  font-weight: var(--qui-font-weight-medium);
  color: var(--qui-text-primary);
  letter-spacing: 0.3px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.entity-metadata {
  display: flex;
  gap: 12px;
  align-items: center;
}

.entity-type, .entity-id {
  font-size: var(--qui-font-size-small);
  color: var(--qui-text-secondary);
  padding: 3px 8px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.2);
  letter-spacing: 0.3px;
}

.entity-type {
  background: var(--qui-accent-bg-faint);
  color: var(--qui-accent-color);
  font-weight: var(--qui-font-weight-medium);
}

.entity-id {
  font-family: monospace;
  opacity: 0.7;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
  background: var(--qui-overlay-primary);
}

.fields-container {
  flex: 1;
  overflow: auto;
  padding: 16px;
  
  /* Firefox */
  scrollbar-width: thin;
  scrollbar-color: var(--qui-scrollbar-thumb) var(--qui-scrollbar-track);
}

.fields-container::-webkit-scrollbar {
  width: 8px;
}

.fields-container::-webkit-scrollbar-track {
  background: var(--qui-scrollbar-track);
}

.fields-container::-webkit-scrollbar-thumb {
  background: var(--qui-scrollbar-thumb);
  border-radius: 4px;
}

.fields-container::-webkit-scrollbar-thumb:hover {
  background: var(--qui-scrollbar-thumb-hover);
}

.fields-table {
  width: 100%;
  border-collapse: collapse;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  overflow: hidden;
}

.fields-table th {
  text-align: left;
  padding: 12px;
  font-size: var(--qui-font-size-small);
  font-weight: var(--qui-font-weight-medium);
  color: var(--qui-text-secondary);
  border-bottom: 1px solid var(--qui-hover-border);
  background: rgba(0, 0, 0, 0.1);
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.field-name-header {
  width: 25%;
}

.field-value-header {
  width: 50%;
}

.field-meta-header {
  width: 25%;
}

.field-row {
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  transition: background 0.2s ease;
}

.field-row:hover {
  background: var(--qui-overlay-hover);
}

.field-row:last-child {
  border-bottom: none;
}

.field-name, .field-value, .field-meta {
  padding: 12px 10px;
  vertical-align: top;
}

.field-name {
  font-weight: var(--qui-font-weight-medium);
  color: var(--qui-text-primary);
  position: relative;
  letter-spacing: 0.2px;
  padding-right: 12px;
  border-right: 1px solid rgba(255, 255, 255, 0.03);
}

.field-schema-editor-type-badge {
  display: inline-block;
  font-size: 10px;
  color: var(--qui-text-secondary);
  font-weight: normal;
  margin-top: 4px;
  background: rgba(0, 0, 0, 0.2);
  padding: 2px 6px;
  border-radius: 10px;
  letter-spacing: 0.5px;
}

.field-value {
  overflow: hidden;
  color: var(--qui-text-primary);
}

.field-meta {
  font-size: var(--qui-font-size-small);
  color: var(--qui-text-secondary);
  border-left: 1px solid rgba(255, 255, 255, 0.03);
}

.field-timestamp {
  margin-bottom: 6px;
  padding: 3px 0;
  display: inline-block;
  position: relative;
}

.field-timestamp::before {
  content: "🕒 ";
  opacity: 0.7;
  font-size: 10px;
}

.field-writer {
  font-size: var(--qui-font-size-small);
  color: var(--qui-text-secondary);
  display: flex;
  align-items: center;
  gap: 6px;
}

.writer-icon {
  display: flex;
  align-items: center;
  opacity: 0.5;
}

.loading-writer {
  font-style: italic;
  opacity: 0.7;
  animation: pulse 1.5s infinite;
}

.details-loading, .details-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: var(--qui-text-secondary);
  gap: 16px;
}

.details-error svg {
  opacity: 0.6;
  color: var(--qui-danger-color);
}

.spinner {
  width: 32px;
  height: 32px;
  border: 2px solid var(--qui-accent-bg-faint);
  border-top-color: var(--qui-accent-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 12px;
}

.retry-button {
  margin-top: 12px;
  padding: 8px 16px;
  background: var(--qui-overlay-primary);
  border: 1px solid var(--qui-hover-border);
  border-radius: 20px;
  color: var(--qui-text-primary);
  cursor: pointer;
  transition: all 0.2s var(--qui-animation-bounce);
}

.retry-button:hover {
  background: var(--qui-accent-color);
  color: var(--qui-bg-primary);
  transform: translateY(-2px);
  box-shadow: 0 3px 10px var(--qui-accent-glow);
}

.db-value-display-container {
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
  padding: 2px;
  border-radius: 4px;
  transition: background 0.2s ease;
}

.db-value-display-container:hover {
  background: rgba(0, 0, 0, 0.1);
}

.db-value-display-container:hover .edit-button {
  opacity: 1;
  transform: translateX(0);
}

.edit-button {
  opacity: 0;
  background: transparent;
  border: none;
  color: var(--qui-accent-color);
  cursor: pointer;
  padding: 6px;
  border-radius: 4px;
  transition: all 0.25s var(--qui-animation-bounce);
  transform: translateX(-5px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.edit-button:hover {
  background: var(--qui-accent-bg-faint);
  transform: translateX(0) scale(1.1);
  box-shadow: 0 0 0 2px var(--qui-accent-bg-faint);
}

/* Add styles for droppable fields */
.droppable-indicator {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: 4px;
  opacity: 0.5;
  color: var(--qui-accent-color);
}

.db-value-display-container.droppable {
  position: relative;
  transition: all 0.25s ease;
  border: 1px dashed transparent;
}

.db-value-display-container.droppable:hover {
  border-color: var(--qui-accent-color);
  background: var(--qui-accent-bg-faint);
}

.db-value-display-container.drop-target {
  border-color: var(--qui-accent-color);
  background: var(--qui-accent-bg-light);
  outline: none;
  box-shadow: 0 0 0 2px var(--qui-accent-glow);
}

.field-drop-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 255, 136, 0.1);
  backdrop-filter: blur(1px);
  z-index: 10;
  animation: fade-in 0.2s ease; /* Smoother fade in */
  pointer-events: none; /* Ensure events pass through to container */
}

.field-drop-message {
  background: var(--qui-bg-primary);
  color: var(--qui-accent-color);
  padding: 4px 12px;
  border-radius: 12px;
  font-size: var(--qui-font-size-small);
  font-weight: var(--qui-font-weight-medium);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  border: 1px solid var(--qui-accent-color);
  white-space: nowrap;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes pulse {
  0% { opacity: 0.3; }
  50% { opacity: 0.7; }
  100% { opacity: 0.3; }
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes pulse-bg {
  0%, 100% { background-color: rgba(0, 255, 136, 0.1); }
  50% { background-color: rgba(0, 255, 136, 0.15); } /* Less dramatic pulsing */
}
</style>
