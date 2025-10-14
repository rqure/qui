<template>
  <div class="faceplate-viewer">
    <div 
      ref="canvasContainer" 
      class="canvas-container"
      :style="{ width: '100%', height: '100%' }"
    ></div>
    
    <!-- Loading state -->
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <div class="loading-text">Loading faceplate...</div>
    </div>
    
    <!-- Error state -->
    <div v-if="error" class="error-overlay">
      <div class="error-icon">⚠️</div>
      <div class="error-text">{{ error }}</div>
      <button @click="retry" class="retry-button">Retry</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import type { EntityId } from '@/core/data/types';
import { useDataStore } from '@/stores/data';
import { FaceplateRenderer } from '../services/FaceplateRenderer';

// Props
const props = defineProps<{
  /** Entity ID of the Faceplate entity to display */
  faceplateId: EntityId;
  
  /** Entity ID of the target entity (the entity this faceplate is for) */
  targetEntityId: EntityId;
}>();

// Emits
const emit = defineEmits<{
  loaded: [];
  error: [error: string];
}>();

// State
const canvasContainer = ref<HTMLElement | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const renderer = ref<FaceplateRenderer | null>(null);

// Data store
const dataStore = useDataStore();

/**
 * Load the faceplate
 */
async function loadFaceplate() {
  if (!canvasContainer.value) {
    console.error('Canvas container not available');
    return;
  }
  
  loading.value = true;
  error.value = null;
  
  try {
    // Generate unique container ID
    const containerId = `faceplate-canvas-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    canvasContainer.value.id = containerId;
    
    // Create renderer
    renderer.value = new FaceplateRenderer({
      containerId,
      dataStore
    });
    
    // Load faceplate
    await renderer.value.loadFaceplate(props.faceplateId, props.targetEntityId);
    
    loading.value = false;
    emit('loaded');
    
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Failed to load faceplate:', err);
    error.value = errorMessage;
    loading.value = false;
    emit('error', errorMessage);
  }
}

/**
 * Retry loading after error
 */
async function retry() {
  error.value = null;
  await loadFaceplate();
}

/**
 * Clean up on unmount
 */
async function cleanup() {
  if (renderer.value) {
    await renderer.value.destroy();
    renderer.value = null;
  }
}

// Watch for prop changes and reload
watch(
  () => [props.faceplateId, props.targetEntityId],
  async () => {
    await cleanup();
    await loadFaceplate();
  }
);

// Lifecycle
onMounted(async () => {
  await loadFaceplate();
});

onBeforeUnmount(async () => {
  await cleanup();
});

// Expose renderer for parent component access
defineExpose({
  renderer,
  reload: loadFaceplate
});
</script>

<style scoped>
.faceplate-viewer {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.canvas-container {
  width: 100%;
  height: 100%;
}

.loading-overlay,
.error-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--qui-color-background-secondary);
  z-index: 1000;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid var(--qui-color-border);
  border-top-color: var(--qui-color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text,
.error-text {
  margin-top: 16px;
  font-size: 14px;
  color: var(--qui-color-text-secondary);
}

.error-icon {
  font-size: 48px;
  margin-bottom: 8px;
}

.error-text {
  color: var(--qui-color-error);
  max-width: 400px;
  text-align: center;
  padding: 0 16px;
}

.retry-button {
  margin-top: 16px;
  padding: 8px 16px;
  background: var(--qui-color-primary);
  color: var(--qui-color-text-on-primary);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.retry-button:hover {
  background: var(--qui-color-primary-hover);
}

.retry-button:active {
  background: var(--qui-color-primary-active);
}
</style>
