<script setup lang="ts">
interface PaletteComponent {
  id: string;
  label: string;
  description: string;
  icon: string;
  badge?: string;
}

const props = defineProps<{
  components: PaletteComponent[];
  canCreateCustom?: boolean;
}>();

const emit = defineEmits<{
  (event: 'create-request', componentId: string): void;
  (event: 'create-custom'): void;
  (event: 'manage-custom'): void;
}>();

function handleDragStart(event: DragEvent, componentId: string) {
  if (!event.dataTransfer) return;
  event.dataTransfer.effectAllowed = 'copy';
  event.dataTransfer.setData('text/plain', componentId);
  event.dataTransfer.setData('application/x-faceplate-component', componentId);
}
</script>

<template>
  <aside class="palette">
    <header class="palette__header">
      <h2>Components</h2>
      <div class="palette__actions">
        <button
          type="button"
          class="palette__action"
          :disabled="!props.canCreateCustom"
          title="Create custom component from selection"
          @click="emit('create-custom')"
        >
          ✨
        </button>
        <button
          type="button"
          class="palette__action"
          title="Manage custom component library"
          @click="emit('manage-custom')"
        >
          📚
        </button>
      </div>
    </header>
    <div class="palette__list">
      <button
        v-for="item in props.components"
        :key="item.id"
        class="palette__item"
        draggable="true"
        type="button"
  @dragstart="handleDragStart($event, item.id)"
  @click="emit('create-request', item.id)"
      >
        <span class="palette__icon" aria-hidden="true">{{ item.icon }}</span>
        <span class="palette__body">
          <strong>
            {{ item.label }}
            <span v-if="item.badge" class="palette__badge">{{ item.badge }}</span>
          </strong>
          <small>{{ item.description }}</small>
        </span>
      </button>
    </div>
  </aside>
</template>

<style scoped>
.palette {
  display: flex;
  flex-direction: column;
  background: rgba(4, 12, 18, 0.72);
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(18px);
  min-width: 220px;
  max-width: 260px;
}

.palette__header {
  padding: 14px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.palette__header h2 {
  margin: 0;
  font-size: 15px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.palette__actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.palette__action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.05);
  color: inherit;
  font-size: 16px;
  cursor: pointer;
  transition: transform 0.12s ease;
}

.palette__action:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.palette__action:not(:disabled):hover {
  transform: translateY(-1px);
}

.palette__list {
  flex: 1;
  overflow: auto;
  padding: 8px 0;
}

.palette__item {
  display: grid;
  grid-template-columns: 40px 1fr;
  align-items: center;
  gap: 8px;
  width: 100%;
  background: transparent;
  color: inherit;
  border: none;
  border-radius: 10px;
  padding: 10px 12px;
  text-align: left;
  cursor: grab;
  transition: background 0.18s ease;
}

.palette__item:active {
  cursor: grabbing;
}

.palette__item:hover {
  background: rgba(0, 255, 194, 0.12);
}

.palette__icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: rgba(0, 255, 194, 0.16);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.palette__body strong {
  display: block;
  font-size: 14px;
}

.palette__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: 8px;
  padding: 2px 6px;
  border-radius: 999px;
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  background: rgba(0, 255, 194, 0.16);
  color: rgba(0, 255, 194, 0.92);
}

.palette__body small {
  display: block;
  opacity: 0.7;
  font-size: 12px;
}
</style>
