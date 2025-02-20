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
  background: var(--qui-gradient-window);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(0, 255, 136, 0.2);
  border-radius: var(--qui-window-radius);
  box-shadow:
    0 0 30px rgba(0, 255, 136, 0.1),
    inset 0 0 0 1px rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: all 0.3s var(--qui-animation-bounce);
}

.window:hover {
  border-color: rgba(0, 255, 136, 0.3);
  box-shadow:
    0 0 40px rgba(0, 255, 136, 0.15),
    inset 0 0 0 1px rgba(255, 255, 255, 0.1);
}

.window.maximized {
  border-radius: 0;
  transform: none !important;
}

.titlebar {
  height: 38px;
  background: var(--qui-gradient-primary);
  border-bottom: 1px solid rgba(0, 255, 136, 0.2);
  padding: 0 var(--qui-window-padding);
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: move;
  user-select: none;
  font-weight: 500;
  letter-spacing: 0.5px;
  color: rgba(255, 255, 255, 0.9);
  position: relative;
}

.titlebar::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--qui-gradient-secondary);
  opacity: 0.1;
}

.window-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.window-icon {
  width: 16px;
  height: 16px;
  object-fit: contain;
}

.window-title {
  font-size: 0.9rem;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.window-controls {
  display: flex;
  gap: 2px;
  margin-left: auto;
}

.control-btn {
  width: 46px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: var(--qui-text-secondary);
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.control-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  opacity: 0;
  transition: opacity 0.2s;
}

.control-btn:hover::before {
  opacity: 1;
}

.control-btn.minimize::before {
  background: var(--qui-gradient-secondary);
}

.control-btn.maximize::before {
  background: var(--qui-gradient-secondary);
}

.control-btn.close::before {
  background: linear-gradient(135deg, rgba(255, 68, 68, 0.2), rgba(255, 68, 68, 0.3));
}

.control-btn .icon {
  font-size: 14px;
  position: relative;
  z-index: 1;
}

.control-btn.close:hover {
  color: #ffffff;
}

.close-btn {
  width: 24px;
  height: 24px;
  background: none;
  border: none;
  color: var(--qui-text-primary);
  font-size: 1.2rem;
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s var(--qui-animation-bounce);
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #ff4444;
}

.content {
  flex: 1;
  overflow: auto;
  padding: var(--qui-window-padding);
}
</style>
