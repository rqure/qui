<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
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

const activeSubmenu = ref<string | null>(null)

const handleMouseEnter = (item: MenuItem) => {
  if (item.children) {
    activeSubmenu.value = item.id
  } else {
    activeSubmenu.value = null
  }
}

const handleMouseLeave = () => {
  activeSubmenu.value = null
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
        @mouseenter="handleMouseEnter(item)"
        @mouseleave="handleMouseLeave"
      >
        <img v-if="item.icon" :src="item.icon" class="item-icon" />
        <span class="item-label">{{ item.label }}</span>
        <span v-if="item.shortcut" class="item-shortcut">{{ item.shortcut }}</span>
        <span v-if="item.children" class="submenu-arrow">›</span>

        <!-- Submenu -->
        <div v-if="item.children && activeSubmenu === item.id" class="submenu">
          <div
            v-for="subItem in item.children"
            :key="subItem.id"
            :class="['menu-item', { disabled: subItem.disabled }]"
            @click.stop="handleClick(subItem)"
          >
            <img v-if="subItem.icon" :src="subItem.icon" class="item-icon" />
            <span class="item-label">{{ subItem.label }}</span>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.context-menu {
  position: fixed;
  min-width: 200px;
  background: var(--qui-menu-bg);
  border: var(--qui-menu-border);
  border-radius: var(--qui-menu-radius);
  padding: 4px;
  box-shadow: var(--qui-menu-shadow);
  z-index: 9999;
}

.menu-item {
  display: flex;
  align-items: center;
  height: var(--qui-menu-item-height);
  padding: 0 12px;
  cursor: pointer;
  font-size: var(--qui-font-size-base);
  font-weight: var(--qui-font-weight-normal);
  color: var(--qui-text-primary);
}

.menu-item:hover:not(.disabled) {
  background: var(--qui-menu-item-hover);
  color: white;
}

.menu-item.disabled {
  opacity: var(--qui-menu-disabled-opacity);
  cursor: default;
  color: var(--qui-text-secondary);
}

.menu-item.separator {
  height: 1px;
  background: var(--qui-menu-separator);
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
  color: var(--qui-text-secondary);
  font-size: var(--qui-font-size-small);
}

.submenu-arrow {
  margin-left: auto;
  padding-left: 8px;
}

.submenu {
  position: absolute;
  left: 100%;
  top: 0;
  min-width: 200px;
  background: var(--qui-bg-secondary);
  border: var(--qui-window-border);
  border-radius: var(--qui-menu-radius);
  padding: 4px;
  box-shadow: var(--qui-shadow);
}
</style>
