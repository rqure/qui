<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { EntityId } from '@/core/data/types';

export interface CustomComponentInfo {
  id: EntityId;
  name: string;
  description: string;
  icon: string;
}

const props = defineProps<{
  show: boolean;
  components: CustomComponentInfo[];
}>();

const emit = defineEmits<{
  (event: 'close'): void;
  (event: 'delete', componentId: EntityId): void;
  (event: 'edit', componentId: EntityId): void;
}>();

const searchQuery = ref('');

const filteredComponents = ref<CustomComponentInfo[]>([]);

function updateFiltered() {
  const query = searchQuery.value.toLowerCase();
  filteredComponents.value = props.components.filter(
    c => c.name.toLowerCase().includes(query) || c.description.toLowerCase().includes(query)
  );
}

function handleDelete(componentId: EntityId) {
  if (confirm('Are you sure you want to delete this custom component? This cannot be undone.')) {
    emit('delete', componentId);
  }
}

function handleEdit(componentId: EntityId) {
  emit('edit', componentId);
}

onMounted(() => {
  updateFiltered();
});

// Watch for changes
function handleSearchInput() {
  updateFiltered();
}

// Watch for prop changes
const watcher = () => {
  updateFiltered();
};
if (props.show) {
  watcher();
}
</script>

<template>
  <div v-if="show" class="manager-overlay" @click.self="emit('close')">
    <div class="manager-dialog">
      <header class="manager-dialog__header">
        <h2>Custom Component Library</h2>
        <button type="button" class="manager-dialog__close" @click="emit('close')">✕</button>
      </header>

      <div class="manager-dialog__search">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search components..."
          class="manager-dialog__search-input"
          @input="handleSearchInput"
        />
      </div>

      <div class="manager-dialog__content">
        <div v-if="filteredComponents.length === 0" class="manager-dialog__empty">
          <p v-if="searchQuery">No components match your search.</p>
          <p v-else>No custom components yet. Create one from selected primitives!</p>
        </div>

        <div v-else class="manager-dialog__list">
          <div
            v-for="component in filteredComponents"
            :key="component.id.toString()"
            class="component-card"
          >
            <div class="component-card__icon">{{ component.icon }}</div>
            <div class="component-card__info">
              <h3 class="component-card__name">{{ component.name }}</h3>
              <p class="component-card__description">{{ component.description }}</p>
            </div>
            <div class="component-card__actions">
              <button
                type="button"
                class="component-card__action component-card__action--edit"
                @click="handleEdit(component.id)"
                title="Edit component"
              >
                ✏️ Edit
              </button>
              <button
                type="button"
                class="component-card__action component-card__action--delete"
                @click="handleDelete(component.id)"
                title="Delete component"
              >
                🗑️ Delete
              </button>
            </div>
          </div>
        </div>
      </div>

      <footer class="manager-dialog__footer">
        <button type="button" class="manager-dialog__button" @click="emit('close')">Close</button>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.manager-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
}

.manager-dialog {
  width: 90%;
  max-width: 800px;
  max-height: 80vh;
  background: linear-gradient(135deg, rgba(20, 30, 45, 0.98), rgba(10, 20, 35, 0.98));
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 16px;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.manager-dialog__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 28px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.manager-dialog__header h2 {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: var(--qui-text-primary);
}

.manager-dialog__close {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  font-size: 28px;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s;
}

.manager-dialog__close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.9);
}

.manager-dialog__search {
  padding: 20px 28px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.manager-dialog__search-input {
  width: 100%;
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  color: var(--qui-text-primary);
  font-size: 14px;
  transition: all 0.2s;
}

.manager-dialog__search-input:focus {
  outline: none;
  border-color: rgba(0, 255, 170, 0.5);
  background: rgba(0, 0, 0, 0.4);
}

.manager-dialog__content {
  flex: 1;
  overflow-y: auto;
  padding: 20px 28px;
}

.manager-dialog__empty {
  text-align: center;
  padding: 60px 20px;
  color: rgba(255, 255, 255, 0.5);
}

.manager-dialog__empty p {
  margin: 0;
  font-size: 15px;
}

.manager-dialog__list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.component-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  transition: all 0.2s;
}

.component-card:hover {
  background: rgba(0, 0, 0, 0.35);
  border-color: rgba(255, 255, 255, 0.2);
}

.component-card__icon {
  font-size: 32px;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 255, 170, 0.1);
  border-radius: 10px;
  flex-shrink: 0;
}

.component-card__info {
  flex: 1;
  min-width: 0;
}

.component-card__name {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--qui-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.component-card__description {
  margin: 0;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.component-card__actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.component-card__action {
  padding: 8px 14px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  color: var(--qui-text-primary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.component-card__action:hover {
  background: rgba(0, 0, 0, 0.5);
  border-color: rgba(255, 255, 255, 0.25);
}

.component-card__action--edit:hover {
  border-color: rgba(0, 255, 170, 0.5);
  background: rgba(0, 255, 170, 0.1);
}

.component-card__action--delete:hover {
  border-color: rgba(255, 100, 100, 0.5);
  background: rgba(255, 100, 100, 0.1);
}

.manager-dialog__footer {
  padding: 20px 28px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: flex-end;
}

.manager-dialog__button {
  padding: 12px 24px;
  background: rgba(0, 255, 170, 0.2);
  border: 1px solid rgba(0, 255, 170, 0.4);
  border-radius: 8px;
  color: var(--qui-text-primary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.manager-dialog__button:hover {
  background: rgba(0, 255, 170, 0.3);
  border-color: rgba(0, 255, 170, 0.6);
}
</style>
