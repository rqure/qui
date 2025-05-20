<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from 'vue';
import { useDataStore } from '@/stores/data';
import type { EntityId, Field, EntitySchema, EntityType, Notification } from '@/core/data/types';
import { EntityFactories, Utils } from '@/core/data/types';
import { formatTimestamp } from '@/apps/database-browser/utils/formatters';
import ValueDisplay from '@/apps/database-browser/components/ValueDisplay.vue';
import ValueEditor from '@/apps/database-browser/components/ValueEditor.vue';
import type { DatabaseNotification } from '@/generated/protobufs_pb';

const props = defineProps<{
  entityId: EntityId;
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

// Start a timer to update the current timestamp
onMounted(() => {
  // Update timestamps every 10 seconds
  refreshTimestampsTimer.value = window.setInterval(() => {
    currentTimestamp.value = Date.now();
  }, 1000);
});

// Clean up notifications and timer when component is unmounted
onUnmounted(async () => {
  await cleanupNotifications();
  
  // Clear the refresh timestamps timer
  if (refreshTimestampsTimer.value !== null) {
    clearInterval(refreshTimestampsTimer.value);
    refreshTimestampsTimer.value = null;
  }
});

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

async function loadEntityDetails() {
  loading.value = true;
  error.value = null;
  fields.value = [];
  writerNames.value = {};
  loadingWriterNames.value = {};
  
  try {
    // Extract entity type from ID
    entityType.value = Utils.getEntityTypeFromId(props.entityId);
    
    // Create entity instance
    const entity = EntityFactories.newEntity(props.entityId);
    
    // Get the entity's schema to know what fields it has
    const schema = await dataStore.getEntitySchema(entityType.value);
    Object.keys(schema.fields).forEach((field: string) => {
      entity.field(field);
    });
    
    // Read basic entity info
    const eFields = Object.values(entity.fields);
    await dataStore.read([...eFields]);

    fields.value = [...eFields].sort((a, b) => {
      const aField = schema.fields[a.fieldType];
      const bField = schema.fields[b.fieldType];
      if (aField.rank === bField.rank) {
        return aField.fieldType.localeCompare(bField.fieldType);
      }

      return aField.rank - bField.rank;
    });
    entityName.value = entity.field("Name").value.getString();
    
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
        console.error(`Failed to register notification for ${field.fieldType}:`, error);
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
</script>

<template>
  <div class="entity-details">
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
              <div class="field-type-badge">{{ field.value.type }}</div>
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
              <div v-else class="value-display-container" @dblclick="startEditing(field.fieldType)">
                <ValueDisplay 
                  :value="field.value"
                  :field-type="field.fieldType"
                  :entity-type="entityType"
                />
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

.field-type-badge {
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

.value-display-container {
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
  padding: 2px;
  border-radius: 4px;
  transition: background 0.2s ease;
}

.value-display-container:hover {
  background: rgba(0, 0, 0, 0.1);
}

.value-display-container:hover .edit-button {
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

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes pulse {
  0% { opacity: 0.3; }
  50% { opacity: 0.7; }
  100% { opacity: 0.3; }
}
</style>
