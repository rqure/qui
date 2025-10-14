<template>
  <div class="faceplate-viewer-app">
    <!-- Top toolbar -->
    <div class="toolbar">
      <div class="toolbar-section">
        <h2 class="app-title">Faceplate Viewer</h2>
      </div>
      
      <div class="toolbar-section toolbar-controls">
        <!-- Faceplate selector -->
        <div class="selector">
          <label for="faceplate-select">Faceplate:</label>
          <select 
            id="faceplate-select" 
            v-model.number="selectedFaceplateId"
            @change="onFaceplateChanged"
            class="select-input"
          >
            <option :value="null">-- Select Faceplate --</option>
            <option 
              v-for="faceplate in faceplates" 
              :key="faceplate.id"
              :value="faceplate.id"
            >
              {{ faceplate.name }} ({{ faceplate.targetType }})
            </option>
          </select>
        </div>
        
        <!-- Target entity selector -->
        <div class="selector">
          <label for="entity-select">Target Entity:</label>
          <select 
            id="entity-select" 
            v-model.number="selectedTargetId"
            @change="onTargetChanged"
            class="select-input"
            :disabled="selectedFaceplateId === null"
          >
            <option :value="null">-- Select Entity --</option>
            <option 
              v-for="entity in targetEntities" 
              :key="entity.id"
              :value="entity.id"
            >
              {{ entity.name }}
            </option>
          </select>
        </div>
        
        <!-- Actions -->
        <button 
          @click="loadFaceplate" 
          :disabled="!canLoad"
          class="btn btn-primary"
        >
          <span class="icon">▶</span> Load
        </button>
        
        <button 
          @click="refreshLists" 
          class="btn btn-secondary"
          title="Refresh lists"
        >
          <span class="icon">⟳</span>
        </button>
      </div>
    </div>
    
    <!-- Main content area -->
    <div class="content">
      <!-- Empty state -->
      <div v-if="!isLoaded" class="empty-state">
        <div class="empty-icon">📊</div>
        <h3>No Faceplate Loaded</h3>
        <p>Select a faceplate and target entity above, then click Load to display.</p>
      </div>
      
      <!-- Faceplate viewer -->
      <FaceplateViewer
        v-else
        :faceplate-id="selectedFaceplateId!"
        :target-entity-id="selectedTargetId!"
        @loaded="onLoaded"
        @error="onError"
      />
      
      <!-- Error overlay -->
      <div v-if="error" class="error-banner">
        <span class="error-icon">⚠️</span>
        <span class="error-message">{{ error }}</span>
        <button @click="error = null" class="error-close">×</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type { EntityId } from '@/core/data/types';
import { ValueHelpers } from '@/core/data/types';
import { useDataStore } from '@/stores/data';
import FaceplateViewer from './components/FaceplateViewer.vue';

// Data store
const dataStore = useDataStore();

// State
const faceplates = ref<Array<{ id: EntityId; name: string; targetType: string }>>([]);
const targetEntities = ref<Array<{ id: EntityId; name: string }>>([]);
const selectedFaceplateId = ref<EntityId | null>(null);
const selectedTargetId = ref<EntityId | null>(null);
const isLoaded = ref(false);
const error = ref<string | null>(null);

// Computed
const canLoad = computed(() => selectedFaceplateId.value !== null && selectedTargetId.value !== null);

// Load faceplates list
async function loadFaceplates() {
  try {
    // Get Faceplate entity type
    const faceplateType = await dataStore.getEntityType('Faceplate');
    if (!faceplateType) {
      console.warn('Faceplate entity type not found');
      return;
    }
    
    // Find all Faceplate entities
    const entities = await dataStore.findEntities(faceplateType, null);
    
    // Get Name and TargetEntityType fields for each
    const nameFieldType = await dataStore.getFieldType('Name');
    const targetFieldType = await dataStore.getFieldType('TargetEntityType');
    
    if (!nameFieldType || !targetFieldType) {
      console.warn('Required field types not found');
      return;
    }
    
    // Load details for each faceplate
    const loadedFaceplates: Array<{ id: EntityId; name: string; targetType: string }> = [];
    
    for (const entityId of entities) {
      try {
        const [nameValue] = await dataStore.read(entityId, [nameFieldType]);
        const [targetValue] = await dataStore.read(entityId, [targetFieldType]);
        
        loadedFaceplates.push({
          id: entityId,
          name: (nameValue && ValueHelpers.isString(nameValue)) ? nameValue.String : `Faceplate ${entityId}`,
          targetType: (targetValue && ValueHelpers.isString(targetValue)) ? targetValue.String : 'Unknown'
        });
      } catch (err) {
        console.warn('Failed to load faceplate details:', entityId, err);
      }
    }
    
    faceplates.value = loadedFaceplates;
    console.log('Loaded faceplates:', loadedFaceplates.length);
    
  } catch (err) {
    console.error('Failed to load faceplates:', err);
    error.value = 'Failed to load faceplates list';
  }
}

// Load target entities for selected faceplate
async function loadTargetEntities(targetTypeName: string) {
  try {
    // Get entity type
    const entityType = await dataStore.getEntityType(targetTypeName);
    if (!entityType) {
      console.warn('Target entity type not found:', targetTypeName);
      targetEntities.value = [];
      return;
    }
    
    // Find all entities of this type
    const entities = await dataStore.findEntities(entityType, null);
    
    // Get Name field for each
    const nameFieldType = await dataStore.getFieldType('Name');
    if (!nameFieldType) {
      console.warn('Name field type not found');
      return;
    }
    
    // Load details for each entity
    const loaded: Array<{ id: EntityId; name: string }> = [];
    
    for (const entityId of entities) {
      try {
        const [nameValue] = await dataStore.read(entityId, [nameFieldType]);
        
        loaded.push({
          id: entityId,
          name: (nameValue && ValueHelpers.isString(nameValue)) ? nameValue.String : `Entity ${entityId}`
        });
      } catch (err) {
        console.warn('Failed to load entity details:', entityId, err);
      }
    }
    
    targetEntities.value = loaded;
    console.log('Loaded target entities:', loaded.length);
    
  } catch (err) {
    console.error('Failed to load target entities:', err);
    error.value = 'Failed to load target entities';
  }
}

// Event handlers
async function onFaceplateChanged() {
  // Reset target selection
  selectedTargetId.value = null;
  targetEntities.value = [];
  isLoaded.value = false;
  
  if (selectedFaceplateId.value === null) return;
  
  // Find selected faceplate
  const faceplate = faceplates.value.find(
    f => f.id === selectedFaceplateId.value
  );
  
  if (faceplate && faceplate.targetType) {
    await loadTargetEntities(faceplate.targetType);
  }
}

function onTargetChanged() {
  isLoaded.value = false;
}

function loadFaceplate() {
  if (!canLoad.value) return;
  error.value = null;
  isLoaded.value = true;
}

function onLoaded() {
  console.log('Faceplate loaded successfully');
}

function onError(errorMsg: string) {
  error.value = errorMsg;
  isLoaded.value = false;
}

async function refreshLists() {
  selectedFaceplateId.value = null;
  selectedTargetId.value = null;
  targetEntities.value = [];
  isLoaded.value = false;
  error.value = null;
  await loadFaceplates();
}

// Lifecycle
onMounted(async () => {
  await loadFaceplates();
});
</script>

<style scoped>
.faceplate-viewer-app {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--qui-color-background);
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--qui-color-background-secondary);
  border-bottom: 1px solid var(--qui-color-border);
  gap: 16px;
  flex-shrink: 0;
}

.toolbar-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toolbar-controls {
  flex: 1;
  justify-content: flex-end;
}

.app-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--qui-color-text);
}

.selector {
  display: flex;
  align-items: center;
  gap: 8px;
}

.selector label {
  font-size: 14px;
  color: var(--qui-color-text-secondary);
  white-space: nowrap;
}

.select-input {
  padding: 6px 12px;
  background: var(--qui-color-background);
  border: 1px solid var(--qui-color-border);
  border-radius: 4px;
  color: var(--qui-color-text);
  font-size: 14px;
  min-width: 200px;
  cursor: pointer;
}

.select-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.select-input:focus {
  outline: none;
  border-color: var(--qui-color-primary);
}

.btn {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
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

.icon {
  font-size: 16px;
}

.content {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--qui-color-text-secondary);
  padding: 32px;
  text-align: center;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  color: var(--qui-color-text);
}

.empty-state p {
  margin: 0;
  font-size: 14px;
  max-width: 400px;
}

.error-banner {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--qui-color-error);
  color: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  max-width: 600px;
  z-index: 1000;
}

.error-icon {
  font-size: 20px;
}

.error-message {
  flex: 1;
  font-size: 14px;
}

.error-close {
  background: none;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.8;
  transition: opacity 0.2s;
}

.error-close:hover {
  opacity: 1;
}
</style>
