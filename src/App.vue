<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import ThemeProvider from './core/theme/ThemeProvider.vue'
import WebtopLogin from './components/WebtopLogin.vue'
import WorkspaceComponent from './components/workspace/WorkspaceComponent.vue'
import TaskbarComponent from './components/taskbar/TaskbarComponent.vue'
import ContextMenuComponent from './components/menu/ContextMenuComponent.vue'
import { useMenuStore } from '@/stores/menu'

const auth = useAuthStore()
const menuStore = useMenuStore()

const handleLogin = () => {
  auth.login()
}

const handleGlobalContextMenu = (e: MouseEvent) => {
  e.preventDefault()
  // Show empty menu when clicking on empty areas
  if (e.target === e.currentTarget) {
    menuStore.showMenu(
      { x: e.clientX, y: e.clientY },
      [
        { id: 'desktop-settings', label: 'Desktop Settings', action: () => {} },
        { id: 'refresh', label: 'Refresh', action: () => {} },
      ],
      { type: 'desktop' },
    )
  }
}
</script>

<template>
  <ThemeProvider>
    <WebtopLogin v-if="!auth.isAuthenticated" @login="handleLogin" />
    <div v-else class="webtop" @contextmenu="handleGlobalContextMenu">
      <WorkspaceComponent />
      <div class="taskbar-container">
        <TaskbarComponent />
      </div>
      <ContextMenuComponent />
    </div>
  </ThemeProvider>
</template>

<style>
body {
  margin: 0;
  color: var(--qui-text-primary);
}

.webtop {
  height: 100vh;
  background: var(--qui-bg-primary);
}

.taskbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 40px;
  background: var(--qui-bg-secondary);
  border-top: var(--qui-window-border);
  padding: 0 1rem;
  display: flex;
  align-items: center;
}

.taskbar-container {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 40px;
  background: var(--qui-bg-secondary);
  border-top: var(--qui-window-border);
  padding: 0 1rem;
}
</style>
