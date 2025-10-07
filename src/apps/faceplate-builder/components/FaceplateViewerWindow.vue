<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import type { EntityId } from '@/core/data/types';
import { useDataStore } from '@/stores/data';
import { FaceplateDataService } from '@/apps/faceplate-builder/utils/faceplate-data';
import FaceplateRuntime from './FaceplateRuntime.vue';

const props = defineProps<{
  faceplateId: EntityId;
  entityId: EntityId | null;
}>();

const dataStore = useDataStore();
const service = new FaceplateDataService(dataStore);

const boundEntityId = ref<EntityId | null>(props.entityId ?? null);
const faceplateName = ref<string>('Faceplate');
const entityName = ref<string>('');
const runtimeRef = ref<InstanceType<typeof FaceplateRuntime> | null>(null);
const error = ref<string | null>(null);

watch(
  () => props.entityId,
  (newId) => {
    boundEntityId.value = newId ?? null;
    if (newId) {
      void loadEntityName(newId);
    }
  },
);

async function loadFaceplateMeta() {
  try {
    const record = await service.readFaceplate(props.faceplateId);
    faceplateName.value = record.name;
  } catch (err) {
    console.warn('Failed to load faceplate metadata', err);
    faceplateName.value = `Faceplate ${props.faceplateId}`;
  }
}

async function loadEntityName(entityId: EntityId) {
  try {
    const name = await service.readString(entityId, 'Name', `Entity ${entityId}`);
    entityName.value = name;
  } catch (err) {
    console.warn('Failed to read entity name', err);
    entityName.value = `Entity ${entityId}`;
  }
}

function handleEntityInput(event: Event) {
  const target = event.target as HTMLInputElement;
  const value = target.value.trim();
  if (!value) {
    boundEntityId.value = null;
    entityName.value = '';
    return;
  }
  const parsed = Number(value);
  if (!Number.isNaN(parsed)) {
    boundEntityId.value = parsed as EntityId;
    void loadEntityName(parsed as EntityId);
  }
}

async function refreshRuntime() {
  if (runtimeRef.value) {
    await runtimeRef.value.refresh();
  }
}

onMounted(async () => {
  await loadFaceplateMeta();
  if (boundEntityId.value) {
    await loadEntityName(boundEntityId.value);
  }
});
</script>

<template>
  <div class="faceplate-viewer-window">
    <header class="viewer-header">
      <div class="title">
        <strong>{{ faceplateName }}</strong>
        <span v-if="entityName">{{ entityName }}</span>
      </div>
      <div class="controls">
        <label>
          Bound Entity
          <input
            class="entity-input"
            type="number"
            :value="boundEntityId ?? ''"
            placeholder="Entity ID"
            @change="handleEntityInput"
          />
        </label>
        <button class="refresh-button" type="button" @click="refreshRuntime">Refresh</button>
      </div>
    </header>

    <div v-if="error" class="viewer-error">{{ error }}</div>
    <div v-else class="viewer-body">
      <FaceplateRuntime
        ref="runtimeRef"
        :faceplate-id="faceplateId"
        :entity-id="boundEntityId"
        :live="true"
      />
    </div>
  </div>
</template>

<style scoped>
.faceplate-viewer-window {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background: linear-gradient(135deg, rgba(10, 10, 25, 0.9), rgba(12, 40, 50, 0.85));
  color: var(--qui-text-primary);
}

.viewer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(8px);
}

.title {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 14px;
  letter-spacing: 0.05em;
}

.title span {
  font-size: 12px;
  opacity: 0.7;
}

.controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.controls label {
  display: flex;
  flex-direction: column;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  opacity: 0.75;
}

.entity-input {
  margin-top: 4px;
  width: 160px;
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.4);
  color: var(--qui-text-primary);
}

.refresh-button {
  padding: 6px 12px;
  border-radius: 6px;
  background: var(--qui-accent-color);
  color: #050505;
  border: none;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.refresh-button:hover {
  transform: translateY(-1px);
}

.viewer-body {
  flex: 1;
  overflow: hidden;
}

.viewer-error {
  padding: 18px;
  color: var(--qui-danger-color);
}
</style>
