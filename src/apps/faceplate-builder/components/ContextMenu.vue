<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

interface MenuItem {
  label: string;
  icon?: string;
  action: string;
  disabled?: boolean;
  separator?: boolean;
  shortcut?: string;
}

const props = defineProps<{
  show: boolean;
  x: number;
  y: number;
  items: MenuItem[];
}>();

const emit = defineEmits<{
  (event: 'action', action: string): void;
  (event: 'close'): void;
}>();

const menuRef = ref<HTMLElement | null>(null);
const adjustedPosition = ref({ x: props.x, y: props.y });

// Adjust position to keep menu within viewport
function adjustPosition() {
  if (!menuRef.value) return;
  
  const menuRect = menuRef.value.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  let x = props.x;
  let y = props.y;
  
  // Adjust horizontal position
  if (x + menuRect.width > viewportWidth) {
    x = viewportWidth - menuRect.width - 10;
  }
  
  // Adjust vertical position
  if (y + menuRect.height > viewportHeight) {
    y = viewportHeight - menuRect.height - 10;
  }
  
  adjustedPosition.value = { x, y };
}

function handleAction(item: MenuItem) {
  if (item.disabled || item.separator) return;
  emit('action', item.action);
  emit('close');
}

function handleClickOutside(event: MouseEvent) {
  if (menuRef.value && !menuRef.value.contains(event.target as Node)) {
    emit('close');
  }
}

function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    emit('close');
  }
}

watch(() => props.show, (show) => {
  if (show) {
    setTimeout(adjustPosition, 0);
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
  } else {
    document.removeEventListener('click', handleClickOutside);
    document.removeEventListener('keydown', handleKeyDown);
  }
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside);
  document.removeEventListener('keydown', handleKeyDown);
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show"
      ref="menuRef"
      class="context-menu"
      :style="{
        left: `${adjustedPosition.x}px`,
        top: `${adjustedPosition.y}px`,
      }"
      @click.stop
    >
      <template v-for="(item, index) in items" :key="index">
        <div v-if="item.separator" class="context-menu__separator" />
        <button
          v-else
          class="context-menu__item"
          :class="{ 'context-menu__item--disabled': item.disabled }"
          :disabled="item.disabled"
          @click="handleAction(item)"
        >
          <span v-if="item.icon" class="context-menu__icon">{{ item.icon }}</span>
          <span class="context-menu__label">{{ item.label }}</span>
          <span v-if="item.shortcut" class="context-menu__shortcut">{{ item.shortcut }}</span>
        </button>
      </template>
    </div>
  </Teleport>
</template>

<style scoped>
.context-menu {
  position: fixed;
  z-index: 10000;
  min-width: 200px;
  background: rgba(8, 16, 24, 0.98);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(16px);
  padding: 4px;
  overflow: hidden;
}

.context-menu__item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: inherit;
  font-size: 14px;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s ease;
}

.context-menu__item:hover:not(.context-menu__item--disabled) {
  background: rgba(0, 255, 194, 0.12);
}

.context-menu__item--disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.context-menu__icon {
  font-size: 16px;
  width: 20px;
  text-align: center;
}

.context-menu__label {
  flex: 1;
}

.context-menu__shortcut {
  font-size: 12px;
  opacity: 0.6;
  font-family: monospace;
}

.context-menu__separator {
  height: 1px;
  background: rgba(255, 255, 255, 0.08);
  margin: 4px 0;
}
</style>
