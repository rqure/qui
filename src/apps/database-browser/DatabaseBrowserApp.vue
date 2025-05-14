<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useDataStore } from '@/stores/data';
import ColumnBrowser from './components/ColumnBrowser.vue';
import EntityDetailsPanel from './components/EntityDetailsPanel.vue';
import LoadingIndicator from './components/LoadingIndicator.vue';
import type { Entity, EntityId } from '@/core/data/types';

const dataStore = useDataStore();
const selectedEntityId = ref<EntityId | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const browserWidth = ref<number>(500); // Set a default width
const isResizingMainSplit = ref(false);
const resizeStartX = ref(0);
const resizeStartWidth = ref(0);
const minBrowserWidth = 300;
const maxBrowserWidth = window.innerWidth * 0.75;

// Handle entity selection from the column browser
const handleEntitySelect = (entityId: EntityId) => {
  selectedEntityId.value = entityId;
};

// Add handlers for main split resizing
function startMainSplitResize(event: MouseEvent) {
  event.preventDefault();
  isResizingMainSplit.value = true;
  resizeStartX.value = event.clientX;
  resizeStartWidth.value = browserWidth.value;
  
  // Add event listeners for dragging
  window.addEventListener('mousemove', handleMainSplitMove);
  window.addEventListener('mouseup', endMainSplitResize);
  
  // Add a class to body to change cursor during resize
  document.body.classList.add('resizing-horizontal');
}

function handleMainSplitMove(event: MouseEvent) {
  if (!isResizingMainSplit.value) return;
  
  const delta = event.clientX - resizeStartX.value;
  const newWidth = Math.max(minBrowserWidth, Math.min(maxBrowserWidth, resizeStartWidth.value + delta));
  
  browserWidth.value = newWidth;
  
  // Update the resizer position directly
  const resizer = document.querySelector('.main-split-resizer') as HTMLElement;
  if (resizer) {
    resizer.style.left = `${newWidth}px`;
  }
}

function endMainSplitResize() {
  isResizingMainSplit.value = false;
  window.removeEventListener('mousemove', handleMainSplitMove);
  window.removeEventListener('mouseup', endMainSplitResize);
  document.body.classList.remove('resizing-horizontal');
}

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
  // Clean up event listeners on unmount
  window.removeEventListener('mousemove', handleMainSplitMove);
  window.removeEventListener('mouseup', endMainSplitResize);
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
    <div v-if="loading" class="loading-container">
      <LoadingIndicator />
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
      <div class="column-browser-wrapper" :style="`width: ${browserWidth}px`">
        <ColumnBrowser
          :selectedEntityId="selectedEntityId"
          @entity-select="handleEntitySelect" 
        />
      </div>
      
      <div 
        class="main-split-resizer" 
        @mousedown="startMainSplitResize"
        :style="`left: ${browserWidth}px`"
      ></div>
      
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

.browser-container {
  display: flex;
  flex: 1;
  overflow: hidden;
  position: relative;
}

.column-browser-wrapper {
  position: relative;
  overflow: hidden;
  height: 100%;
  min-width: 300px;
  flex-shrink: 0;
  flex-grow: 0;
  border-right: 1px solid var(--qui-hover-border);
}

.main-split-resizer {
  position: absolute;
  width: 8px;
  height: 100%;
  cursor: col-resize;
  z-index: 100;
  transition: background-color 0.2s ease;
  transform: translateX(-4px); /* Center on the border */
}

.main-split-resizer:hover, 
.main-split-resizer:active {
  background: rgba(0, 255, 136, 0.2);
}

/* During active resize, remove transitions to avoid lag */
body.resizing-horizontal .main-split-resizer {
  transition: none;
  background: rgba(0, 255, 136, 0.3);
}

.loading-container, .error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: var(--qui-text-secondary);
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
  background: var(--qui-bg-primary);
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

/* Add global styles for when resizing is happening */
:global(body.resizing-horizontal) {
  cursor: col-resize !important;
  user-select: none;
}

:global(body.resizing-horizontal *) {
  cursor: col-resize !important;
}
</style>
