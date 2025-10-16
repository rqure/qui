<template>
  <div class="notifications-panel">
    <div class="panel-header">
      <h3>Notifications</h3>
    </div>

    <div class="notifications-content">
      <!-- Notification Channels List -->
      <div class="channels-section">
        <div class="section-title">
          <span class="icon">📡</span>
          Notification Channels
        </div>
        <div class="section-description">
          Listen to Store changes and execute callbacks when fields are updated.
        </div>

        <div class="channels-list">
          <div v-for="(channel, index) in notificationChannels" :key="index" class="channel-item">
            <div class="channel-header">
              <span class="channel-name">{{ channel.name || `Channel ${index + 1}` }}</span>
              <button @click="removeChannel(index)" class="btn-remove" title="Remove channel">✕</button>
            </div>

            <!-- NotifyConfig Editor -->
            <div class="config-section">
              <div class="config-row">
                <label>Notification Type:</label>
                <select :value="channel.type" @change="changeNotificationType(index, ($event.target as HTMLSelectElement).value)">
                  <option value="EntityId">Specific Entity</option>
                  <option value="EntityType">Entity Type</option>
                </select>
              </div>

              <div v-if="channel.type === 'EntityId'" class="config-row">
                <label>Entity ID:</label>
                <input
                  type="number"
                  v-model.number="channel.entityId"
                  placeholder="123"
                  class="entity-input"
                />
              </div>

              <div v-if="channel.type === 'EntityType'" class="config-row">
                <label>Entity Type:</label>
                <input
                  type="text"
                  v-model="channel.entityType"
                  placeholder="Object"
                  class="entity-input"
                />
              </div>

              <div class="config-row">
                <label>Field Name:</label>
                <input
                  type="text"
                  v-model="channel.fieldName"
                  placeholder="FieldName"
                  class="field-input"
                />
              </div>

              <div class="config-row">
                <label>
                  <input
                    type="checkbox"
                    v-model="channel.triggerOnChange"
                  />
                  Trigger on change only
                </label>
              </div>

              <!-- Context Fields -->
              <div class="context-section">
                <label>Context Fields (optional):</label>
                <div class="context-fields">
                  <div v-for="(contextField, ctxIndex) in channel.contextFields" :key="ctxIndex" class="context-field">
                    <input
                      type="text"
                      v-model="channel.contextFields[ctxIndex]"
                      placeholder="FieldName or Parent->Child"
                      class="context-input"
                    />
                    <button @click="removeContextField(index, ctxIndex)" class="btn-remove-small">✕</button>
                  </div>
                  <button @click="addContextField(index)" class="btn-add-small">
                    + Add Context Field
                  </button>
                </div>
              </div>
            </div>

            <!-- Callback Editor -->
            <div class="callback-section">
              <label>Callback Function:</label>
              <textarea
                v-model="channel.callback"
                placeholder="function(notification) {
  // notification.current.value - current field value
  // notification.previous.value - previous field value
  // notification.context - context field values
  const value = notification.current.value.Int;
  console.log('Field changed to:', value);
}"
                rows="8"
                class="callback-code"
              ></textarea>
            </div>
          </div>

          <div class="add-channel">
            <button @click="addChannel" class="btn-add">
              <span class="icon">➕</span>
              Add Notification Channel
            </button>
          </div>
        </div>
      </div>

      <!-- Help Section -->
      <div class="help-section">
        <div class="section-title">
          <span class="icon">ℹ️</span>
          Notification Structure
        </div>
        <div class="help-content">
          <p><strong>Notification object structure:</strong></p>
          <pre><code>{
  current: {
    value: { Int: 42 },     // Current field value
    timestamp: 1234567890,  // Timestamp
    writerId: 123           // Entity ID of writer
  },
  previous: {               // May be undefined
    value: { Int: 41 },
    timestamp: 1234567880,
    writerId: 123
  },
  context: {                // Context field values
    "FieldName": {
      value: { String: "hello" },
      timestamp: 1234567890,
      writerId: 123
    },
    "Parent->Name": {
      value: { String: "Parent Name" },
      timestamp: 1234567890,
      writerId: 456
    }
  }
}</code></pre>

          <p><strong>Available in callback:</strong></p>
          <ul>
            <li><code>this</code> - FaceplateContext (access to Store and shapes)</li>
            <li><code>notification</code> - The notification object above</li>
          </ul>

          <p><strong>Example callback:</strong></p>
          <pre><code>function(notification) {
  const value = notification.current.value.Int;
  const parentName = notification.context['Parent->Name']?.value.String;

  // Update a shape based on the value
  const shapes = this.getShapes();
  const circle = shapes[0];
  circle.setFillColor(value > 100 ? 'red' : 'green');

  // Log with context
  console.log(`${parentName}: Value changed to ${value}`);
}</code></pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { FaceplateConfig, UINotificationChannel } from '../types';

const props = defineProps<{
  faceplateConfig: FaceplateConfig;
}>();

const emit = defineEmits<{
  (e: 'update-notifications', channels: UINotificationChannel[]): void;
}>();

// Reactive state
const notificationChannels = ref<UINotificationChannel[]>([]);

// Load channels from config
watch(() => props.faceplateConfig, () => {
  notificationChannels.value = props.faceplateConfig.notificationChannels?.map(convertToUIChannel) || [];
}, { immediate: true, deep: true });

// Watch for changes and emit updates
watch(notificationChannels, (newChannels) => {
  emit('update-notifications', [...newChannels]);
}, { deep: true });

// Conversion functions
function convertToUIChannel(channel: any): UINotificationChannel {
  const config = channel.config;
  return {
    name: channel.name || 'Channel',
    type: config.EntityId ? 'EntityId' : 'EntityType',
    entityId: config.EntityId?.entity_id,
    entityType: config.EntityType?.entity_type,
    fieldName: config.EntityId?.field_type || config.EntityType?.field_type || '',
    triggerOnChange: config.EntityId?.trigger_on_change ?? config.EntityType?.trigger_on_change ?? true,
    contextFields: (config.EntityId?.context || config.EntityType?.context || []).map((path: any[]) => path.join('->')),
    callback: channel.callback || ''
  };
}

function addChannel() {
  const newChannel: UINotificationChannel = {
    name: `Channel ${notificationChannels.value.length + 1}`,
    type: 'EntityId',
    entityId: 0,
    fieldName: '',
    triggerOnChange: true,
    contextFields: [],
    callback: `function(notification) {
  // notification.current.value - current field value
  // notification.previous.value - previous field value
  // notification.context - context field values

  const value = notification.current.value.Int;
  console.log('Field changed to:', value);

  // Update shapes here
  // const shapes = this.getShapes();
  // shapes[0].setFillColor(value > 100 ? 'red' : 'green');
}`
  };

  notificationChannels.value.push(newChannel);
}

function removeChannel(index: number) {
  notificationChannels.value.splice(index, 1);
}

function changeNotificationType(index: number, type: string) {
  const channel = notificationChannels.value[index];
  channel.type = type as 'EntityId' | 'EntityType';
  
  if (type === 'EntityId') {
    channel.entityId = 0;
    channel.entityType = undefined;
  } else {
    channel.entityType = '';
    channel.entityId = undefined;
  }
}

function updateFieldType(index: number, fieldType: string) {
  notificationChannels.value[index].fieldName = fieldType;
}

function updateTriggerOnChange(index: number, triggerOnChange: boolean) {
  notificationChannels.value[index].triggerOnChange = triggerOnChange;
}

function addContextField(channelIndex: number) {
  notificationChannels.value[channelIndex].contextFields.push('');
}

function updateContextField(channelIndex: number, contextIndex: number, value: string) {
  notificationChannels.value[channelIndex].contextFields[contextIndex] = value;
}

function removeContextField(channelIndex: number, contextIndex: number) {
  notificationChannels.value[channelIndex].contextFields.splice(contextIndex, 1);
}
</script>

<style scoped>
.notifications-panel {
  padding: 20px;
  height: 100%;
}

.panel-header {
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 2px solid var(--qui-accent-color, #00ff88);
}

.panel-header h3 {
  margin: 0;
  font-size: var(--qui-font-size-large, 16px);
  font-weight: var(--qui-font-weight-bold, 600);
  color: var(--qui-text-primary, #fff);
  letter-spacing: -0.01em;
}

.notifications-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.channels-section,
.help-section {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 16px;
  transition: all 0.2s ease;
}

.channels-section:hover {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.12);
}

.section-title {
  font-size: var(--qui-font-size-small, 12px);
  font-weight: var(--qui-font-weight-bold, 600);
  color: var(--qui-accent-color, #00ff88);
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  display: flex;
  align-items: center;
  gap: 8px;
}

.icon {
  font-size: 14px;
}

.section-description {
  font-size: var(--qui-font-size-small, 13px);
  color: var(--qui-text-secondary, #aaa);
  margin-bottom: 16px;
  line-height: 1.4;
}

.channels-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.channel-item {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 16px;
}

.channel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.channel-name {
  font-size: var(--qui-font-size-base, 14px);
  font-weight: var(--qui-font-weight-medium, 500);
  color: var(--qui-accent-color, #00ff88);
}

.config-section {
  margin-bottom: 16px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 6px;
}

.config-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.config-row:last-child {
  margin-bottom: 0;
}

.config-row label {
  flex: 0 0 120px;
  font-size: var(--qui-font-size-small, 13px);
  color: var(--qui-text-secondary, #aaa);
  font-weight: var(--qui-font-weight-medium, 500);
}

.config-row select,
.config-row input[type="number"],
.config-row input[type="text"] {
  flex: 1;
  padding: 6px 10px;
  background: var(--qui-bg-primary, #1a1a1a);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  color: var(--qui-text-primary, #fff);
  font-size: var(--qui-font-size-small, 13px);
}

.config-row select:focus,
.config-row input:focus {
  outline: none;
  border-color: var(--qui-accent-color, #00ff88);
  box-shadow: 0 0 0 2px rgba(0, 255, 136, 0.2);
}

.entity-input {
  max-width: 120px;
}

.field-input {
  max-width: 200px;
}

.config-row input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: var(--qui-accent-color, #00ff88);
}

.context-section {
  margin-top: 16px;
}

.context-section label {
  display: block;
  margin-bottom: 8px;
  font-size: var(--qui-font-size-small, 13px);
  color: var(--qui-text-secondary, #aaa);
  font-weight: var(--qui-font-weight-medium, 500);
}

.context-fields {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.context-field {
  display: flex;
  gap: 8px;
  align-items: center;
}

.context-input {
  flex: 1;
  padding: 6px 10px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  color: var(--qui-text-primary, #fff);
  font-size: var(--qui-font-size-small, 13px);
}

.context-input:focus {
  outline: none;
  border-color: var(--qui-accent-color, #00ff88);
}

.callback-section {
  padding: 12px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 6px;
}

.callback-section label {
  display: block;
  margin-bottom: 8px;
  font-size: var(--qui-font-size-small, 13px);
  color: var(--qui-text-secondary, #aaa);
  font-weight: var(--qui-font-weight-medium, 500);
}

.callback-code {
  width: 100%;
  padding: 10px 12px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  color: var(--qui-text-primary, #fff);
  font-size: var(--qui-font-size-small, 13px);
  font-family: 'Courier New', monospace;
  resize: vertical;
  min-height: 120px;
  line-height: 1.4;
}

.callback-code:focus {
  outline: none;
  border-color: var(--qui-accent-color, #00ff88);
  box-shadow: 0 0 0 2px rgba(0, 255, 136, 0.2);
}

.add-channel {
  padding: 16px;
  text-align: center;
}

.btn-add {
  padding: 10px 20px;
  background: var(--qui-accent-color, #00ff88);
  color: var(--qui-bg-primary, #000);
  border: none;
  border-radius: 6px;
  font-size: var(--qui-font-size-base, 14px);
  font-weight: var(--qui-font-weight-medium, 500);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.15s ease;
}

.btn-add:hover {
  background: color-mix(in srgb, var(--qui-accent-color, #00ff88) 110%, white);
  transform: translateY(-1px);
}

.btn-add-small {
  padding: 4px 8px;
  background: rgba(0, 255, 136, 0.2);
  color: var(--qui-accent-color, #00ff88);
  border: 1px solid rgba(0, 255, 136, 0.3);
  border-radius: 4px;
  font-size: var(--qui-font-size-small, 12px);
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-add-small:hover {
  background: rgba(0, 255, 136, 0.3);
  transform: translateY(-1px);
}

.btn-remove {
  padding: 6px 10px;
  background: rgba(211, 47, 47, 0.8);
  color: white;
  border: none;
  border-radius: 4px;
  font-size: var(--qui-font-size-small, 12px);
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-remove:hover {
  background: #d32f2f;
  transform: translateY(-1px);
}

.btn-remove-small {
  padding: 2px 6px;
  background: rgba(211, 47, 47, 0.6);
  color: white;
  border: none;
  border-radius: 3px;
  font-size: 10px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-remove-small:hover {
  background: rgba(211, 47, 47, 0.8);
}

/* Help section */
.help-section {
  background: rgba(0, 255, 136, 0.05);
  border-color: rgba(0, 255, 136, 0.2);
}

.help-content {
  font-size: var(--qui-font-size-small, 13px);
  color: var(--qui-text-secondary, #aaa);
  line-height: 1.5;
}

.help-content p {
  margin: 12px 0 8px 0;
  font-weight: var(--qui-font-weight-medium, 500);
  color: var(--qui-text-primary, #fff);
}

.help-content ul {
  margin: 8px 0;
  padding-left: 20px;
}

.help-content li {
  margin: 4px 0;
}

.help-content code {
  background: rgba(0, 0, 0, 0.3);
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: var(--qui-accent-color, #00ff88);
}

.help-content pre {
  background: rgba(0, 0, 0, 0.3);
  padding: 12px;
  border-radius: 4px;
  margin: 8px 0;
  overflow-x: auto;
}

.help-content pre code {
  background: transparent;
  padding: 0;
  font-size: 11px;
  line-height: 1.4;
}
</style>