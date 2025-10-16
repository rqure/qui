<template>
  <!-- Only show modal overlay when not in a window -->
  <div v-if="!parentWindowId" class="modal-overlay" @click.self="close">
    <div class="modal-dialog">
      <div class="modal-header">
        <h3>Load Faceplate</h3>
        <button @click="close" class="close-button">✕</button>
      </div>

      <div class="modal-body">
        <div v-if="loading" class="loading-state">
          <div class="spinner"></div>
          <p>Loading faceplates...</p>
        </div>

        <div v-else-if="error" class="error-state">
          <p class="error-message">{{ error }}</p>
          <button @click="loadFaceplates" class="btn btn-secondary">Retry</button>
        </div>

        <div v-else>
          <div class="form-group">
            <label>Search Faceplates:</label>
            <input
              type="text"
              v-model="searchQuery"
              class="form-control search-input"
              placeholder="Type to search faceplates..."
              @input="filterFaceplates"
            />
          </div>

          <div v-if="filteredFaceplates.length > 0" class="results-section">
            <div class="results-header">
              Found {{ filteredFaceplates.length }} faceplate{{ filteredFaceplates.length === 1 ? '' : 's' }}
            </div>
            <div class="results-list">
              <div
                v-for="fp in filteredFaceplates"
                :key="fp.id"
                class="result-item"
                :class="{ selected: selectedFaceplateId === fp.id }"
                @click="selectFaceplate(fp.id)"
              >
                <div class="result-name">{{ fp.name }}</div>
                <div class="result-meta">
                  <span class="result-type">{{ fp.targetType }}</span>
                  <span class="result-shapes">{{ fp.shapeCount }} shapes</span>
                </div>
              </div>
            </div>
          </div>

          <div v-else-if="searchQuery && filteredFaceplates.length === 0" class="no-results">
            No faceplates found matching "{{ searchQuery }}"
          </div>

          <div v-if="selectedFaceplate" class="preview-section">
            <div class="preview-header">Selected Faceplate:</div>
            <div class="preview-details">
              <div class="detail-row">
                <span class="label">Name:</span>
                <span class="value">{{ selectedFaceplate.name }}</span>
              </div>
              <div class="detail-row">
                <span class="label">Target Type:</span>
                <span class="value">{{ selectedFaceplate.targetType }}</span>
              </div>
              <div class="detail-row">
                <span class="label">Shapes:</span>
                <span class="value">{{ selectedFaceplate.shapeCount }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button @click="close" class="btn btn-secondary">Cancel</button>
        <button
          @click="loadFaceplate"
          :disabled="!selectedFaceplateId || loading"
          class="btn btn-primary"
        >
          Load
        </button>
      </div>
    </div>
  </div>
  <!-- When in a window, just show the content directly without modal chrome -->
  <div v-else class="window-content">
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Loading faceplates...</p>
    </div>

    <div v-else-if="error" class="error-state">
      <p class="error-message">{{ error }}</p>
      <button @click="loadFaceplates" class="btn btn-secondary">Retry</button>
    </div>

    <div v-else>
      <div class="form-group">
        <label>Search Faceplates:</label>
        <input
          type="text"
          v-model="searchQuery"
          class="form-control search-input"
          placeholder="Type to search faceplates..."
          @input="filterFaceplates"
        />
      </div>

      <div v-if="filteredFaceplates.length > 0" class="results-section">
        <div class="results-header">
          Found {{ filteredFaceplates.length }} faceplate{{ filteredFaceplates.length === 1 ? '' : 's' }}
        </div>
        <div class="results-list">
          <div
            v-for="fp in filteredFaceplates"
            :key="fp.id"
            class="result-item"
            :class="{ selected: selectedFaceplateId === fp.id }"
            @click="selectFaceplate(fp.id)"
          >
            <div class="result-name">{{ fp.name }}</div>
            <div class="result-meta">
              <span class="result-type">{{ fp.targetType }}</span>
              <span class="result-shapes">{{ fp.shapeCount }} shapes</span>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="searchQuery && filteredFaceplates.length === 0" class="no-results">
        No faceplates found matching "{{ searchQuery }}"
      </div>

      <div v-if="selectedFaceplate" class="preview-section">
        <div class="preview-header">Selected Faceplate:</div>
        <div class="preview-details">
          <div class="detail-row">
            <span class="label">Name:</span>
            <span class="value">{{ selectedFaceplate.name }}</span>
          </div>
          <div class="detail-row">
            <span class="label">Target Type:</span>
            <span class="value">{{ selectedFaceplate.targetType }}</span>
          </div>
          <div class="detail-row">
            <span class="label">Shapes:</span>
            <span class="value">{{ selectedFaceplate.shapeCount }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="modal-footer">
      <button @click="close" class="btn btn-secondary">Cancel</button>
      <button
        @click="loadFaceplate"
        :disabled="!selectedFaceplateId || loading"
        class="btn btn-primary"
      >
        Load
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useDataStore } from '@/stores/data';
import { useWindowStore } from '@/stores/windows';
import type { EntityId } from '@/core/data/types';
import type { FaceplateConfig } from '../types';
import { ValueHelpers } from '@/core/data/types';

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'load', config: FaceplateConfig): void;
}>();

const props = defineProps<{
  parentWindowId?: string;
  windowId?: string;
}>();

const dataStore = useDataStore();
const windowStore = useWindowStore();

interface FaceplateListItem {
  id: EntityId;
  name: string;
  targetType: string;
  shapeCount: number;
  config: FaceplateConfig;
}

const faceplates = ref<FaceplateListItem[]>([]);
const selectedFaceplateId = ref<EntityId | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const searchQuery = ref('');

const selectedFaceplate = computed(() => {
  if (!selectedFaceplateId.value) return null;
  return faceplates.value.find(fp => fp.id === selectedFaceplateId.value) || null;
});

const filteredFaceplates = computed(() => {
  if (!searchQuery.value.trim()) return faceplates.value;
  const query = searchQuery.value.toLowerCase();
  return faceplates.value.filter(fp =>
    fp.name.toLowerCase().includes(query) ||
    fp.targetType.toLowerCase().includes(query)
  );
});

onMounted(() => {
  loadFaceplates();
});

async function loadFaceplates() {
  loading.value = true;
  error.value = null;

  try {
    // Find all Faceplate entities
    const faceplateType = await dataStore.getEntityType('Faceplate');
    const faceplateEntities = await dataStore.findEntities(faceplateType);

    const nameField = await dataStore.getFieldType('Name');
    const configField = await dataStore.getFieldType('Configuration');

    // Load details for each faceplate
    const items: FaceplateListItem[] = [];
    for (const id of faceplateEntities) {
      try {
        const [nameValue] = await dataStore.read(id, [nameField]);
        const [configValue] = await dataStore.read(id, [configField]);

        const name = ValueHelpers.isString(nameValue) ? nameValue.String : `Faceplate ${id}`;

        let config: FaceplateConfig | null = null;
        let shapeCount = 0;

        if (ValueHelpers.isString(configValue)) {
          try {
            config = JSON.parse(configValue.String);
            shapeCount = config?.model?.shapes?.length || 0;
          } catch {
            console.warn(`Failed to parse config for faceplate ${id}`);
          }
        }

        if (config) {
          items.push({
            id,
            name,
            targetType: config.targetEntityType || 'Unknown',
            shapeCount,
            config
          });
        }
      } catch (err) {
        console.warn(`Failed to load faceplate ${id}:`, err);
      }
    }

    faceplates.value = items.sort((a, b) => a.name.localeCompare(b.name));

    if (faceplates.value.length === 0) {
      error.value = 'No faceplates found. Create one first!';
    }
  } catch (err) {
    console.error('Failed to load faceplates:', err);
    error.value = 'Failed to load faceplates: ' + String(err);
  } finally {
    loading.value = false;
  }
}

function filterFaceplates() {
  // Filtering is handled by the computed property
}

function selectFaceplate(id: EntityId) {
  selectedFaceplateId.value = id;
}

function loadFaceplate() {
  if (selectedFaceplate.value) {
    if (props.windowId) {
      // When in a window, load and close the window
      emit('load', selectedFaceplate.value.config);
      windowStore.closeWindow(props.windowId);
    } else {
      // When in modal, just emit load event
      emit('load', selectedFaceplate.value.config);
    }
  }
}

function close() {
  if (props.windowId) {
    // When in a window, close the window
    windowStore.closeWindow(props.windowId);
  } else {
    // When in modal, emit close event
    emit('close');
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-dialog {
  width: 90%;
  max-width: 600px;
  background: var(--qui-bg-secondary);
  border: var(--qui-window-border);
  border-radius: var(--qui-window-radius);
  box-shadow: var(--qui-shadow-window);
  display: flex;
  flex-direction: column;
  max-height: 80vh;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: var(--qui-window-border);
}

.modal-header h3 {
  margin: 0;
  font-size: var(--qui-font-size-large);
  font-weight: var(--qui-font-weight-bold);
  color: var(--qui-text-primary);
}

.close-button {
  background: none;
  border: none;
  font-size: 24px;
  color: var(--qui-text-secondary);
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--qui-window-radius);
  transition: background var(--qui-interaction-speed);
}

.close-button:hover {
  background: var(--qui-overlay-hover);
}

.modal-body {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  gap: 16px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--qui-border-opacity);
  border-top-color: var(--qui-accent-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-message {
  color: var(--qui-danger-color);
  margin: 0;
  text-align: center;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: var(--qui-font-size-base);
  font-weight: var(--qui-font-weight-medium);
  color: var(--qui-text-primary);
}

.form-control {
  width: 100%;
  padding: 10px 12px;
  background: var(--qui-bg-primary);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: var(--qui-window-radius);
  color: var(--qui-text-primary);
  font-size: var(--qui-font-size-base);
  font-family: var(--qui-font-family);
  transition: border-color var(--qui-interaction-speed);
}

.form-control:focus {
  outline: none;
  border-color: var(--qui-accent-color);
  box-shadow: 0 0 0 2px rgba(0, 255, 136, 0.2);
}

.results-section {
  margin-top: 20px;
}

.results-header {
  font-size: var(--qui-font-size-small);
  font-weight: var(--qui-font-weight-medium);
  color: var(--qui-text-secondary);
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.results-list {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--qui-window-radius);
  background: var(--qui-bg-primary);
}

.result-item {
  padding: 12px 16px;
  cursor: pointer;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  transition: background var(--qui-interaction-speed);
}

.result-item:last-child {
  border-bottom: none;
}

.result-item:hover {
  background: var(--qui-overlay-hover);
}

.result-item.selected {
  background: var(--qui-overlay-primary);
  border-left: 3px solid var(--qui-accent-color);
}

.result-name {
  font-size: var(--qui-font-size-base);
  font-weight: var(--qui-font-weight-medium);
  color: var(--qui-text-primary);
  margin-bottom: 4px;
}

.result-meta {
  display: flex;
  gap: 12px;
  font-size: var(--qui-font-size-small);
  color: var(--qui-text-secondary);
}

.no-results {
  margin-top: 20px;
  padding: 20px;
  text-align: center;
  color: var(--qui-text-secondary);
  font-style: italic;
  background: var(--qui-bg-primary);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--qui-window-radius);
}

.preview-section {
  margin-top: 24px;
  padding: 16px;
  background: var(--qui-bg-primary);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--qui-window-radius);
}

.preview-header {
  font-size: var(--qui-font-size-small);
  font-weight: var(--qui-font-weight-medium);
  color: var(--qui-text-primary);
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.preview-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.detail-row .label {
  flex: 0 0 100px;
  font-size: var(--qui-font-size-small);
  color: var(--qui-text-secondary);
}

.detail-row .value {
  flex: 1;
  font-size: var(--qui-font-size-small);
  color: var(--qui-text-primary);
  font-family: monospace;
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  border-top: var(--qui-window-border);
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: var(--qui-window-radius);
  font-size: var(--qui-font-size-base);
  font-weight: var(--qui-font-weight-medium);
  cursor: pointer;
  transition: all var(--qui-interaction-speed);
  font-family: var(--qui-font-family);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--qui-accent-color);
  color: var(--qui-bg-primary);
  box-shadow: var(--qui-shadow-accent);
}

.btn-primary:hover:not(:disabled) {
  background: var(--qui-accent-secondary);
  box-shadow: var(--qui-shadow-accent-strong);
  transform: var(--qui-hover-lift);
}

.btn-secondary {
  background: var(--qui-bg-secondary);
  color: var(--qui-text-primary);
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--qui-overlay-hover);
}

.window-content {
  padding: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
}
</style>
