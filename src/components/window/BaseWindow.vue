<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import type { WindowState } from '@/core/window/types'
import { useWindowStore } from '@/stores/windows'
import { useMenuStore } from '@/stores/menu'

const props = defineProps<{
  window: WindowState
}>()

const emit = defineEmits<{
  (e: 'update:position', x: number, y: number): void
  (e: 'update:size', width: number, height: number): void
  (e: 'update:maximized', maximized: boolean): void
  (e: 'update:minimized', minimized: boolean): void
  (e: 'update:resizing', resizing: boolean): void
  (e: 'update:resizeHandle', handle: string): void
}>()

const windowStore = useWindowStore()
const menuStore = useMenuStore()
const isDragging = ref(false)
const dragOffset = ref({ x: 0, y: 0 })

const startDrag = (e: MouseEvent) => {
  // Ignore right clicks and when maximized
  if (e.button !== 0 || props.window.isMaximized) return

  // Only handle direct titlebar clicks
  const target = e.target as HTMLElement
  if (!target.closest('.window-controls') && target.closest('.titlebar')) {
    isDragging.value = true
    dragOffset.value = {
      x: e.clientX - props.window.x,
      y: e.clientY - props.window.y,
    }
    windowStore.activateWindow(props.window.id)
  }
}

const handleDrag = (e: MouseEvent) => {
  if (!isDragging.value) return

  const x = Math.max(0, e.clientX - dragOffset.value.x)
  const y = Math.max(0, e.clientY - dragOffset.value.y)
  emit('update:position', x, y)
}

const stopDrag = () => {
  isDragging.value = false
}

onMounted(() => {
  window.addEventListener('mousemove', handleDrag)
  window.addEventListener('mouseup', stopDrag)
})

onUnmounted(() => {
  window.removeEventListener('mousemove', handleDrag)
  window.removeEventListener('mouseup', stopDrag)
})

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
  windowStore.maximizeWindow(props.window.id)
}

const minimize = () => {
  windowStore.minimizeWindow(props.window.id)
}

const resizeHandles = [
  { handle: 'n', cursor: 'ns-resize' },
  { handle: 's', cursor: 'ns-resize' },
  { handle: 'e', cursor: 'ew-resize' },
  { handle: 'w', cursor: 'ew-resize' },
  { handle: 'ne', cursor: 'ne-resize' },
  { handle: 'nw', cursor: 'nw-resize' },
  { handle: 'se', cursor: 'se-resize' },
  { handle: 'sw', cursor: 'sw-resize' },
]

const startResize = (handle: string, e: MouseEvent) => {
  if (props.window.isMaximized) return

  windowStore.activateWindow(props.window.id)

  const startX = e.clientX
  const startY = e.clientY
  const startWidth = props.window.width
  const startHeight = props.window.height
  const startLeft = props.window.x
  const startTop = props.window.y

  const handleResize = (e: MouseEvent) => {
    const deltaX = e.clientX - startX
    const deltaY = e.clientY - startY

    let newWidth = startWidth
    let newHeight = startHeight
    let newX = startLeft
    let newY = startTop

    // Calculate new dimensions based on handle
    if (handle.includes('e')) newWidth = Math.max(props.window.minWidth, startWidth + deltaX)
    if (handle.includes('w')) {
      const width = Math.max(props.window.minWidth, startWidth - deltaX)
      newX = startLeft + (startWidth - width)
      newWidth = width
    }
    if (handle.includes('s')) newHeight = Math.max(props.window.minHeight, startHeight + deltaY)
    if (handle.includes('n')) {
      const height = Math.max(props.window.minHeight, startHeight - deltaY)
      newY = startTop + (startHeight - height)
      newHeight = height
    }

    // Apply max constraints
    if (props.window.maxWidth) newWidth = Math.min(newWidth, props.window.maxWidth)
    if (props.window.maxHeight) newHeight = Math.min(newHeight, props.window.maxHeight)

    // Update the store directly
    windowStore.updateWindowSize(props.window.id, newWidth, newHeight)
    windowStore.updateWindowPosition(props.window.id, newX, newY)
  }

  const stopResize = () => {
    window.removeEventListener('mousemove', handleResize)
    window.removeEventListener('mouseup', stopResize)
  }

  window.addEventListener('mousemove', handleResize)
  window.addEventListener('mouseup', stopResize)
}
</script>

<template>
  <div
    v-show="!window.isMinimized"
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
  >
    <div class="titlebar" @mousedown.stop="startDrag" @contextmenu.prevent="handleContextMenu">
      <div class="window-info">
        <img v-if="window.icon" :src="window.icon" class="window-icon" />
        <span class="window-title">{{ window.title }}</span>
      </div>
      <div class="window-controls">
        <button class="control-btn minimize" @click="minimize">
          <svg class="icon" viewBox="0 0 24 24">
            <path fill="currentColor" d="M20,14H4V10H20" />
          </svg>
        </button>
        <button class="control-btn maximize" @click="maximize">
          <svg class="icon" viewBox="0 0 24 24">
            <path
              v-if="window.isMaximized"
              fill="currentColor"
              d="M4,8H8V4H20V16H16V20H4V8M16,8V14H18V6H10V8H16M6,12V18H14V12H6Z"
            />
            <path v-else fill="currentColor" d="M4,4H20V20H4V4M6,6V18H18V6H6Z" />
          </svg>
        </button>
        <button class="control-btn close" @click="windowStore.closeWindow(window.id)">
          <svg class="icon" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"
            />
          </svg>
        </button>
      </div>
    </div>
    <div class="content">
      <slot></slot>
    </div>
    <template v-if="!window.isMaximized">
      <div
        v-for="{ handle, cursor } in resizeHandles"
        :key="handle"
        :class="['resize-handle', handle]"
        :style="{ cursor }"
        @mousedown.stop="(e) => startResize(handle, e)"
      />
    </template>
  </div>
</template>

<style scoped>
.window {
  position: absolute;
  background: var(--qui-window-bg);
  border-radius: var(--qui-window-radius);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  backdrop-filter: blur(var(--qui-backdrop-blur));
  user-select: none;

  /* Base state - no glow */
  border: var(--qui-window-border);
  box-shadow: var(--qui-shadow-window);

  /* Smoother animation */
  opacity: 0;
  transform: scale(0.98) translateY(10px);
  animation: windowAppear var(--qui-interaction-speed) var(--qui-animation-bounce) forwards;

  /* Separate transitions for better performance */
  transition:
    transform var(--qui-interaction-speed) var(--qui-animation-bounce),
    border-color var(--qui-interaction-speed) var(--qui-animation-fade),
    box-shadow var(--qui-interaction-speed) var(--qui-animation-fade);
  will-change: transform, opacity;
}

/* Re-add shine effect with animation control */
.window::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--qui-shine-effect);
  transform: translateX(-100%);
  opacity: 0;
  transition: transform var(--qui-shine-speed) var(--qui-animation-bounce);
}

/* Only show shine effect when window becomes active */
.window:not([data-active='true'])::before {
  content: none;
}

.window[data-active='true'] {
  transform: var(--qui-hover-lift) var(--qui-hover-scale);
  border: 1px solid var(--qui-hover-border);
  /* Subtler glow for active state */
  box-shadow:
    0 0 0 1px rgba(var(--qui-accent-color), 0.1),
    var(--qui-shadow-window),
    0 0 30px rgba(var(--qui-accent-color), 0.15);
}

/* Trigger shine animation when window becomes active */
.window[data-active='true']::before {
  opacity: 1;
  animation: shineEffect var(--qui-shine-speed) var(--qui-animation-bounce) forwards;
}

@keyframes shineEffect {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

.titlebar {
  height: var(--qui-titlebar-height);
  padding: 0 4px 0 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: move;
  user-select: none;
  position: relative;
  overflow: hidden;
  pointer-events: auto; /* Ensure titlebar receives events */
  background: var(--qui-titlebar-bg);
  border-bottom: 1px solid rgba(0, 0, 0, 0.2);
  transform: translateZ(0); /* Force GPU acceleration */
  will-change: transform;

  /* Fix border and background transitions */
  transition: none; /* Remove transition to prevent flashing */
}

/* Base layer - always present */
.titlebar::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--qui-gradient-secondary);
  opacity: 0.7;
  pointer-events: none;
  transition: opacity 0.3s var(--qui-animation-fade);
  transform: translateZ(0);
}

/* Enhanced active state */
.window[data-active='true'] .titlebar {
  background: var(--qui-gradient-active);
  border-bottom: 1px solid rgba(var(--qui-accent-color), 0.2);
}

.window-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
  pointer-events: none; /* Allow drag through title */
}

.window-title {
  font-size: var(--qui-font-size-base);
  font-weight: var(--qui-font-weight-medium);
  opacity: 0.9;
  pointer-events: none; /* Allow drag through title */
}

.window-controls {
  display: flex;
  height: 100%;
  gap: 1px;
  margin-left: auto; /* Push to right */
  pointer-events: auto; /* Ensure buttons receive events */
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
  position: relative; /* For hover effects */
  isolation: isolate; /* Create stacking context */
  z-index: 1; /* Ensure buttons are above titlebar */
}

/* Remove any inherited button styles */
.control-btn {
  margin: 0;
  padding: 0;
  font: inherit;
  outline: none;
}

.control-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--qui-overlay-hover);
  opacity: 0;
  transition: opacity 0.3s;
}

.control-btn:hover::before {
  opacity: 1;
}

.control-btn .icon {
  width: 16px;
  height: 16px;
  transition: transform 0.2s var(--qui-animation-bounce);
}

.control-btn:hover .icon {
  transform: scale(1.2);
}

.control-btn.minimize .icon {
  transform: translateY(2px);
}

.control-btn.maximize .icon {
  font-size: 16px;
}

.control-btn.close .icon {
  width: 18px;
  height: 18px;
}

.control-btn.minimize:hover {
  background: var(--qui-overlay-primary);
}

.control-btn.maximize:hover {
  background: var(--qui-overlay-secondary);
}

.control-btn.close {
  margin-left: 1px;
}

.control-btn.close:hover {
  background: var(--qui-danger-bg);
  color: var(--qui-danger-color);
}

.control-btn.close:hover .icon {
  transform: scale(1.2);
}

.content {
  flex: 1;
  overflow: auto;
  padding: var(--qui-window-padding);
  background: var(--qui-window-bg);
  user-select: text;
}

.window[data-active='true'] .titlebar {
  background: var(--qui-titlebar-active-bg);
}

.window[data-active='true'] .window-title {
  opacity: 1;
}

.window-icon {
  width: 16px;
  height: 16px;
  object-fit: contain;
  filter: var(--qui-shadow-icon);
}

@keyframes windowAppear {
  0% {
    opacity: 0;
    transform: scale(0.98) translateY(10px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.resize-handle {
  position: absolute;
  z-index: 2;

  &.n {
    top: -4px;
    left: 4px;
    right: 4px;
    height: 8px;
  }
  &.s {
    bottom: -4px;
    left: 4px;
    right: 4px;
    height: 8px;
  }
  &.e {
    right: -4px;
    top: 4px;
    bottom: 4px;
    width: 8px;
  }
  &.w {
    left: -4px;
    top: 4px;
    bottom: 4px;
    width: 8px;
  }

  &.ne {
    top: -4px;
    right: -4px;
    width: 12px;
    height: 12px;
  }
  &.nw {
    top: -4px;
    left: -4px;
    width: 12px;
    height: 12px;
  }
  &.se {
    bottom: -4px;
    right: -4px;
    width: 12px;
    height: 12px;
  }
  &.sw {
    bottom: -4px;
    left: -4px;
    width: 12px;
    height: 12px;
  }
}
</style>
