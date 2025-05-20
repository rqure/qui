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
  
  window.addEventListener('entity:navigate', handleEntityNavigation);
  
  // Clean up on unmount
  onUnmounted(() => {
    window.removeEventListener('entity:navigate', handleEntityNavigation);
  });
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

// Handle entity navigation event from entities (like from dragging/clicking references)
function handleEntityNavigation(event: Event) {
  const customEvent = event as CustomEvent;
  if (customEvent.detail?.entityId) {
    navigateToEntity(customEvent.detail.entityId);
  }
}

// Navigate to a specific entity
async function navigateToEntity(entityId: EntityId) {
  if (!entityId) return;
  
  try {
    // Check if entity exists
    const exists = await dataStore.entityExists(entityId);
    if (!exists) {
      console.warn(`Entity ${entityId} does not exist`);
      return;
    }
    
    // Update selected ID - this will trigger the browser to navigate
    selectedEntityId.value = entityId;
  } catch (error) {
    console.error('Error navigating to entity:', error);
  }
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
        <span class="retry-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
            <path fill="currentColor" d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
          </svg>
        </span>
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
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24">
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
  box-shadow: var(--qui-shadow-window);
}

.browser-container {
  display: flex;
  flex: 1;
  overflow: hidden;
  position: relative;
  background: linear-gradient(to right bottom, rgba(0,0,0,0.05), rgba(0,0,0,0.2));
}

.column-browser-wrapper {
  position: relative;
  overflow: hidden;
  height: 100%;
  min-width: 300px;
  flex-shrink: 0;
  flex-grow: 0;
  border-right: 1px solid var(--qui-hover-border);
  box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
  z-index: 2;
}

.main-split-resizer {
  position: absolute;
  width: 8px;
  height: 100%;
  cursor: col-resize;
  z-index: 100;
  transform: translateX(-4px);
  transition: background-color 0.2s var(--qui-animation-bounce);
}

.main-split-resizer:hover {
  background: rgba(0, 255, 136, 0.2);
}

.main-split-resizer:active {
  background: rgba(0, 255, 136, 0.3);
  box-shadow: 0 0 10px rgba(0, 255, 136, 0.2);
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
  background: linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.2));
}

.error-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  color: var(--qui-danger-color);
  margin-bottom: 24px;
  text-align: center;
  max-width: 300px;
}

.error-message svg {
  width: 48px;
  height: 48px;
  opacity: 0.8;
  filter: drop-shadow(0 0 8px rgba(244, 67, 54, 0.3));
}

.retry-button {
  padding: 10px 18px;
  background: var(--qui-overlay-primary);
  border: 1px solid var(--qui-hover-border);
  border-radius: 20px;
  color: var(--qui-text-primary);
  cursor: pointer;
  transition: all 0.2s var(--qui-animation-bounce);
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: var(--qui-font-weight-medium);
}

.retry-button:hover {
  background: var(--qui-accent-color);
  color: var(--qui-bg-primary);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 255, 136, 0.2);
}

.retry-button:active {
  transform: translateY(0);
}

.retry-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.no-selection-message {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--qui-text-secondary);
  border-left: 1px solid var(--qui-hover-border);
  background: var(--qui-bg-primary);
  background-image: radial-gradient(circle at 50% 50%, rgba(0,255,136,0.03) 0%, rgba(0,0,0,0) 70%);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  opacity: 0.6;
  text-align: center;
  max-width: 300px;
  transform: translateY(-20px);
  transition: all 0.3s var(--qui-animation-bounce);
}

.empty-state svg {
  opacity: 0.7;
  filter: drop-shadow(0 0 10px rgba(0,255,136,0.1));
  transition: all 0.3s var(--qui-animation-bounce);
}

.empty-state:hover {
  opacity: 0.8;
  transform: translateY(-25px);
}

.empty-state:hover svg {
  transform: scale(1.05);
  opacity: 0.9;
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
