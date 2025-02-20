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
  (e: 'update:size', width: number, height: number): void
  (e: 'update:prevSize', size: { x: number; y: number; width: number; height: number }): void
  (e: 'update:maximized', maximized: boolean): void
  (e: 'update:minimized', minimized: boolean): void
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
      { id: 'minimize', label: 'Minimize', action: () => minimize() },
      { id: 'maximize', label: 'Maximize', action: () => maximize() },
      { id: 'sep1', separator: true, label: '' },
      { id: 'close', label: 'Close', action: () => windowStore.closeWindow(props.window.id) },
    ],
    { type: 'window', data: { id: props.window.id } },
  )
}

const maximize = () => {
  if (props.window.isMaximized) {
    if (props.window.prevSize) {
      emit('update:position', props.window.prevSize.x, props.window.prevSize.y)
      emit('update:size', props.window.prevSize.width, props.window.prevSize.height)
    }
  } else {
    emit('update:prevSize', {
      x: props.window.x,
      y: props.window.y,
      width: props.window.width,
      height: props.window.height,
    })
    emit('update:position', 0, 0)
    emit('update:size', window.innerWidth, window.innerHeight)
  }
  emit('update:maximized', !props.window.isMaximized)
}

const minimize = () => {
  emit('update:minimized', true)
}
</script>

<template>
  <div
    class="window"
    :class="{ maximized: window.isMaximized }"
    :style="{
      left: `${window.x}px`,
      top: `${window.y}px`,
      width: `${window.width}px`,
      height: `${window.height}px`,
      zIndex: window.zIndex,
    }"
    :data-active="window.id === windowStore.activeWindow?.id"
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
      <div class="window-info">
        <img v-if="window.icon" :src="window.icon" class="window-icon" />
        <span class="window-title">{{ window.title }}</span>
      </div>
      <div class="window-controls">
        <button class="control-btn minimize" @click="minimize">
          <span class="icon">─</span>
        </button>
        <button class="control-btn maximize" @click="maximize">
          <span class="icon">□</span>
        </button>
        <button class="control-btn close" @click="windowStore.closeWindow(window.id)">
          <span class="icon">×</span>
        </button>
      </div>
    </div>
    <div class="content">
      <slot></slot>
    </div>
  </div>
</template>

<style scoped>
.window {
  position: absolute;
  background: var(--qui-window-bg);
  border: var(--qui-window-border);
  border-radius: var(--qui-window-radius);
  box-shadow: 0 0 30px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.titlebar {
  height: var(--qui-titlebar-height);
  background: var(--qui-titlebar-bg);
  border-bottom: var(--qui-titlebar-border);
  padding: 0 4px 0 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: move;
  user-select: none;
  font-weight: 500;
  letter-spacing: 0.5px;
  color: rgba(255, 255, 255, 0.9);
}

.window-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.window-title {
  font-size: var(--qui-font-size-base);
  font-weight: var(--qui-font-weight-medium);
  opacity: 0.9;
}

.window-controls {
  display: flex;
  margin-left: auto;
  height: 100%;
}

.control-btn {
  width: 46px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: var(--qui-text-secondary);
  cursor: pointer;
  transition: all 0.2s;
  font-size: var(--qui-font-size-base);
  font-family: var(--qui-font-family);
}

.control-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.control-btn.close:hover {
  background: var(--qui-gradient-accent);
  color: var(--qui-text-primary);
}

.content {
  flex: 1;
  overflow: auto;
  padding: var(--qui-window-padding);
  background: var(--qui-window-bg);
}

.window[data-active='true'] .titlebar {
  background: var(--qui-titlebar-active-bg);
}

.window[data-active='true'] .window-title {
  opacity: 1;
}
</style>
