<script setup lang="ts">
import { useWindowStore } from '@/stores/windows'
import BaseWindow from '../window/BaseWindow.vue'

const windowStore = useWindowStore()

const handleWindowPosition = (windowId: string, x: number, y: number) => {
  windowStore.updateWindowPosition(windowId, x, y)
}
</script>

<template>
  <div class="workspace">
    <BaseWindow
      v-for="window in windowStore.windows"
      :key="window.id"
      :window="window"
      @update:position="(x, y) => handleWindowPosition(window.id, x, y)"
    >
      <component :is="window.component" />
    </BaseWindow>
  </div>
</template>

<style scoped>
.workspace {
  position: fixed;
  inset: 0;
  bottom: 40px;
  overflow: hidden;
}
</style>
