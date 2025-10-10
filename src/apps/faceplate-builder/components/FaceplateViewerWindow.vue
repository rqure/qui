<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import type { EntityId } from '@/core/data/types';
import { useDataStore } from '@/stores/data';
import { FaceplateDataService } from '@/apps/faceplate-builder/utils/faceplate-data';
import FaceplateRuntime from './FaceplateRuntime.vue';
import { logger } from '@/apps/faceplate-builder/utils/logger';

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
    logger.warn('Failed to load faceplate metadata:', err);
  }
}

async function loadEntityName(entityId: EntityId) {
  try {
    const name = await service.readString(entityId, 'Name', `Entity ${entityId}`);
    entityName.value = name;
  } catch (err) {
    logger.warn('Failed to read entity name:', err);
    entityName.value = `Entity ${entityId}`;
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
        <div v-if="boundEntityId" class="entity-badge">
          <span class="badge-label">Entity</span>
          <span class="badge-value">{{ boundEntityId }}</span>
        </div>
        <div v-else class="entity-badge entity-badge--empty">
          <span class="badge-label">No entity bound</span>
        </div>
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

.entity-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 6px;
  background: rgba(0, 255, 170, 0.12);
  border: 1px solid rgba(0, 255, 170, 0.25);
  font-size: 12px;
}

.entity-badge--empty {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
  opacity: 0.6;
}

.badge-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  opacity: 0.7;
}

.badge-value {
  font-weight: 600;
  font-family: 'Courier New', monospace;
  color: var(--qui-accent-color);
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
