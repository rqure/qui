<script setup lang="ts">
import { useWindowStore } from '@/stores/windows'
import { useMenuStore } from '@/stores/menu'
import BaseWindow from '../window/BaseWindow.vue'

const windowStore = useWindowStore()
const menuStore = useMenuStore()

const handleWindowPosition = (windowId: string, x: number, y: number) => {
  windowStore.updateWindowPosition(windowId, x, y)
}

const handleContextMenu = (e: MouseEvent) => {
  e.preventDefault()
  if (e.target === e.currentTarget) {
    menuStore.showMenu(
      { x: e.clientX, y: e.clientY },
      [
        { id: 'new-window', label: 'New Window', action: () => {} },
        { id: 'arrange', label: 'Arrange Windows', action: () => {} },
        { id: 'sep1', separator: true, label: '' },
        { id: 'workspace-settings', label: 'Workspace Settings', action: () => {} },
      ],
      { type: 'workspace' },
    )
  }
}
</script>

<template>
  <div class="workspace" @contextmenu="handleContextMenu">
    <BaseWindow
      v-for="window in windowStore.windows"
      :key="window.id"
      :window="window"
      @update:position="(x, y) => handleWindowPosition(window.id, x, y)"
    >
      <component :is="window.component" :windowId="window.id" v-bind="window.props" />
    </BaseWindow>
  </div>
</template>

<style scoped>
.workspace {
  position: fixed;
  inset: 0;
  bottom: var(--qui-taskbar-height);
  overflow: hidden;
  background: var(--qui-bg-primary);
}
</style>
