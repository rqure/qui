<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useDataStore } from '@/stores/data';
import ColumnBrowser from './components/ColumnBrowser.vue';
import EntityDetailsPanel from './components/EntityDetailsPanel.vue';
import type { Entity, EntityId } from '@/core/data/types';

const dataStore = useDataStore();
const selectedEntityId = ref<EntityId | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);

// Handle entity selection from the column browser
const handleEntitySelect = (entityId: EntityId) => {
  console.log('Entity selected:', entityId);
  selectedEntityId.value = entityId;
};

onMounted(async () => {
  try {
    // Initialize connection when app mounts
    if (!dataStore.isConnected) {
      await dataStore.initialize();
    }
    
    // Wait for connection to establish
    await waitForConnection();
    
    // Connection is established, we can show the browser
    loading.value = false;
  } catch (err) {
    console.error('Failed to initialize Database Browser:', err);
    error.value = 'Failed to connect to the database. Please try again later.';
    loading.value = false;
  }
});

onUnmounted(() => {
  // Clean up any subscriptions or resources
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
      <ColumnBrowser
        :selectedEntityId="selectedEntityId"
        @entity-select="handleEntitySelect" 
      />
      
      <EntityDetailsPanel 
        v-if="selectedEntityId && selectedEntityId !== 'root'" 
        :entityId="selectedEntityId" 
      />
      
      <div v-else class="no-selection-message">
        <div class="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24">
            <path fill="currentColor" d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"/>
          </svg>
          <p>Select an entity from the browser to view its details</p>
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

.no-selection-message {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--qui-text-secondary);
  border-left: 1px solid var(--qui-hover-border);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  opacity: 0.5;
  text-align: center;
  max-width: 250px;
}

.empty-state svg {
  opacity: 0.7;
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
