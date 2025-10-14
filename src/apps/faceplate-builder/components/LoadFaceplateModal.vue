<template>
  <div class="modal-overlay" @click.self="close">
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
            <label>Select Faceplate:</label>
            <select v-model.number="selectedFaceplateId" class="form-control">
              <option :value="null">-- Select a faceplate --</option>
              <option v-for="fp in faceplates" :key="fp.id" :value="fp.id">
                {{ fp.name }}
              </option>
            </select>
          </div>
          
          <div v-if="selectedFaceplate" class="preview-section">
            <div class="preview-header">Preview:</div>
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
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useDataStore } from '@/stores/data';
import type { EntityId } from '@/core/data/types';
import type { FaceplateConfig } from '../types';
import { ValueHelpers } from '@/core/data/types';

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'load', config: FaceplateConfig): void;
}>();

const dataStore = useDataStore();

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

const selectedFaceplate = computed(() => {
  if (!selectedFaceplateId.value) return null;
  return faceplates.value.find(fp => fp.id === selectedFaceplateId.value) || null;
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

function loadFaceplate() {
  if (selectedFaceplate.value) {
    emit('load', selectedFaceplate.value.config);
  }
}

function close() {
  emit('close');
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
  background: var(--qui-color-background-secondary);
  border: 1px solid var(--qui-color-border);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  max-height: 80vh;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--qui-color-border);
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--qui-color-text);
}

.close-button {
  background: none;
  border: none;
  font-size: 24px;
  color: var(--qui-color-text-secondary);
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background 0.2s;
}

.close-button:hover {
  background: var(--qui-color-background-hover);
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
  border: 4px solid var(--qui-color-border);
  border-top-color: var(--qui-color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-message {
  color: #f44336;
  margin: 0;
  text-align: center;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--qui-color-text);
}

.form-control {
  width: 100%;
  padding: 10px 12px;
  background: var(--qui-color-background);
  border: 1px solid var(--qui-color-border);
  border-radius: 4px;
  color: var(--qui-color-text);
  font-size: 14px;
}

.preview-section {
  margin-top: 24px;
  padding: 16px;
  background: var(--qui-color-background);
  border: 1px solid var(--qui-color-border);
  border-radius: 4px;
}

.preview-header {
  font-size: 13px;
  font-weight: 600;
  color: var(--qui-color-text);
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
  font-size: 13px;
  color: var(--qui-color-text-secondary);
}

.detail-row .value {
  flex: 1;
  font-size: 13px;
  color: var(--qui-color-text);
  font-family: monospace;
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid var(--qui-color-border);
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--qui-color-primary);
  color: var(--qui-color-text-on-primary);
}

.btn-primary:hover:not(:disabled) {
  background: var(--qui-color-primary-hover);
}

.btn-secondary {
  background: var(--qui-color-background);
  color: var(--qui-color-text);
  border: 1px solid var(--qui-color-border);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--qui-color-background-hover);
}
</style>
