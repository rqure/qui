<script setup lang="ts">
import { ref } from 'vue';
import { useEntityDrag } from '@/core/utils/composables';
import type { EntityId } from '@/core/data/types';

const props = defineProps<{
  entityId: EntityId;
}>();

const emit = defineEmits<{
  (e: 'context-menu', data: { x: number, y: number, entityId: EntityId }): void;
}>();

const { startEntityDrag } = useEntityDrag();

function onContextMenu(e: MouseEvent) {
  e.preventDefault();
  emit('context-menu', { x: e.clientX, y: e.clientY, entityId: props.entityId });
}

function onDragStart(e: DragEvent) {
  startEntityDrag(e, props.entityId);
}
</script>

<template>
  <span
    class="entity-id-chip"
    :data-entity-id="entityId"
    @contextmenu="onContextMenu"
    @dragstart="onDragStart"
    draggable="true"
  >
    {{ entityId }}
  </span>
</template>

<style scoped>
.entity-id-chip {
  display: inline-block;
  padding: 0 6px;
  margin: 0 2px;
  border-radius: 4px;
  background: var(--qui-menu-bg);
  color: var(--qui-accent-color);
  border: 1px solid var(--qui-accent-color);
  font-weight: 500;
  cursor: pointer;
  user-select: text;
  transition: background 0.2s, color 0.2s;
}
.entity-id-chip:hover {
  background: var(--qui-menu-item-hover);
  color: var(--qui-accent-secondary);
}
</style>
