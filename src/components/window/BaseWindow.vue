<script setup lang="ts">
import { ref } from 'vue'
import type { WindowState } from '@/core/window/types'
import { useWindowStore } from '@/stores/windows'
import { useMenuStore } from '@/stores/menu'

const props = defineProps<{
  window: WindowState
}>()

const emit = defineEmits<{
  (e: 'update:position', x: number, y: number): void
}>()

const windowStore = useWindowStore()
const menuStore = useMenuStore()
const isDragging = ref(false)
const dragOffset = ref({ x: 0, y: 0 })

const startDrag = (e: MouseEvent) => {
  isDragging.value = true
  dragOffset.value = {
    x: e.clientX - props.window.x,
    y: e.clientY - props.window.y,
  }
  windowStore.activateWindow(props.window.id)
}

const handleDrag = (e: MouseEvent) => {
  if (isDragging.value) {
    const x = Math.max(0, e.clientX - dragOffset.value.x)
    const y = Math.max(0, e.clientY - dragOffset.value.y)
    emit('update:position', x, y)
  }
}

const stopDrag = () => {
  isDragging.value = false
}

const handleContextMenu = (e: MouseEvent) => {
  e.preventDefault()
  menuStore.showMenu(
    { x: e.clientX, y: e.clientY },
    [
      { id: 'minimize', label: 'Minimize', action: () => {} },
      { id: 'maximize', label: 'Maximize', action: () => {} },
      { id: 'sep1', separator: true, label: '' },
      { id: 'close', label: 'Close', action: () => windowStore.closeWindow(props.window.id) },
    ],
    { type: 'window', data: { id: props.window.id } },
  )
}
</script>

<template>
  <div
    class="window"
    :style="{
      left: `${window.x}px`,
      top: `${window.y}px`,
      width: `${window.width}px`,
      height: `${window.height}px`,
      zIndex: window.zIndex,
    }"
    @mousedown="windowStore.activateWindow(window.id)"
    @contextmenu="handleContextMenu"
  >
    <div
      class="titlebar"
      @mousedown="startDrag"
      @mousemove="handleDrag"
      @mouseup="stopDrag"
      @mouseleave="stopDrag"
    >
      {{ window.title }}
      <button class="close-btn" @click="windowStore.closeWindow(window.id)">×</button>
    </div>
    <div class="content">
      <slot></slot>
    </div>
  </div>
</template>

<style scoped>
.window {
  position: absolute;
  background: var(--qui-bg-secondary);
  border: var(--qui-window-border);
  border-radius: 8px;
  box-shadow: var(--qui-shadow);
  display: flex;
  flex-direction: column;
}

.titlebar {
  height: 32px;
  background: var(--qui-bg-primary);
  border-bottom: var(--qui-window-border);
  padding: 0 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: move;
  user-select: none;
}

.close-btn {
  background: none;
  border: none;
  color: var(--qui-text-primary);
  font-size: 1.5rem;
  cursor: pointer;
}

.content {
  flex: 1;
  overflow: auto;
  padding: 1rem;
}
</style>
