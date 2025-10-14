<template>
  <div class="modal-overlay" @click.self="close">
    <div class="modal-dialog">
      <div class="modal-header">
        <h3>Save Faceplate</h3>
        <button @click="close" class="close-button">✕</button>
      </div>
      
      <div class="modal-body">
        <div v-if="error" class="error-banner">
          <span class="error-icon">⚠️</span>
          <span>{{ error }}</span>
        </div>
        
        <div class="form-group">
          <label>Save Mode:</label>
          <div class="radio-group">
            <label class="radio-label">
              <input type="radio" v-model="saveMode" value="new" />
              Create New Faceplate
            </label>
            <label class="radio-label">
              <input type="radio" v-model="saveMode" value="update" />
              Update Existing
            </label>
          </div>
        </div>
        
        <div v-if="saveMode === 'update'" class="form-group">
          <label>Select Faceplate:</label>
          <select v-model.number="selectedFaceplateId" class="form-control">
            <option :value="null">-- Select a faceplate --</option>
            <option v-for="fp in faceplates" :key="fp.id" :value="fp.id">
              {{ fp.name }}
            </option>
          </select>
        </div>
        
        <div v-if="saveMode === 'new'" class="form-group">
          <label>Name: *</label>
          <input 
            type="text" 
            v-model="name" 
            class="form-control" 
            placeholder="e.g., Pump Faceplate"
          />
        </div>
        
        <div v-if="saveMode === 'new'" class="form-group">
          <label>Target Entity Type: *</label>
          <select v-model="targetType" class="form-control">
            <option value="Object">Object (Generic)</option>
            <option value="Device">Device</option>
            <option value="Sensor">Sensor</option>
            <option value="Actuator">Actuator</option>
            <option value="Controller">Controller</option>
          </select>
        </div>
        
        <div class="form-group">
          <label>Description:</label>
          <textarea 
            v-model="description" 
            class="form-control" 
            rows="3"
            placeholder="Optional description..."
          ></textarea>
        </div>
        
        <div class="summary-section">
          <div class="summary-header">Configuration Summary:</div>
          <div class="summary-details">
            <div class="detail-row">
              <span class="label">Shapes:</span>
              <span class="value">{{ currentConfig.model.shapes?.length || 0 }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Canvas Size:</span>
              <span class="value">
                {{ currentConfig.model.boundary?.to?.x || 1000 }} × 
                {{ currentConfig.model.boundary?.to?.y || 600 }}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="modal-footer">
        <button @click="close" class="btn btn-secondary">Cancel</button>
        <button 
          @click="save" 
          :disabled="!canSave || saving"
          class="btn btn-primary"
        >
          {{ saving ? 'Saving...' : 'Save' }}
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

const props = defineProps<{
  currentConfig: FaceplateConfig;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'save', entityId: EntityId, name: string, targetType: string): void;
}>();

const dataStore = useDataStore();

interface FaceplateListItem {
  id: EntityId;
  name: string;
}

const saveMode = ref<'new' | 'update'>('new');
const faceplates = ref<FaceplateListItem[]>([]);
const selectedFaceplateId = ref<EntityId | null>(null);
const name = ref('');
const targetType = ref('Object');
const description = ref('');
const saving = ref(false);
const error = ref<string | null>(null);

const canSave = computed(() => {
  if (saveMode.value === 'new') {
    return name.value.trim().length > 0 && targetType.value.length > 0;
  } else {
    return selectedFaceplateId.value !== null;
  }
});

onMounted(() => {
  loadFaceplates();
});

async function loadFaceplates() {
  try {
    const faceplateType = await dataStore.getEntityType('Faceplate');
    const faceplateEntities = await dataStore.findEntities(faceplateType);
    
    const nameField = await dataStore.getFieldType('Name');
    
    const items: FaceplateListItem[] = [];
    for (const id of faceplateEntities) {
      try {
        const [nameValue] = await dataStore.read(id, [nameField]);
        const name = ValueHelpers.isString(nameValue) ? nameValue.String : `Faceplate ${id}`;
        items.push({ id, name });
      } catch (err) {
        console.warn(`Failed to load faceplate ${id}:`, err);
      }
    }
    
    faceplates.value = items.sort((a, b) => a.name.localeCompare(b.name));
  } catch (err) {
    console.error('Failed to load faceplates:', err);
  }
}

async function save() {
  error.value = null;
  saving.value = true;
  
  try {
    let entityId: EntityId;
    let entityName: string;
    
    if (saveMode.value === 'new') {
      // Create new faceplate entity
      const faceplateType = await dataStore.getEntityType('Faceplate');
      const rootId = 1; // Assuming root entity is 1
      entityId = await dataStore.createEntity(faceplateType, rootId, name.value);
      entityName = name.value;
      
      // Set target type
      const targetTypeField = await dataStore.getFieldType('TargetEntityType');
      await dataStore.write(
        entityId,
        [targetTypeField],
        { String: targetType.value },
        null,
        null,
        null,
        null
      );
    } else {
      // Update existing
      if (!selectedFaceplateId.value) {
        error.value = 'Please select a faceplate to update';
        saving.value = false;
        return;
      }
      
      entityId = selectedFaceplateId.value;
      const fp = faceplates.value.find(f => f.id === entityId);
      entityName = fp?.name || `Faceplate ${entityId}`;
    }
    
    // Write configuration
    const configField = await dataStore.getFieldType('Configuration');
    await dataStore.write(
      entityId,
      [configField],
      { String: JSON.stringify(props.currentConfig, null, 2) },
      null,
      null,
      null,
      null
    );
    
    // Write description if provided
    if (description.value.trim()) {
      const descField = await dataStore.getFieldType('Description');
      await dataStore.write(
        entityId,
        [descField],
        { String: description.value },
        null,
        null,
        null,
        null
      );
    }
    
    const finalTargetType = saveMode.value === 'new' ? targetType.value : (props.currentConfig.targetEntityType || 'Object');
    emit('save', entityId, entityName, finalTargetType);
  } catch (err) {
    console.error('Failed to save faceplate:', err);
    error.value = 'Failed to save: ' + String(err);
    saving.value = false;
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

.error-banner {
  padding: 12px 16px;
  background: rgba(244, 67, 54, 0.1);
  border: 1px solid #f44336;
  border-radius: 4px;
  color: #f44336;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.error-icon {
  font-size: 18px;
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
  font-family: inherit;
}

.form-control:focus {
  outline: none;
  border-color: var(--qui-color-primary);
}

textarea.form-control {
  resize: vertical;
  min-height: 80px;
}

.radio-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: var(--qui-color-background);
  border: 1px solid var(--qui-color-border);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.radio-label:hover {
  background: var(--qui-color-background-hover);
}

.radio-label input[type="radio"] {
  cursor: pointer;
}

.summary-section {
  margin-top: 24px;
  padding: 16px;
  background: var(--qui-color-background);
  border: 1px solid var(--qui-color-border);
  border-radius: 4px;
}

.summary-header {
  font-size: 13px;
  font-weight: 600;
  color: var(--qui-color-text);
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.summary-details {
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
