<script setup lang="ts">
import { ref, defineComponent, markRaw, onMounted, onUnmounted } from 'vue'
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

const handleClickOutside = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (isStartMenuOpen.value && !target?.closest('.start-btn') && !target?.closest('.start-menu')) {
    isStartMenuOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside)
})
</script>

<template>
  <div class="taskbar" @contextmenu.prevent="handleTaskbarContext">
    <button class="start-btn" @click="toggleStartMenu">
      <svg class="start-icon" viewBox="0 0 24 24">
        <path
          d="M21,16V8.00002L14,8V16H21M21,3C21.55,3 22,3.44999 22,4V16C22,16.55 21.55,17 21,17H14C13.45,17 13,16.55 13,16V4C13,3.44999 13.45,3 14,3H21M10,3H3C2.45,3 2,3.44999 2,4V20C2,20.55 2.45,21 3,21H10C10.55,21 11,20.55 11,20V4C11,3.44999 10.55,3 10,3Z"
        />
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
        <div class="window-button-content">
          <img v-if="window.icon" :src="window.icon" class="window-icon" :alt="window.title" />
          <div v-else class="window-icon-placeholder" />
          <span class="window-title">{{ window.title }}</span>
        </div>
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
  backdrop-filter: blur(var(--qui-backdrop-blur));
  border-top: 1px solid rgba(var(--qui-accent-color), var(--qui-border-opacity));
  padding: 0 8px;
  box-shadow: var(--qui-shadow-taskbar);
}

.start-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 34px;
  padding: 0 16px;
  background: var(--qui-gradient-secondary);
  border: 1px solid rgba(var(--qui-accent-color), var(--qui-border-opacity));
  border-radius: var(--qui-taskbar-button-radius);
  color: var(--qui-text-primary);
  font-weight: 500;
  position: relative;
  overflow: hidden;
}

.start-icon {
  width: 20px;
  height: 20px;
  filter: var(--qui-shadow-icon);
}

.start-text {
  font-size: var(--qui-font-size-small);
  font-weight: var(--qui-font-weight-medium);
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
  border: 1px solid rgba(var(--qui-accent-color), var(--qui-border-opacity));
  border-radius: var(--qui-taskbar-button-radius);
  color: var(--qui-text-primary);
  position: relative;
  min-width: 160px;
  max-width: 200px;
  font-size: var(--qui-font-size-base);
  font-family: var(--qui-font-family);
}

.window-button-content {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  position: relative;
  z-index: 1;
}

.window-icon {
  width: 16px;
  height: 16px;
  object-fit: contain;
  flex-shrink: 0;
  filter: var(--qui-shadow-icon);
}

.window-icon-placeholder {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  background: var(--qui-accent-color);
  opacity: 0.3;
  border-radius: 2px;
}

.window-title {
  flex: 1;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--qui-font-size-base);
  font-weight: var(--qui-font-weight-normal);
  color: var(--qui-text-primary);
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
  border-color: var(--qui-hover-border);
}

.window-button.active {
  background: var(--qui-gradient-secondary);
  border-color: var(--qui-overlay-secondary);
  box-shadow: var(--qui-shadow-accent);
}
</style>
