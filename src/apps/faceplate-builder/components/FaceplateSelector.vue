<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import { useDataStore } from '@/stores/data';
import type { EntityId } from '@/core/data/types';

interface FaceplateItem {
  id: EntityId;
  name: string;
  targetType: string;
}

const props = defineProps<{
  show: boolean;
}>();

const emit = defineEmits<{
  (event: 'select', faceplateId: EntityId): void;
  (event: 'new', faceplateId: EntityId): void;
  (event: 'close'): void;
}>();

const dataStore = useDataStore();
const faceplates = ref<FaceplateItem[]>([]);
const loading = ref(false);
const searchQuery = ref('');
const newFaceplateName = ref('');
const newFaceplateType = ref('');
const showNewForm = ref(false);
const creating = ref(false);

async function loadFaceplates() {
  loading.value = true;
  try {
    const faceplateType = await dataStore.getEntityType('Faceplate');
    const ids = await dataStore.findEntities(faceplateType);
    
    const items: FaceplateItem[] = [];
    for (const id of ids) {
      const nameField = await dataStore.getFieldType('Name');
      const targetTypeField = await dataStore.getFieldType('TargetEntityType');
      
      const [nameValue] = await dataStore.read(id, [nameField]);
      const [targetTypeValue] = await dataStore.read(id, [targetTypeField]);
      
      const name = typeof nameValue === 'object' && 'String' in nameValue 
        ? nameValue.String 
        : String(nameValue);
      const targetType = typeof targetTypeValue === 'object' && 'String' in targetTypeValue 
        ? targetTypeValue.String 
        : String(targetTypeValue);
      
      items.push({ id, name, targetType });
    }
    
    faceplates.value = items.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Failed to load faceplates:', error);
  } finally {
    loading.value = false;
  }
}

const filteredFaceplates = computed(() => {
  if (!searchQuery.value.trim()) return faceplates.value;
  const query = searchQuery.value.toLowerCase();
  return faceplates.value.filter(fp => 
    fp.name.toLowerCase().includes(query) || 
    fp.targetType.toLowerCase().includes(query)
  );
});

function handleSelect(faceplateId: EntityId) {
  emit('select', faceplateId);
  emit('close');
}

function handleNewClick() {
  showNewForm.value = true;
}

async function handleCreate() {
  if (!newFaceplateName.value.trim() || !newFaceplateType.value.trim()) return;
  
  creating.value = true;
  try {
    const faceplateType = await dataStore.getEntityType('Faceplate');
    const rootId = 1 as EntityId; // QOS root
    
    // Create the faceplate entity
    const faceplateId = await dataStore.createEntity(
      faceplateType,
      rootId,
      newFaceplateName.value
    );
    
    // Set the target entity type
    const targetTypeField = await dataStore.getFieldType('TargetEntityType');
    await dataStore.write(
      faceplateId,
      [targetTypeField],
      { String: newFaceplateType.value }
    );
    
    // Initialize empty configuration
    const configField = await dataStore.getFieldType('Configuration');
    await dataStore.write(
      faceplateId,
      [configField],
      { String: JSON.stringify({ layout: [], bindings: [], metadata: {} }) }
    );
    
    console.log(`Created faceplate "${newFaceplateName.value}" for type "${newFaceplateType.value}"`);
    
    // Emit the new faceplate ID
    emit('new', faceplateId);
    
    // Reset form
    newFaceplateName.value = '';
    newFaceplateType.value = '';
    showNewForm.value = false;
  } catch (error) {
    console.error('Failed to create faceplate:', error);
  } finally {
    creating.value = false;
  }
}

function handleCancelNew() {
  showNewForm.value = false;
  newFaceplateName.value = '';
  newFaceplateType.value = '';
}

onMounted(() => {
  if (props.show) {
    loadFaceplates();
  }
});

watch(() => props.show, (newShow) => {
  if (newShow) {
    loadFaceplates();
  }
});
</script>

<template>
  <div v-if="props.show" class="faceplate-selector">
    <header class="selector__header">
      <h3>Faceplates</h3>
      <button type="button" class="selector__close" @click="emit('close')">✕</button>
    </header>
    
    <div v-if="!showNewForm" class="selector__content">
      <div class="selector__search">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search faceplates..."
          class="selector__search-input"
        />
      </div>
      
      <div v-if="loading" class="selector__loading">Loading faceplates...</div>
      
      <div v-else-if="filteredFaceplates.length === 0" class="selector__empty">
        No faceplates found
      </div>
      
      <div v-else class="selector__list">
        <button
          v-for="faceplate in filteredFaceplates"
          :key="faceplate.id"
          type="button"
          class="selector__item"
          @click="handleSelect(faceplate.id)"
        >
          <div class="selector__item-name">{{ faceplate.name }}</div>
          <div class="selector__item-type">{{ faceplate.targetType }}</div>
        </button>
      </div>
      
      <footer class="selector__footer">
        <button type="button" class="selector__action selector__action--primary" @click="handleNewClick">
          + New Faceplate
        </button>
      </footer>
    </div>
    
    <div v-else class="selector__form">
      <div class="selector__form-field">
        <label>Faceplate Name</label>
        <input v-model="newFaceplateName" type="text" placeholder="My Faceplate" />
      </div>
      
      <div class="selector__form-field">
        <label>Target Entity Type</label>
        <input v-model="newFaceplateType" type="text" placeholder="MyEntityType" />
      </div>
      
      <div class="selector__form-actions">
        <button type="button" class="selector__action" @click="handleCancelNew" :disabled="creating">
          Cancel
        </button>
        <button
          type="button"
          class="selector__action selector__action--primary"
          :disabled="!newFaceplateName.trim() || !newFaceplateType.trim() || creating"
          @click="handleCreate"
        >
          {{ creating ? 'Creating...' : 'Create' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.faceplate-selector {
  position: absolute;
  top: 60px;
  left: 24px;
  width: 360px;
  max-height: calc(100vh - 120px);
  background: rgba(2, 12, 18, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  backdrop-filter: blur(24px);
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  z-index: 1000;
}

.selector__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.selector__header h3 {
  margin: 0;
  font-size: 15px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.selector__close {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.05);
  color: inherit;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.18s ease;
}

.selector__close:hover {
  background: rgba(255, 255, 255, 0.1);
}

.selector__content {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.selector__search {
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.selector__search-input {
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(0, 0, 0, 0.35);
  color: inherit;
  font-size: 14px;
}

.selector__search-input:focus {
  outline: none;
  border-color: rgba(0, 255, 194, 0.5);
}

.selector__loading,
.selector__empty {
  padding: 32px 20px;
  text-align: center;
  font-size: 13px;
  opacity: 0.6;
}

.selector__list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  min-height: 0;
}

.selector__item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid transparent;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: all 0.18s ease;
}

.selector__item:hover {
  background: rgba(0, 255, 194, 0.12);
  border-color: rgba(0, 255, 194, 0.3);
}

.selector__item-name {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.selector__item-type {
  font-size: 12px;
  opacity: 0.65;
}

.selector__footer {
  padding: 16px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.selector__form {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.selector__form-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.selector__form-field label {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  opacity: 0.7;
}

.selector__form-field input {
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(0, 0, 0, 0.35);
  color: inherit;
  font-size: 14px;
}

.selector__form-field input:focus {
  outline: none;
  border-color: rgba(0, 255, 194, 0.5);
}

.selector__form-actions {
  display: flex;
  gap: 10px;
  margin-top: 8px;
}

.selector__action {
  flex: 1;
  padding: 10px 16px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: transparent;
  color: inherit;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  cursor: pointer;
  transition: all 0.18s ease;
}

.selector__action:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.08);
}

.selector__action:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.selector__action--primary {
  background: rgba(0, 255, 194, 0.18);
  border-color: rgba(0, 255, 194, 0.34);
}

.selector__action--primary:hover:not(:disabled) {
  background: rgba(0, 255, 194, 0.28);
}
</style>
