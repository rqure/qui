<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Binding } from '../types';

interface BindingValueEntry {
  componentId: string;
  componentName: string;
  property: string;
  value: unknown;
  expression: string;
  mode: string;
  lastUpdated?: number;
}

interface ScriptStateEntry {
  scriptName: string;
  state: Record<string, unknown>;
}

interface NotificationActivity {
  timestamp: number;
  fieldPath: string;
  value: unknown;
  componentId?: string;
}

const props = defineProps<{
  bindingValues: Record<string, unknown>;
  expressionValues: Record<string, unknown>;
  bindings: Binding[];
  scriptStates: Map<string, Record<string, unknown>>;
  notificationActivity: NotificationActivity[];
  componentMap: Map<string, any>;
}>();

const emit = defineEmits<{
  (event: 'refresh'): void;
}>();

const activeTab = ref<'bindings' | 'scripts' | 'notifications'>('bindings');
const searchQuery = ref('');
const autoRefresh = ref(false);
const refreshInterval = ref<number | null>(null);

// Format timestamp
function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// Format value for display
function formatValue(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

// Binding value entries
const bindingValueEntries = computed<BindingValueEntry[]>(() => {
  const entries: BindingValueEntry[] = [];
  
  props.bindings.forEach((binding) => {
    const component = props.componentMap.get(binding.componentId);
    const valueKey = `${binding.componentId}.${binding.property}`;
    const value = props.bindingValues[valueKey] ?? props.expressionValues[binding.expression];
    
    entries.push({
      componentId: binding.componentId,
      componentName: binding.componentName || component?.name || binding.componentId,
      property: binding.property,
      value,
      expression: binding.expression,
      mode: binding.mode || 'field',
      lastUpdated: Date.now(), // TODO: Track actual update time
    });
  });
  
  return entries;
});

// Filtered binding entries
const filteredBindings = computed(() => {
  if (!searchQuery.value) return bindingValueEntries.value;
  
  const query = searchQuery.value.toLowerCase();
  return bindingValueEntries.value.filter((entry) =>
    entry.componentName.toLowerCase().includes(query) ||
    entry.property.toLowerCase().includes(query) ||
    entry.expression.toLowerCase().includes(query)
  );
});

// Script state entries
const scriptStateEntries = computed<ScriptStateEntry[]>(() => {
  const entries: ScriptStateEntry[] = [];
  
  props.scriptStates.forEach((state, scriptName) => {
    entries.push({
      scriptName,
      state,
    });
  });
  
  return entries;
});

// Recent notifications (last 100)
const recentNotifications = computed(() => {
  return [...props.notificationActivity]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 100);
});

// Toggle auto-refresh
function toggleAutoRefresh() {
  autoRefresh.value = !autoRefresh.value;
  
  if (autoRefresh.value) {
    refreshInterval.value = window.setInterval(() => {
      emit('refresh');
    }, 1000); // Refresh every second
  } else if (refreshInterval.value !== null) {
    clearInterval(refreshInterval.value);
    refreshInterval.value = null;
  }
}

// Manual refresh
function handleRefresh() {
  emit('refresh');
}
</script>

<template>
  <div class="debug-panel">
    <header class="debug-panel__header">
      <h3>Runtime Debugger</h3>
      <div class="debug-panel__controls">
        <button
          class="debug-panel__button"
          :class="{ 'debug-panel__button--active': autoRefresh }"
          @click="toggleAutoRefresh"
          title="Toggle auto-refresh"
        >
          {{ autoRefresh ? '⏸️' : '▶️' }}
        </button>
        <button
          class="debug-panel__button"
          @click="handleRefresh"
          title="Refresh now"
        >
          🔄
        </button>
      </div>
    </header>

    <div class="debug-panel__tabs">
      <button
        class="debug-panel__tab"
        :class="{ 'debug-panel__tab--active': activeTab === 'bindings' }"
        @click="activeTab = 'bindings'"
      >
        Bindings ({{ bindingValueEntries.length }})
      </button>
      <button
        class="debug-panel__tab"
        :class="{ 'debug-panel__tab--active': activeTab === 'scripts' }"
        @click="activeTab = 'scripts'"
      >
        Scripts ({{ scriptStateEntries.length }})
      </button>
      <button
        class="debug-panel__tab"
        :class="{ 'debug-panel__tab--active': activeTab === 'notifications' }"
        @click="activeTab = 'notifications'"
      >
        Activity ({{ recentNotifications.length }})
      </button>
    </div>

    <div v-if="activeTab === 'bindings'" class="debug-panel__content">
      <div class="debug-panel__search">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search bindings..."
          class="debug-panel__search-input"
        />
      </div>
      
      <div class="debug-panel__list">
        <div
          v-for="entry in filteredBindings"
          :key="`${entry.componentId}.${entry.property}`"
          class="debug-panel__item"
        >
          <div class="debug-panel__item-header">
            <strong>{{ entry.componentName }}</strong>
            <span class="debug-panel__badge">{{ entry.property }}</span>
          </div>
          <div class="debug-panel__item-row">
            <span class="debug-panel__label">Expression:</span>
            <code class="debug-panel__code">{{ entry.expression }}</code>
          </div>
          <div class="debug-panel__item-row">
            <span class="debug-panel__label">Value:</span>
            <code class="debug-panel__value">{{ formatValue(entry.value) }}</code>
          </div>
          <div class="debug-panel__item-row">
            <span class="debug-panel__label">Mode:</span>
            <span class="debug-panel__badge debug-panel__badge--mode">{{ entry.mode }}</span>
          </div>
        </div>
        
        <div v-if="filteredBindings.length === 0" class="debug-panel__empty">
          No bindings found
        </div>
      </div>
    </div>

    <div v-if="activeTab === 'scripts'" class="debug-panel__content">
      <div class="debug-panel__list">
        <div
          v-for="entry in scriptStateEntries"
          :key="entry.scriptName"
          class="debug-panel__item"
        >
          <div class="debug-panel__item-header">
            <strong>{{ entry.scriptName }}</strong>
          </div>
          <div class="debug-panel__item-row">
            <pre class="debug-panel__pre">{{ formatValue(entry.state) }}</pre>
          </div>
        </div>
        
        <div v-if="scriptStateEntries.length === 0" class="debug-panel__empty">
          No script modules
        </div>
      </div>
    </div>

    <div v-if="activeTab === 'notifications'" class="debug-panel__content">
      <div class="debug-panel__list">
        <div
          v-for="(notification, index) in recentNotifications"
          :key="`${notification.timestamp}-${index}`"
          class="debug-panel__item debug-panel__item--notification"
        >
          <div class="debug-panel__item-row">
            <span class="debug-panel__time">{{ formatTime(notification.timestamp) }}</span>
            <code class="debug-panel__code">{{ notification.fieldPath }}</code>
          </div>
          <div class="debug-panel__item-row">
            <span class="debug-panel__label">Value:</span>
            <code class="debug-panel__value">{{ formatValue(notification.value) }}</code>
          </div>
        </div>
        
        <div v-if="recentNotifications.length === 0" class="debug-panel__empty">
          No recent notifications
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.debug-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: rgba(4, 12, 18, 0.85);
  border-left: 1px solid rgba(255, 255, 255, 0.08);
}

.debug-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.debug-panel__header h3 {
  margin: 0;
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.debug-panel__controls {
  display: flex;
  gap: 8px;
}

.debug-panel__button {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: inherit;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.debug-panel__button:hover {
  background: rgba(255, 255, 255, 0.1);
}

.debug-panel__button--active {
  background: rgba(0, 255, 194, 0.2);
  border-color: rgba(0, 255, 194, 0.4);
}

.debug-panel__tabs {
  display: flex;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.debug-panel__tab {
  flex: 1;
  padding: 10px 16px;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: rgba(255, 255, 255, 0.6);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.debug-panel__tab:hover {
  color: rgba(255, 255, 255, 0.9);
  background: rgba(255, 255, 255, 0.03);
}

.debug-panel__tab--active {
  color: rgba(0, 255, 194, 1);
  border-bottom-color: rgba(0, 255, 194, 1);
}

.debug-panel__content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.debug-panel__search {
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.debug-panel__search-input {
  width: 100%;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: inherit;
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s;
}

.debug-panel__search-input:focus {
  border-color: rgba(0, 255, 194, 0.5);
}

.debug-panel__list {
  flex: 1;
  overflow: auto;
  padding: 8px;
}

.debug-panel__item {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
}

.debug-panel__item--notification {
  background: rgba(0, 170, 255, 0.05);
  border-color: rgba(0, 170, 255, 0.15);
}

.debug-panel__item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.debug-panel__item-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-top: 6px;
  font-size: 12px;
}

.debug-panel__label {
  color: rgba(255, 255, 255, 0.5);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  min-width: 70px;
}

.debug-panel__badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  background: rgba(0, 255, 194, 0.15);
  color: rgba(0, 255, 194, 1);
}

.debug-panel__badge--mode {
  background: rgba(100, 150, 255, 0.15);
  color: rgba(100, 150, 255, 1);
}

.debug-panel__code {
  flex: 1;
  padding: 4px 8px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 11px;
  word-break: break-all;
}

.debug-panel__value {
  flex: 1;
  padding: 4px 8px;
  background: rgba(0, 255, 194, 0.08);
  border: 1px solid rgba(0, 255, 194, 0.2);
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 11px;
  color: rgba(0, 255, 194, 1);
  word-break: break-all;
}

.debug-panel__pre {
  margin: 0;
  padding: 8px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 11px;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

.debug-panel__time {
  font-family: 'Courier New', monospace;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  min-width: 80px;
}

.debug-panel__empty {
  text-align: center;
  padding: 40px 20px;
  color: rgba(255, 255, 255, 0.4);
  font-size: 13px;
}
</style>
