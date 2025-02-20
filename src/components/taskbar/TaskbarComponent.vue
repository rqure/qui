<script setup lang="ts">
import { ref, defineComponent, markRaw } from 'vue'
import { useWindowStore } from '@/stores/windows'
import StartMenuComponent from './StartMenuComponent.vue'
import { useMenuStore } from '@/stores/menu'

const TestWindow = markRaw(
  defineComponent({
    name: 'TestWindow',
    template: '<div>Test Window Content</div>',
  }),
)

const windowStore = useWindowStore()
const isStartMenuOpen = ref(false)
const menuStore = useMenuStore()

const toggleStartMenu = () => {
  isStartMenuOpen.value = !isStartMenuOpen.value
}

const createTestWindow = () => {
  windowStore.createWindow({
    title: 'Test Window',
    width: 400,
    height: 300,
    component: TestWindow,
  })
  isStartMenuOpen.value = false
}

const handleTaskbarContext = (e: MouseEvent) => {
  e.preventDefault()
  menuStore.showMenu(
    { x: e.clientX, y: e.clientY },
    [
      {
        id: 'taskbar-position',
        label: 'Taskbar Position',
        children: [
          { id: 'position-bottom', label: 'Bottom', action: () => {} },
          { id: 'position-top', label: 'Top', action: () => {} },
        ],
      },
      { id: 'sep1', separator: true, label: '' },
      { id: 'taskbar-settings', label: 'Taskbar Settings', action: () => {} },
    ],
    { type: 'taskbar' },
  )
}

const handleWindowItemContext = (e: MouseEvent, windowId: string) => {
  e.preventDefault()
  e.stopPropagation()
  menuStore.showMenu(
    { x: e.clientX, y: e.clientY },
    [
      { id: 'activate', label: 'Activate', action: () => windowStore.activateWindow(windowId) },
      { id: 'close', label: 'Close', action: () => windowStore.closeWindow(windowId) },
    ],
    { type: 'taskbar-window', data: { windowId } },
  )
}

const handleWindowClick = (windowId: string) => {
  const window = windowStore.windows.find((w) => w.id === windowId)
  if (window?.isMinimized) {
    windowStore.restoreWindow(windowId)
  }
  windowStore.activateWindow(windowId)
}
</script>

<template>
  <div class="taskbar" @contextmenu.prevent="handleTaskbarContext">
    <button class="start-btn" @click="toggleStartMenu">
      <svg class="start-icon" viewBox="0 0 24 24">
        <path fill="currentColor" d="M3,6H21V8H3V6M3,11H21V13H3V11M3,16H21V18H3V16Z" />
      </svg>
      <span class="start-text">Start</span>
    </button>
    <StartMenuComponent
      v-if="isStartMenuOpen"
      @create-window="createTestWindow"
      @close="isStartMenuOpen = false"
    />
    <div class="window-list">
      <button
        v-for="window in windowStore.windows"
        :key="window.id"
        :class="['window-button', { active: window.id === windowStore.activeWindow?.id }]"
        @click="handleWindowClick(window.id)"
        @contextmenu="(e) => handleWindowItemContext(e, window.id)"
      >
        <img v-if="window.icon" :src="window.icon" class="window-icon" />
        <span class="window-title">{{ window.title }}</span>
        <div class="active-indicator" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.taskbar {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  height: var(--qui-taskbar-height);
  background: var(--qui-gradient-taskbar);
  backdrop-filter: blur(12px);
  border-top: 1px solid rgba(0, 255, 136, 0.2);
  padding: 0 8px;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.2);
}

.start-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 34px;
  padding: 0 16px;
  background: var(--qui-gradient-secondary);
  border: 1px solid rgba(0, 255, 136, 0.3);
  border-radius: 8px;
  color: var(--qui-text-primary);
  font-weight: 500;
  position: relative;
  overflow: hidden;
}

.start-icon {
  width: 20px;
  height: 20px;
}

.start-text {
  font-size: 0.9rem;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.start-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--qui-gradient-accent);
  opacity: 0;
  transition: opacity 0.3s;
}

.start-btn:hover::before {
  opacity: 0.15;
}

.window-list {
  display: flex;
  gap: 4px;
}

.window-button {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 34px;
  padding: 0 12px;
  background: var(--qui-gradient-primary);
  border: 1px solid rgba(0, 255, 136, 0.15);
  border-radius: 8px;
  color: var(--qui-text-primary);
  position: relative;
  min-width: 160px;
  max-width: 200px;
}

.window-icon {
  width: 16px;
  height: 16px;
  object-fit: contain;
}

.window-title {
  flex: 1;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.9rem;
}

.active-indicator {
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 2px;
  background: var(--qui-gradient-accent);
  opacity: 0;
  transform: scaleX(0.7);
  transition: all 0.3s var(--qui-animation-bounce);
}

.window-button.active .active-indicator {
  opacity: 1;
  transform: scaleX(1);
}

.window-button:hover {
  border-color: rgba(0, 255, 136, 0.3);
}

.window-button.active {
  background: var(--qui-gradient-secondary);
  border-color: rgba(0, 180, 255, 0.3);
  box-shadow: 0 0 15px rgba(0, 180, 255, 0.2);
}
</style>
