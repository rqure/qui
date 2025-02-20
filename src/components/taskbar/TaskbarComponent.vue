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
</script>

<template>
  <div class="taskbar" @contextmenu="handleTaskbarContext">
    <button class="start-btn" @click="toggleStartMenu">Start</button>
    <StartMenuComponent
      v-if="isStartMenuOpen"
      @create-window="createTestWindow"
      @close="isStartMenuOpen = false"
    />
    <div class="window-list">
      <button
        v-for="window in windowStore.windows"
        :key="window.id"
        @click="windowStore.activateWindow(window.id)"
        @contextmenu="(e) => handleWindowItemContext(e, window.id)"
      >
        {{ window.title }}
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
  background: var(--qui-taskbar-bg);
  border-top: var(--qui-taskbar-border);
}

.start-btn {
  padding: 0.5rem 1rem;
  background: var(--qui-accent-color);
  border: none;
  color: var(--qui-text-primary);
  cursor: pointer;
}

.window-list {
  display: flex;
  gap: 4px;
}

.window-list button {
  padding: 0.5rem 1rem;
  background: var(--qui-taskbar-button-bg);
  border: var(--qui-window-border);
  color: var(--qui-text-primary);
  cursor: pointer;
}

.window-list button:hover {
  background: var(--qui-taskbar-button-hover);
}

.window-list button.active {
  background: var(--qui-taskbar-button-active);
}
</style>
