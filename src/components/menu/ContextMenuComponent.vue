<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useMenuStore } from '@/stores/menu'
import type { MenuItem } from '@/core/menu/types'

const menuStore = useMenuStore()

const handleClick = (item: MenuItem) => {
  if (!item.disabled && item.action) {
    item.action()
    menuStore.hideMenu()
  }
}

const handleOutsideClick = (e: MouseEvent) => {
  const menu = document.getElementById('context-menu')
  if (menu && !menu.contains(e.target as Node)) {
    menuStore.hideMenu()
  }
}

onMounted(() => {
  document.addEventListener('click', handleOutsideClick)
})

onUnmounted(() => {
  document.removeEventListener('click', handleOutsideClick)
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="menuStore.isVisible"
      id="context-menu"
      class="context-menu"
      :style="{
        left: `${menuStore.position.x}px`,
        top: `${menuStore.position.y}px`,
      }"
    >
      <div
        v-for="item in menuStore.items"
        :key="item.id"
        :class="['menu-item', { disabled: item.disabled, separator: item.separator }]"
        @click="handleClick(item)"
      >
        <img v-if="item.icon" :src="item.icon" class="item-icon" />
        <span class="item-label">{{ item.label }}</span>
        <span v-if="item.shortcut" class="item-shortcut">{{ item.shortcut }}</span>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.context-menu {
  position: fixed;
  min-width: 200px;
  background: var(--qui-bg-secondary);
  border: var(--qui-window-border);
  border-radius: 4px;
  padding: 4px;
  box-shadow: var(--qui-shadow);
  z-index: 9999;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 6px 12px;
  cursor: pointer;
  border-radius: 2px;
}

.menu-item:hover:not(.disabled) {
  background: var(--qui-accent-color);
  color: white;
}

.menu-item.disabled {
  opacity: 0.5;
  cursor: default;
}

.menu-item.separator {
  height: 1px;
  background: var(--qui-window-border);
  margin: 4px 0;
  padding: 0;
}

.item-icon {
  width: 16px;
  height: 16px;
  margin-right: 8px;
}

.item-shortcut {
  margin-left: auto;
  padding-left: 16px;
  opacity: 0.7;
}
</style>
