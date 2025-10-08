<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useDataStore } from '@/stores/data';
import { FaceplateDataService } from '../utils/faceplate-data';
import type { EntityId } from '@/core/data/types';

interface FaceplateItem {
  id: EntityId;
  name: string;
  targetEntityType: string;
  path: string;
}

const props = defineProps<{
  mode: 'load' | 'associate';
  currentEntityId?: EntityId | null;
}>();

const emit = defineEmits<{
  (event: 'select', faceplateId: EntityId): void;
  (event: 'cancel'): void;
  (event: 'create'): void;
}>();

const dataStore = useDataStore();
const service = new FaceplateDataService(dataStore);

const faceplates = ref<FaceplateItem[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const searchQuery = ref('');
const selectedId = ref<EntityId | null>(null);

const filteredFaceplates = ref<FaceplateItem[]>([]);

onMounted(async () => {
  await loadFaceplates();
});

async function loadFaceplates() {
  loading.value = true;
  error.value = null;
  
  try {
    // Get the Faceplate entity type
    let faceplateEntityType: number;
    try {
      faceplateEntityType = await dataStore.getEntityType('Faceplate');
    } catch (err) {
      error.value = 'Faceplate entity type not found. Please ensure the backend schema is configured correctly.';
      loading.value = false;
      return;
    }
    
    // Find all entities of type Faceplate
    const results = await dataStore.findEntities(faceplateEntityType, null);
    
    // Load details for each faceplate
    const items: FaceplateItem[] = [];
    for (const entityId of results) {
      try {
        const faceplate = await service.readFaceplate(entityId);
        const path = await getEntityPath(entityId);
        items.push({
          id: entityId,
          name: faceplate.name,
          targetEntityType: faceplate.targetEntityType,
          path,
        });
      } catch (err) {
        console.warn(`Failed to load faceplate ${entityId}`, err);
      }
    }
    
    faceplates.value = items;
    filteredFaceplates.value = items;
  } catch (err) {
    console.error('Failed to load faceplates:', err);
    error.value = err instanceof Error ? err.message : String(err);
  } finally {
    loading.value = false;
  }
}

async function getEntityPath(entityId: EntityId): Promise<string> {
  try {
    const nameFieldType = await dataStore.getFieldType('Name');
    const parentFieldType = await dataStore.getFieldType('Parent');
    
    const parts: string[] = [];
    let currentId: EntityId | null = entityId;
    let depth = 0;
    const maxDepth = 10;
    
    while (currentId && depth < maxDepth) {
      const [nameValue] = await dataStore.read(currentId, [nameFieldType]);
      let name = `Entity ${currentId}`;
      if (nameValue && 'String' in nameValue) {
        name = nameValue.String || name;
      }
      parts.unshift(name);
      
      const [parentValue] = await dataStore.read(currentId, [parentFieldType]);
      if (parentValue && 'EntityReference' in parentValue) {
        currentId = parentValue.EntityReference ?? null;
      } else {
        currentId = null;
      }
      depth++;
    }
    
    return parts.join(' / ');
  } catch (err) {
    console.warn(`Failed to get path for entity ${entityId}`, err);
    return `Entity ${entityId}`;
  }
}

function filterFaceplates() {
  const query = searchQuery.value.toLowerCase();
  if (!query) {
    filteredFaceplates.value = faceplates.value;
    return;
  }
  
  filteredFaceplates.value = faceplates.value.filter(
    (fp) =>
      fp.name.toLowerCase().includes(query) ||
      fp.targetEntityType.toLowerCase().includes(query) ||
      fp.path.toLowerCase().includes(query)
  );
}

function handleSelect(faceplate: FaceplateItem) {
  selectedId.value = faceplate.id;
}

function handleConfirm() {
  if (selectedId.value !== null) {
    emit('select', selectedId.value);
  }
}

function handleCreateNew() {
  emit('create');
}

</script>

<template>
  <div class="faceplate-picker">
    <div class="faceplate-picker__overlay" @click="emit('cancel')"></div>
    <div class="faceplate-picker__dialog">
      <header class="faceplate-picker__header">
        <h2>{{ props.mode === 'load' ? 'Load Faceplate' : 'Associate Faceplate' }}</h2>
        <button type="button" class="faceplate-picker__close" @click="emit('cancel')">×</button>
      </header>

      <div class="faceplate-picker__search">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search faceplates..."
          @input="filterFaceplates"
        />
      </div>

      <div v-if="loading" class="faceplate-picker__loading">Loading faceplates...</div>
      <div v-else-if="error" class="faceplate-picker__error">{{ error }}</div>
      <div v-else-if="!filteredFaceplates.length" class="faceplate-picker__empty">
        No faceplates found. Create one to get started.
      </div>
      <div v-else class="faceplate-picker__list">
        <div
          v-for="faceplate in filteredFaceplates"
          :key="faceplate.id"
          class="faceplate-picker__item"
          :class="{ 'faceplate-picker__item--selected': selectedId === faceplate.id }"
          @click="handleSelect(faceplate)"
          @dblclick="handleConfirm"
        >
          <div class="faceplate-picker__item-name">{{ faceplate.name }}</div>
          <div class="faceplate-picker__item-type">{{ faceplate.targetEntityType }}</div>
          <div class="faceplate-picker__item-path">{{ faceplate.path }}</div>
        </div>
      </div>

      <footer class="faceplate-picker__footer">
        <button type="button" class="faceplate-picker__button" @click="handleCreateNew">
          Create New
        </button>
        <div class="faceplate-picker__footer-spacer"></div>
        <button type="button" class="faceplate-picker__button" @click="emit('cancel')">
          Cancel
        </button>
        <button
          type="button"
          class="faceplate-picker__button faceplate-picker__button--primary"
          :disabled="selectedId === null"
          @click="handleConfirm"
        >
          {{ props.mode === 'load' ? 'Load' : 'Associate' }}
        </button>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.faceplate-picker {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.faceplate-picker__overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
}

.faceplate-picker__dialog {
  position: relative;
  width: 600px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  background: rgba(8, 16, 24, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  overflow: hidden;
}

.faceplate-picker__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.faceplate-picker__header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 0.05em;
}

.faceplate-picker__close {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 6px;
  font-size: 24px;
  color: inherit;
  cursor: pointer;
  transition: background 0.2s;
}

.faceplate-picker__close:hover {
  background: rgba(255, 255, 255, 0.08);
}

.faceplate-picker__search {
  padding: 16px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.faceplate-picker__search input {
  width: 100%;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: inherit;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.faceplate-picker__search input:focus {
  border-color: rgba(0, 255, 194, 0.4);
}

.faceplate-picker__loading,
.faceplate-picker__error,
.faceplate-picker__empty {
  padding: 48px 24px;
  text-align: center;
  color: rgba(255, 255, 255, 0.6);
}

.faceplate-picker__error {
  color: rgba(255, 100, 100, 0.9);
}

.faceplate-picker__list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.faceplate-picker__item {
  padding: 12px 16px;
  margin-bottom: 4px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.faceplate-picker__item:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.12);
}

.faceplate-picker__item--selected {
  background: rgba(0, 255, 194, 0.12);
  border-color: rgba(0, 255, 194, 0.3);
}

.faceplate-picker__item-name {
  font-size: 15px;
  font-weight: 500;
  margin-bottom: 4px;
}

.faceplate-picker__item-type {
  font-size: 12px;
  color: rgba(0, 255, 194, 0.7);
  margin-bottom: 4px;
}

.faceplate-picker__item-path {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
}

.faceplate-picker__footer {
  display: flex;
  gap: 10px;
  padding: 16px 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.faceplate-picker__footer-spacer {
  flex: 1;
}

.faceplate-picker__button {
  padding: 10px 20px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  color: inherit;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.faceplate-picker__button:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-1px);
}

.faceplate-picker__button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.faceplate-picker__button--primary {
  background: rgba(0, 255, 194, 0.18);
  border-color: rgba(0, 255, 194, 0.34);
}

.faceplate-picker__button--primary:hover:not(:disabled) {
  background: rgba(0, 255, 194, 0.25);
}
</style>
