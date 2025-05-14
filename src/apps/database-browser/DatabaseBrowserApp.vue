<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useDataStore } from '@/stores/data';
import type { EntityId } from '@/core/data/types';

const dataStore = useDataStore();
const rootEntityId = ref<EntityId>('root');
const selectedEntityId = ref<EntityId | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);

// Handle entity selection
const handleEntitySelect = (entityId: EntityId) => {
  selectedEntityId.value = entityId;
};

onMounted(async () => {
  try {
    // Initialize connection when app mounts
    if (!dataStore.isConnected) {
      dataStore.initialize();
    }
    
    // Wait for connection to establish
    await waitForConnection();
    loading.value = false;
  } catch (err) {
    console.error('Failed to initialize Database Browser:', err);
    error.value = 'Failed to connect to the database. Please try again later.';
    loading.value = false;
  }
});

// Utility to wait for connection
function waitForConnection(timeout = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (dataStore.isConnected) {
      resolve();
      return;
    }
    
    const start = Date.now();
    const interval = setInterval(() => {
      if (dataStore.isConnected) {
        clearInterval(interval);
        resolve();
      } else if (Date.now() - start > timeout) {
        clearInterval(interval);
        reject(new Error('Connection timeout'));
      }
    }, 100);
  });
}
</script>

<template>
  <div class="database-browser">
    <div class="toolbar">
      <div class="app-title">Database Browser</div>
      <div class="toolbar-actions">
        <button class="toolbar-button refresh" @click="loading = true; dataStore.initialize()">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
            <path fill="currentColor" d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-8 3.58-8 8s3.58 8 8 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
          </svg>
          <span>Refresh</span>
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading-container">
      <div class="spinner"></div>
      <div class="loading-text">Loading</div>
    </div>
    
    <div v-else-if="error" class="error-container">
      <div class="error-message">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
          <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
        </svg>
        <span>{{ error }}</span>
      </div>
      <button class="retry-button" @click="loading = true; dataStore.initialize(); error = null">
        Retry Connection
      </button>
    </div>
    
    <div v-else class="browser-container">
      <div class="column-browser">
        <!-- Placeholder for column browser -->
        <div class="entity-column">
          <div class="column-header">
            <div class="search-container">
              <input type="text" placeholder="Search entities..." class="search-input" />
              <span class="search-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                </svg>
              </span>
            </div>
          </div>
          
          <div class="entity-list">
            <div 
              v-for="i in 5" 
              :key="i"
              class="entity-item"
              :class="{ 'selected': i === 1 }"
              @click="handleEntitySelect(`entity-${i}`)"
            >
              <span class="entity-name">Entity {{ i }}</span>
              <span v-if="i % 2 === 0" class="child-indicator">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
                </svg>
              </span>
            </div>
          </div>
        </div>
        
        <!-- Demo second column -->
        <div class="entity-column">
          <div class="column-header">
            <div class="search-container">
              <input type="text" placeholder="Search entities..." class="search-input" />
            </div>
          </div>
          
          <div class="entity-list">
            <div 
              v-for="i in 3" 
              :key="i"
              class="entity-item"
              :class="{ 'selected': i === 2 }"
            >
              <span class="entity-name">Child {{ i }}</span>
              <span v-if="i === 2" class="child-indicator">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
                </svg>
              </span>
            </div>
          </div>
        </div>
        
        <!-- Demo third column -->
        <div class="entity-column">
          <div class="column-header">
            <div class="search-container">
              <input type="text" placeholder="Search entities..." class="search-input" />
            </div>
          </div>
          
          <div class="entity-list">
            <div 
              class="entity-item selected"
            >
              <span class="entity-name">Selected Entity</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="entity-details">
        <div class="details-header">
          <h2 class="entity-title">Entity Details</h2>
          <div class="entity-type">Type: GenericEntity</div>
          <div class="entity-id">ID: entity-1-child-2</div>
        </div>
        
        <div class="fields-container">
          <table class="fields-table">
            <thead>
              <tr>
                <th class="field-name-header">Field</th>
                <th class="field-value-header">Value</th>
                <th class="field-meta-header">Last Modified</th>
              </tr>
            </thead>
            <tbody>
              <tr class="field-row">
                <td class="field-name">
                  Name
                  <span class="field-type">String</span>
                </td>
                <td class="field-value">
                  <div class="value-display">Selected Entity</div>
                </td>
                <td class="field-meta">
                  <div class="field-timestamp">Just now</div>
                  <div class="field-writer">system</div>
                </td>
              </tr>
              <tr class="field-row">
                <td class="field-name">
                  Description
                  <span class="field-type">String</span>
                </td>
                <td class="field-value">
                  <div class="value-display">This is a sample entity description for testing purposes.</div>
                </td>
                <td class="field-meta">
                  <div class="field-timestamp">Just now</div>
                  <div class="field-writer">system</div>
                </td>
              </tr>
              <tr class="field-row">
                <td class="field-name">
                  IsActive
                  <span class="field-type">Bool</span>
                </td>
                <td class="field-value">
                  <div class="value-display bool-true">
                    <span class="bool-indicator">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                      </svg>
                    </span>
                    True
                  </div>
                </td>
                <td class="field-meta">
                  <div class="field-timestamp">Just now</div>
                  <div class="field-writer">system</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.database-browser {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--qui-bg-secondary);
  color: var(--qui-text-primary);
  border-radius: var(--qui-window-radius);
  overflow: hidden;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: var(--qui-gradient-primary);
  border-bottom: 1px solid var(--qui-hover-border);
  height: 42px;
}

.app-title {
  font-size: var(--qui-font-size-base);
  font-weight: var(--qui-font-weight-medium);
  color: var(--qui-text-primary);
}

.toolbar-actions {
  display: flex;
  gap: 8px;
}

.toolbar-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background: var(--qui-overlay-primary);
  border: 1px solid var(--qui-hover-border);
  border-radius: 4px;
  color: var(--qui-text-primary);
  font-size: var(--qui-font-size-small);
  cursor: pointer;
  transition: all 0.2s var(--qui-animation-bounce);
}

.toolbar-button:hover {
  background: var(--qui-overlay-secondary);
  transform: translateY(-1px);
}

.toolbar-button:active {
  transform: translateY(1px);
}

.browser-container {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.loading-container, .error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: var(--qui-text-secondary);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid transparent;
  border-top-color: var(--qui-accent-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

.loading-text {
  font-size: var(--qui-font-size-base);
  animation: pulse 1.5s infinite;
}

.error-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: var(--qui-danger-color);
  margin-bottom: 20px;
}

.error-message svg {
  width: 48px;
  height: 48px;
}

.retry-button {
  padding: 8px 16px;
  background: var(--qui-overlay-primary);
  border: 1px solid var(--qui-hover-border);
  border-radius: 4px;
  color: var(--qui-text-primary);
  cursor: pointer;
  transition: all 0.2s var(--qui-animation-bounce);
}

.retry-button:hover {
  background: var(--qui-accent-color);
  color: var(--qui-bg-primary);
}

/* Column Browser Styles */
.column-browser {
  display: flex;
  flex: 1;
  overflow-x: auto;
  overflow-y: hidden;
  height: 100%;
  background: var(--qui-bg-secondary);
  scrollbar-width: thin;
  scrollbar-color: var(--qui-scrollbar-thumb) var(--qui-scrollbar-track);
}

.column-browser::-webkit-scrollbar {
  height: 8px;
}

.column-browser::-webkit-scrollbar-track {
  background: var(--qui-scrollbar-track);
}

.column-browser::-webkit-scrollbar-thumb {
  background: var(--qui-scrollbar-thumb);
  border-radius: 4px;
}

.column-browser::-webkit-scrollbar-thumb:hover {
  background: var(--qui-scrollbar-thumb-hover);
}

.entity-column {
  min-width: 240px;
  width: 240px;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  border-right: 1px solid var(--qui-hover-border);
  background: var(--qui-bg-secondary);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  scrollbar-width: thin;
  scrollbar-color: var(--qui-scrollbar-thumb) var(--qui-scrollbar-track);
}

.entity-column::-webkit-scrollbar {
  width: 6px;
}

.entity-column::-webkit-scrollbar-track {
  background: var(--qui-scrollbar-track);
}

.entity-column::-webkit-scrollbar-thumb {
  background: var(--qui-scrollbar-thumb);
  border-radius: 3px;
}

.entity-column::-webkit-scrollbar-thumb:hover {
  background: var(--qui-scrollbar-thumb-hover);
}

.column-header {
  padding: 8px;
  border-bottom: 1px solid var(--qui-hover-border);
  position: sticky;
  top: 0;
  background: var(--qui-bg-secondary);
  z-index: 5;
}

.search-container {
  position: relative;
  display: flex;
  align-items: center;
}

.search-input {
  width: 100%;
  padding: 6px 28px 6px 10px;
  border-radius: 4px;
  border: 1px solid var(--qui-hover-border);
  background: var(--qui-bg-primary);
  color: var(--qui-text-primary);
  font-size: var(--qui-font-size-small);
}

.search-icon {
  position: absolute;
  right: 8px;
  color: var(--qui-text-secondary);
  opacity: 0.6;
}

.entity-list {
  flex: 1;
  padding: 4px 0;
}

.entity-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  border-radius: 4px;
  margin: 1px 4px;
  transition: all 0.15s var(--qui-animation-bounce);
  justify-content: space-between;
}

.entity-item:hover {
  background: var(--qui-overlay-hover);
}

.entity-item.selected {
  background: var(--qui-overlay-active);
  box-shadow: 0 0 0 1px var(--qui-accent-color);
  color: var(--qui-accent-color);
}

.entity-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.child-indicator {
  margin-left: 8px;
  opacity: 0.6;
  transform: translateX(0);
  transition: transform 0.2s var(--qui-animation-bounce);
}

.entity-item:hover .child-indicator {
  opacity: 1;
  transform: translateX(2px);
}

.entity-item.selected .child-indicator {
  color: var(--qui-accent-color);
}

/* Entity Details Styles */
.entity-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--qui-bg-primary);
  border-left: 1px solid var(--qui-hover-border);
}

.details-header {
  padding: 16px;
  border-bottom: 1px solid var(--qui-hover-border);
  background: var(--qui-gradient-primary);
}

.entity-title {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: var(--qui-font-weight-medium);
  color: var(--qui-text-primary);
}

.entity-type, .entity-id {
  font-size: var(--qui-font-size-small);
  color: var(--qui-text-secondary);
  margin-bottom: 4px;
}

.entity-id {
  font-family: monospace;
  opacity: 0.7;
}

.fields-container {
  flex: 1;
  overflow: auto;
  padding: 16px;
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
}

.fields-table th {
  text-align: left;
  padding: 8px;
  font-size: var(--qui-font-size-small);
  font-weight: var(--qui-font-weight-medium);
  color: var(--qui-text-secondary);
  border-bottom: 1px solid var(--qui-hover-border);
}

.field-name-header { width: 25%; }
.field-value-header { width: 50%; }
.field-meta-header { width: 25%; }

.field-row {
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.field-row:hover {
  background: var(--qui-overlay-hover);
}

.field-name, .field-value, .field-meta {
  padding: 10px 8px;
  vertical-align: top;
}

.field-name {
  font-weight: var(--qui-font-weight-medium);
  color: var(--qui-text-primary);
  position: relative;
}

.field-type {
  display: block;
  font-size: 10px;
  color: var(--qui-text-secondary);
  font-weight: normal;
  margin-top: 2px;
}

.field-value {
  overflow: hidden;
  color: var(--qui-text-primary);
}

.field-meta {
  font-size: var(--qui-font-size-small);
  color: var(--qui-text-secondary);
}

.field-timestamp {
  margin-bottom: 2px;
}

.field-writer {
  font-style: italic;
  opacity: 0.7;
}

/* Value display */
.value-display {
  font-family: var(--qui-font-family);
  font-size: var(--qui-font-size-base);
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 0;
}

.bool-indicator {
  display: flex;
  align-items: center;
}

.bool-true {
  color: #4CAF50;
}

.bool-false {
  color: #F44336;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes pulse {
  0% { opacity: 0.6; }
  50% { opacity: 1; }
  100% { opacity: 0.6; }
}
</style>
