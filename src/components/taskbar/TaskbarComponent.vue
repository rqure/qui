<script setup lang="ts">
import { ref, defineComponent, markRaw } from 'vue'
import { useWindowStore } from '@/stores/windows'
import StartMenuComponent from './StartMenuComponent.vue'

const TestWindow = markRaw(
  defineComponent({
    name: 'TestWindow',
    template: '<div>Test Window Content</div>',
  }),
)

const windowStore = useWindowStore()
const isStartMenuOpen = ref(false)

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
</script>

<template>
  <div class="taskbar">
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
}

.start-btn {
  padding: 0.5rem 1rem;
  background: var(--qui-accent-color);
  border: none;
  color: white;
  cursor: pointer;
}

.window-list {
  display: flex;
  gap: 4px;
}

.window-list button {
  padding: 0.5rem 1rem;
  background: var(--qui-bg-primary);
  border: var(--qui-window-border);
  color: var(--qui-text-primary);
  cursor: pointer;
}
</style>
