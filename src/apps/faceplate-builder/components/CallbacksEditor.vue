<template>
  <div class="callbacks-editor">
    <div class="panel-header">
      <h3>Callbacks</h3>
    </div>

    <div v-if="!selectedShape" class="empty-state">
      <p>No shape selected</p>
      <p class="hint">Select a shape to configure its callbacks</p>
    </div>

    <div v-else class="callbacks-content">
      <!-- Event Handlers Section -->
      <div class="callback-section">
        <div class="section-title">
          <span class="icon">🖱️</span>
          Event Handlers
        </div>
        <div class="section-description">
          Respond to user interactions like clicks, mouse events, etc.
        </div>

        <div class="handlers-list">
          <div v-for="(handler, event) in handlers" :key="event" class="handler-item">
            <div class="handler-header">
              <span class="event-name">{{ event }}</span>
              <button @click="removeHandler(event)" class="btn-remove" title="Remove handler">✕</button>
            </div>
            <textarea
              :value="handler"
              @input="updateHandler(event, ($event.target as HTMLTextAreaElement).value)"
              placeholder="function() { /* your code here */ }"
              rows="3"
              class="handler-code"
            ></textarea>
          </div>

          <div class="add-handler">
            <select v-model="newEventType" class="event-select">
              <option value="">Select event...</option>
              <option value="click">click</option>
              <option value="dblclick">dblclick</option>
              <option value="mousedown">mousedown</option>
              <option value="mouseup">mouseup</option>
              <option value="mouseover">mouseover</option>
              <option value="mouseout">mouseout</option>
              <option value="mousemove">mousemove</option>
              <option value="contextmenu">contextmenu</option>
            </select>
            <button @click="addHandler" :disabled="!newEventType" class="btn-add">
              Add Handler
            </button>
          </div>
        </div>
      </div>

      <!-- Custom Methods Section -->
      <div class="callback-section">
        <div class="section-title">
          <span class="icon">⚙️</span>
          Custom Methods
        </div>
        <div class="section-description">
          Reusable functions that can be called by other handlers or notifications.
        </div>

        <div class="methods-list">
          <div v-for="(method, name) in methods" :key="name" class="method-item">
            <div class="method-header">
              <input
                type="text"
                :value="name"
                @input="renameMethod(name, ($event.target as HTMLInputElement).value)"
                class="method-name"
                placeholder="methodName"
              />
              <button @click="removeMethod(name)" class="btn-remove" title="Remove method">✕</button>
            </div>
            <textarea
              :value="method"
              @input="updateMethod(name, ($event.target as HTMLTextAreaElement).value)"
              placeholder="function(param1, param2) { /* your code here */ }"
              rows="4"
              class="method-code"
            ></textarea>
          </div>

          <div class="add-method">
            <input
              v-model="newMethodName"
              type="text"
              placeholder="method name"
              class="method-name-input"
              @keyup.enter="addMethod"
            />
            <button @click="addMethod" :disabled="!newMethodName.trim()" class="btn-add">
              Add Method
            </button>
          </div>
        </div>
      </div>

      <!-- Context Menu Section -->
      <div class="callback-section">
        <div class="section-title">
          <span class="icon">📋</span>
          Context Menu
        </div>
        <div class="section-description">
          Right-click menu items with custom actions.
        </div>

        <div class="context-menu-list">
          <div v-for="(action, label) in contextMenu" :key="label" class="menu-item">
            <div class="menu-header">
              <input
                type="text"
                :value="label"
                @input="renameMenuItem(label, ($event.target as HTMLInputElement).value)"
                class="menu-label"
                placeholder="Menu Item Label"
              />
              <button @click="removeMenuItem(label)" class="btn-remove" title="Remove menu item">✕</button>
            </div>
            <textarea
              :value="action"
              @input="updateMenuItem(label, ($event.target as HTMLTextAreaElement).value)"
              placeholder="function() { /* your code here */ }"
              rows="3"
              class="menu-action"
            ></textarea>
          </div>

          <div class="add-menu-item">
            <input
              v-model="newMenuLabel"
              type="text"
              placeholder="menu item label"
              class="menu-label-input"
              @keyup.enter="addMenuItem"
            />
            <button @click="addMenuItem" :disabled="!newMenuLabel.trim()" class="btn-add">
              Add Menu Item
            </button>
          </div>
        </div>
      </div>

      <!-- Help Section -->
      <div class="callback-section help-section">
        <div class="section-title">
          <span class="icon">ℹ️</span>
          Callback Context
        </div>
        <div class="help-content">
          <p><strong>Available in all callbacks:</strong></p>
          <ul>
            <li><code>this</code> - Reference to the shape object</li>
            <li><code>this.context</code> - Access to Store and other shapes</li>
            <li><code>event</code> - DOM event object (for event handlers)</li>
          </ul>

          <p><strong>Store access:</strong></p>
          <pre><code>// Read from Store
const value = await this.context.read(['FieldName']);

// Write to Store
await this.context.write('FieldName', { Int: 42 });

// Access other shapes
const shapes = this.context.getShapes();
shapes[0].setFillColor('red');</code></pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { Drawable } from '@/core/canvas/shapes/base';

const props = defineProps<{
  selectedShape: Drawable | null;
  selectedIndex: number | null;
  updateTrigger: number;
}>();

const emit = defineEmits<{
  (e: 'update-callbacks', callbacks: {
    handlers?: Record<string, string>;
    methods?: Record<string, string>;
    contextMenu?: Record<string, string>;
  }): void;
}>();

// Reactive state
const handlers = ref<Record<string, string>>({});
const methods = ref<Record<string, string>>({});
const contextMenu = ref<Record<string, string>>({});
const newEventType = ref('');
const newMethodName = ref('');
const newMenuLabel = ref('');

// Load callbacks from shape when selected
watch([() => props.selectedShape, () => props.updateTrigger], () => {
  if (props.selectedShape) {
    loadCallbacksFromShape();
  } else {
    clearCallbacks();
  }
}, { immediate: true });

function loadCallbacksFromShape() {
  if (!props.selectedShape) return;

  const shape = props.selectedShape as any;

  // Load handlers
  handlers.value = shape.getHandlers?.() || {};

  // Load methods
  methods.value = shape.getMethods?.() || {};

  // Load context menu
  contextMenu.value = shape.getContextMenu?.() || {};
}

function clearCallbacks() {
  handlers.value = {};
  methods.value = {};
  methods.value = {};
  contextMenu.value = {};
}

// Event Handlers
function addHandler() {
  if (!newEventType.value) return;

  handlers.value[newEventType.value] = 'function() {\n  // Your code here\n}';
  newEventType.value = '';
  emitCallbacks();
}

function updateHandler(event: string, code: string) {
  handlers.value[event] = code;
  emitCallbacks();
}

function removeHandler(event: string) {
  delete handlers.value[event];
  emitCallbacks();
}

// Custom Methods
function addMethod() {
  if (!newMethodName.value.trim()) return;

  const name = newMethodName.value.trim();
  methods.value[name] = `function ${name}() {\n  // Your code here\n}`;
  newMethodName.value = '';
  emitCallbacks();
}

function updateMethod(name: string, code: string) {
  methods.value[name] = code;
  emitCallbacks();
}

function renameMethod(oldName: string, newName: string) {
  if (!newName.trim() || oldName === newName) return;

  const code = methods.value[oldName];
  delete methods.value[oldName];
  methods.value[newName] = code;
  emitCallbacks();
}

function removeMethod(name: string) {
  delete methods.value[name];
  emitCallbacks();
}

// Context Menu
function addMenuItem() {
  if (!newMenuLabel.value.trim()) return;

  const label = newMenuLabel.value.trim();
  contextMenu.value[label] = 'function() {\n  // Your code here\n}';
  newMenuLabel.value = '';
  emitCallbacks();
}

function updateMenuItem(label: string, code: string) {
  contextMenu.value[label] = code;
  emitCallbacks();
}

function renameMenuItem(oldLabel: string, newLabel: string) {
  if (!newLabel.trim() || oldLabel === newLabel) return;

  const code = contextMenu.value[oldLabel];
  delete contextMenu.value[oldLabel];
  contextMenu.value[newLabel] = code;
  emitCallbacks();
}

function removeMenuItem(label: string) {
  delete contextMenu.value[label];
  emitCallbacks();
}

function emitCallbacks() {
  emit('update-callbacks', {
    handlers: { ...handlers.value },
    methods: { ...methods.value },
    contextMenu: { ...contextMenu.value }
  });
}
</script>

<style scoped>
.callbacks-editor {
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

.empty-state {
  padding: 48px 24px;
  text-align: center;
  color: var(--qui-text-secondary, #aaa);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.empty-state p {
  margin: 0;
  font-size: var(--qui-font-size-base, 14px);
}

.empty-state p:first-child {
  font-size: var(--qui-font-size-large, 16px);
  font-weight: var(--qui-font-weight-medium, 500);
  color: var(--qui-text-primary, #fff);
  opacity: 0.7;
}

.hint {
  font-size: var(--qui-font-size-small, 12px);
  opacity: 0.6;
}

.callbacks-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.callback-section {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 16px;
  transition: all 0.2s ease;
}

.callback-section:hover {
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

/* Handlers */
.handlers-list,
.methods-list,
.context-menu-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.handler-item,
.method-item,
.menu-item {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 12px;
}

.handler-header,
.method-header,
.menu-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.event-name {
  font-size: var(--qui-font-size-small, 13px);
  font-weight: var(--qui-font-weight-medium, 500);
  color: var(--qui-accent-color, #00ff88);
  font-family: 'Courier New', monospace;
}

.method-name,
.menu-label {
  flex: 1;
  padding: 6px 10px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  color: var(--qui-text-primary, #fff);
  font-size: var(--qui-font-size-small, 13px);
  font-family: 'Courier New', monospace;
}

.method-name:focus,
.menu-label:focus {
  outline: none;
  border-color: var(--qui-accent-color, #00ff88);
}

.handler-code,
.method-code,
.menu-action {
  width: 100%;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  color: var(--qui-text-primary, #fff);
  font-size: var(--qui-font-size-small, 13px);
  font-family: 'Courier New', monospace;
  resize: vertical;
  min-height: 60px;
  line-height: 1.4;
}

.handler-code:focus,
.method-code:focus,
.menu-action:focus {
  outline: none;
  border-color: var(--qui-accent-color, #00ff88);
  box-shadow: 0 0 0 2px rgba(0, 255, 136, 0.2);
}

/* Add sections */
.add-handler,
.add-method,
.add-menu-item {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 12px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px dashed rgba(255, 255, 255, 0.2);
  border-radius: 6px;
}

.event-select {
  flex: 1;
  padding: 8px 12px;
  background: var(--qui-bg-primary, #1a1a1a);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  color: var(--qui-text-primary, #fff);
  font-size: var(--qui-font-size-small, 13px);
}

.event-select:focus {
  outline: none;
  border-color: var(--qui-accent-color, #00ff88);
}

.method-name-input,
.menu-label-input {
  flex: 1;
  padding: 8px 12px;
  background: var(--qui-bg-primary, #1a1a1a);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  color: var(--qui-text-primary, #fff);
  font-size: var(--qui-font-size-small, 13px);
}

.method-name-input:focus,
.menu-label-input:focus {
  outline: none;
  border-color: var(--qui-accent-color, #00ff88);
}

.btn-add {
  padding: 8px 16px;
  background: var(--qui-accent-color, #00ff88);
  color: var(--qui-bg-primary, #000);
  border: none;
  border-radius: 4px;
  font-size: var(--qui-font-size-small, 13px);
  font-weight: var(--qui-font-weight-medium, 500);
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-add:hover:not(:disabled) {
  background: color-mix(in srgb, var(--qui-accent-color, #00ff88) 110%, white);
  transform: translateY(-1px);
}

.btn-add:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.btn-remove {
  padding: 4px 8px;
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