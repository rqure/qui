<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from 'vue';
import { useDataStore } from '@/stores/data';
import type { EntityId, Field, EntitySchema, EntityType, Notification } from '@/core/data/types';
import { EntityFactories, Utils } from '@/core/data/types';
import { formatTimestamp } from '@/apps/database-browser/utils/formatters';
import ValueDisplay from '@/apps/database-browser/components/ValueDisplay.vue';
import ValueEditor from '@/apps/database-browser/components/ValueEditor.vue';
import type { DatabaseNotification } from '@/generated/protobufs_pb';
import { useEntityDropZone } from '@/core/utils/composables';
import { ValueType, ValueFactories } from '@/core/data/types';

const props = defineProps<{
  entityId: EntityId;
  standalone?: boolean; // Add new prop for standalone mode in window
}>();

const dataStore = useDataStore();
const loading = ref(true);
const error = ref<string | null>(null);
const fields = ref<Field[]>([]);
const entityName = ref('');
const entityType = ref<EntityType>('');
const editingField = ref<string | null>(null);
const writerNames = ref<Record<EntityId, string>>({});
const loadingWriterNames = ref<Record<EntityId, boolean>>({});
const notificationSubscriptions = ref<Array<{ token: string, unsubscribe: () => Promise<boolean> }>>([]);
const refreshTimestampsTimer = ref<number | null>(null);
const currentTimestamp = ref(Date.now());
const fieldDropTargets = ref<Record<string, boolean>>({});
const schema = ref<any>(null);

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
watch(() => props.entityId, async () => {
  // Clean up previous notification subscriptions when entity changes
  await cleanupNotifications();
  await loadEntityDetails();
}, { immediate: true });

// Function to format a timestamp with reactivity to currentTimestamp
const formatTimestampReactive = (date: Date | string | number) => {
  // The currentTimestamp dependency makes this reactive
  currentTimestamp.value;
  return formatTimestamp(date);
};

async function cleanupNotifications() {
  // Unsubscribe from all active notifications
  if (notificationSubscriptions.value.length > 0) {    
    // Unsubscribe from all notifications in parallel
    await Promise.all(
      notificationSubscriptions.value.map(sub => sub.unsubscribe().catch(err => {
        console.error(`Error unsubscribing from notification ${sub.token}:`, err);
      }))
    );
    
    // Clear the subscriptions array
    notificationSubscriptions.value = [];
  }
}

// Process drop on a specific field
async function processFieldDrop(fieldType: string, entityId: EntityId) {
  try {
    // Find the field in our fields array
    const field = fields.value.find(f => f.fieldType === fieldType);
    if (!field) return;
    
    // First, clear the drop target highlight to prevent flickering
    fieldDropTargets.value[fieldType] = false;
    
    // Check the field's value type to determine handling
    if (field.value.type === ValueType.EntityReference) {
      // For entity reference, set the reference to the dropped entity
      field.value = ValueFactories.newEntityReference(entityId);
      await dataStore.write([field]);
      console.log(`Updated reference field ${fieldType} to ${entityId}`);
    } 
    else if (field.value.type === ValueType.EntityList) {
      // For entity list, append the entity to the list if not already present
      const currentList = field.value.getEntityList();
      
      // Check if the entity is already in the list
      if (!currentList.includes(entityId)) {
        // Create a new list with the added entity
        const newList = [...currentList, entityId];
        field.value = ValueFactories.newEntityList(newList);
        await dataStore.write([field]);
        console.log(`Added ${entityId} to entity list ${fieldType}`);
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
    if (field.value.type === ValueType.EntityReference || field.value.type === ValueType.EntityList) {
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
            fieldDropTargets.value[field.fieldType] = true;
          }, 50);
          
          // Set drop effect based on field type
          if (event.dataTransfer) {
            event.dataTransfer.dropEffect = field.value.type === ValueType.EntityReference ? 'link' : 'copy';
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
          fieldDropTargets.value[field.fieldType] = false;
        }, 50);
      };
      
      // Fix the field drop handler to properly handle the drop event
      const handleFieldDrop = (dropEvent: DragEvent) => {
        if (!isEntityDrag(dropEvent) || !dropEvent.dataTransfer) return;
        
        dropEvent.preventDefault();
        dropEvent.stopPropagation();
        
        // Immediately clear the drop highlight - Critical for visual feedback
        fieldDropTargets.value[field.fieldType] = false;
        
        // Get the entity ID from the dataTransfer
        const entityId = dropEvent.dataTransfer.getData('application/x-qui-entity');
        
        if (entityId) {
          // Call our handler function with the entityId
          updateFieldWithEntityId(field.fieldType, entityId);
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

    // Extract entity type from ID - Add null check to prevent 'split' of undefined error
    try {
      entityType.value = Utils.getEntityTypeFromId(props.entityId);
    } catch (err) {
      console.error(`Error extracting entity type from ID ${props.entityId}:`, err);
      entityType.value = "Unknown";
    }
    
    // Verify if the entity exists before trying to load its schema
    const exists = await dataStore.entityExists(props.entityId);
    if (!exists) {
      error.value = `Entity ${props.entityId} does not exist`;
      loading.value = false;
      return;
    }
    
    // Get the entity's schema to know what fields it has
    try {
      schema.value = await dataStore.getEntitySchema(entityType.value);
    } catch (schemaErr) {
      console.error(`Error loading schema for ${entityType.value}:`, schemaErr);
      error.value = `Failed to load schema for ${entityType.value}`;
      loading.value = false;
      return;
    }
    
    // Create entity instance
    const entity = EntityFactories.newEntity(props.entityId);
    
    // Add fields based on schema - check if schema has fields property
    if (schema.value && schema.value.fields) {
      Object.keys(schema.value.fields).forEach((field: string) => {
        entity.field(field);
      });
    } else {
      console.warn(`Schema for ${entityType.value} has no fields property`);
      // Load basic fields at minimum
      entity.field("Name");
      entity.field("Children");
      entity.field("Parent");
    }
    
    // Read basic entity info
    const eFields = Object.values(entity.fields);
    if (eFields.length === 0) {
      error.value = "Entity has no fields";
      loading.value = false;
      return;
    }
    
    await dataStore.read([...eFields]);

    // Use conditional check before sorting fields
    if (schema.value && schema.value.fields) {
      fields.value = [...eFields].sort((a, b) => {
        const aField = schema.value.fields[a.fieldType];
        const bField = schema.value.fields[b.fieldType];
        if (!aField || !bField) return 0;
        if (aField.rank === bField.rank) {
          return aField.fieldType.localeCompare(bField.fieldType);
        }
        return (aField.rank || 0) - (bField.rank || 0);
      });
    } else {
      fields.value = [...eFields];
    }
    
    // Safely get entity name
    const nameField = entity.field("Name");
    if (nameField && nameField.value) {
      try {
        entityName.value = nameField.value.getString();
      } catch (nameErr) {
        console.error("Error getting entity name:", nameErr);
        entityName.value = props.entityId;
      }
    } else {
      entityName.value = props.entityId;
    }
    
    // Set up drop zones for entity reference and entity list fields
    setupFieldDropZones();
    
    // Load writer names after loading fields
    await loadWriterNames();
    
    // Register for notifications on all fields
    await registerFieldNotifications();

    loading.value = false;
  } catch (err) {
    console.error(`Error in loadEntityDetails: ${err}`);
    error.value = `Error: ${err}`;
    loading.value = false;
  }
}

async function registerFieldNotifications() {
  try {
    // Clear existing notification subscriptions first
    await cleanupNotifications();
    
    // Register notifications for each field
    const subscriptionPromises = fields.value.map(async (field) => {
      // Set up notification config to watch this specific field
      const notificationConfig = {
        entityId: props.entityId,
        fieldType: field.fieldType
      };
      
      // Register the notification and get the subscription
      try {
        const subscription = await dataStore.notify(
          notificationConfig,
          handleFieldNotification
        );
        return subscription;
      } catch (error) {
        // Return a dummy subscription that does nothing on unsubscribe
        return {
          token: `failed-${field.fieldType}`,
          unsubscribe: async () => Promise.resolve(true)
        };
      }
    });
    
    // Wait for all notification registrations to complete
    const subscriptions = await Promise.all(subscriptionPromises);
    
    // Store subscriptions for cleanup later
    notificationSubscriptions.value = subscriptions.filter(sub => !sub.token.startsWith('failed-'));
  } catch (err) {
    console.error(`Error registering field notifications:`, err);
  }
}

function handleFieldNotification(notification: Notification) {
  try {
    if (!notification.current) return;
    
    // Find the field in our fields array
    const fieldIndex = fields.value.findIndex(f => 
      f.fieldType === notification.current?.fieldType &&
      f.entityId === props.entityId
    );
    
    if (fieldIndex === -1) return;
    
    // Update the field with the new data
    const field = fields.value[fieldIndex];
    
    // Update the value from the notification
    if (notification.current?.value) {
      field.value = notification.current?.value;
    }
    
    // Update write time if available
    if (notification.current.writeTime) {
      field.writeTime = notification.current.writeTime;
    }
    
    // Update writer ID if available and load the writer name
    if (notification.current.writerId && notification.current.writerId !== field.writerId) {
      field.writerId = notification.current.writerId;
      
      // Load the writer name for this new writer ID
      if (!writerNames.value[field.writerId]) {
        loadWriterName(field.writerId);
      }
    }
    
    // If this is the Name field, update the entity name
    if (field.fieldType === 'Name') {
      entityName.value = field.value.getString();
    }
    
    // Force a UI update by creating a new array reference
    fields.value = [...fields.value];
    
  } catch (err) {
    console.error('Error handling field notification:', err);
  }
}

async function startEditing(fieldType: string) {
  editingField.value = fieldType;
}

async function saveField(fieldType: string, newValue: any) {
  try {
    const field = fields.value.find(f => f.fieldType === fieldType);
    if (!field) return;
    
    // Set the new value - assuming newValue is a properly created Value object
    field.value = newValue;
    
    // Write to the database
    await dataStore.write([field]);
    
    // Close editor
    editingField.value = null;
    
    // If we edited the Name field, update the display name
    if (fieldType === 'Name') {
      entityName.value = field.value.getString();
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
  // Collect unique writer IDs
  const writerIds = new Set<EntityId>();
  fields.value.forEach(field => {
    if (field.writerId) {
      writerIds.add(field.writerId);
    }
  });
  
  // Load each writer's name
  writerIds.forEach(async (writerId) => {
    await loadWriterName(writerId);
  });
}

// Extract the loading of a single writer name into a separate function
async function loadWriterName(writerId: EntityId) {
  if (!writerId || writerNames.value[writerId]) return;
  
  loadingWriterNames.value[writerId] = true;
  
  try {
    const writerEntity = EntityFactories.newEntity(writerId);
    const nameField = writerEntity.field("Name");
    
    // Check if entity exists before trying to read it
    const exists = await dataStore.entityExists(writerId);
    if (!exists) {
      writerNames.value[writerId] = "Unknown User";
      loadingWriterNames.value[writerId] = false;
      return;
    }
    
    await dataStore.read([nameField]);
    
    const writerName = nameField.value.getString();
    writerNames.value[writerId] = writerName || writerId;
  } catch (err) {
    console.error(`Error loading writer name for ${writerId}:`, err);
    writerNames.value[writerId] = writerId; // Fallback to ID on error
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
function isFieldDroppable(field: Field): boolean {
  return field.value.type === ValueType.EntityReference || field.value.type === ValueType.EntityList;
}

// Get appropriate drop message based on field type
function getDropMessage(field: Field): string {
  return field.value.type === ValueType.EntityReference 
    ? 'Drop to set reference' 
    : 'Drop to add to list';
}

// Process drop on a specific field - renamed to avoid naming conflict
async function updateFieldWithEntityId(fieldType: string, entityId: EntityId) {
  try {
    console.log(`Updating field ${fieldType} with entity ${entityId}`);
    
    // Find the field in our fields array
    const field = fields.value.find(f => f.fieldType === fieldType);
    if (!field) {
      console.error(`Field ${fieldType} not found`);
      return;
    }

    // Important: Immediately clear the drop target highlight 
    fieldDropTargets.value[fieldType] = false;

    // Double check the current value before changing
    console.log('Current field value before update:', {
      type: field.value.type,
      raw: field.value.raw,
      asString: field.value.asString()
    });
    
    try {
      // Check the field's value type to determine handling
      if (field.value.type === ValueType.EntityReference) {
        // For entity reference, create a new field for writing
        const newField = EntityFactories.newField(props.entityId, fieldType, ValueFactories.newEntityReference(entityId));
        
        console.log('Prepared field for write:', {
          entityId: newField.entityId,
          fieldType: newField.fieldType,
          valueType: newField.value.type,
          pbType: newField.value.pbType(),
          valueRaw: newField.value.raw
        });
        
        // Force UI update before write request to clear visual feedback
        field.value = ValueFactories.newEntityReference(entityId);
        fields.value = [...fields.value]; // Force reactivity
        
        // Perform direct write operation with minimal processing
        const result = await dataStore.write([newField]);
        console.log('Write result:', result);
        
        console.log(`Updated reference field ${fieldType} to ${entityId}`);
      } 
      else if (field.value.type === ValueType.EntityList) {
        // For entity list, append the entity to the list if not already present
        const currentList = field.value.getEntityList();
        
        // Check if the entity is already in the list
        if (!currentList.includes(entityId)) {
          // Create a new list with the added entity
          const newList = [...currentList, entityId];
          
          // Create a new field for writing
          const newField = EntityFactories.newField(
            props.entityId, 
            fieldType, 
            ValueFactories.newEntityList(newList)
          );
          
          console.log('Prepared field for write:', {
            entityId: newField.entityId,
            fieldType: newField.fieldType,
            valueType: newField.value.type,
            pbType: newField.value.pbType(),
            valueRaw: newField.value.raw
          });
          
          // Force UI update before write request to clear visual feedback
          field.value = ValueFactories.newEntityList(newList);
          fields.value = [...fields.value]; // Force reactivity
          
          // Perform direct write operation
          const result = await dataStore.write([newField]);
          console.log('Write result:', result);
          
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
    fieldDropTargets.value[fieldType] = false;
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
          <div class="entity-id" :title="entityId">{{ entityId }}</div>
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
          <tr v-for="field in fields" :key="field.fieldType" class="field-row">
            <td class="field-name">
              {{ field.fieldType }}
              <div class="field-schema-editor-type-badge">{{ field.value.type }}</div>
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
                :entity-type="entityType"
                @save="saveField(field.fieldType, $event)"
                @cancel="cancelEditing"
              />
              <div 
                v-else 
                class="db-value-display-container" 
                :class="{
                  'droppable': isFieldDroppable(field),
                  'drop-target': fieldDropTargets[field.fieldType]
                }"
                @dblclick="startEditing(field.fieldType)"
                @dragover="field._dragHandlers?.handleDragOver($event)"
                @dragleave="field._dragHandlers?.handleDragLeave()"
                @drop="field._dragHandlers?.handleDrop($event)"
              >
                <ValueDisplay 
                  :value="field.value"
                  :field-type="field.fieldType"
                  :entity-type="entityType"
                />
                
                <!-- Drop zone overlay for droppable fields - improved for less flickering -->
                <div v-if="fieldDropTargets[field.fieldType]" class="field-drop-overlay">
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
              <div class="field-timestamp" :title="field.writeTime ? field.writeTime.toISOString() : 'Unknown'">
                {{ field.writeTime ? formatTimestampReactive(field.writeTime) : 'N/A' }}
              </div>
              <div class="field-writer" :title="field.writerId || 'Unknown'">
                <span class="writer-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                </span>
                <span v-if="writerNames[field.writerId]">
                  {{ writerNames[field.writerId] }}
                </span>
                <span v-else-if="loadingWriterNames[field.writerId]" class="loading-writer">
                  Loading...
                </span>
                <span v-else>
                  {{ field.writerId || '' }}
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
