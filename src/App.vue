<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useDataStore } from '@/stores/data'
import ThemeProvider from './core/theme/ThemeProvider.vue'
import WebtopLogin from './components/WebtopLogin.vue'
import WorkspaceComponent from './components/workspace/WorkspaceComponent.vue'
import TaskbarComponent from './components/taskbar/TaskbarComponent.vue'
import ContextMenuComponent from './components/menu/ContextMenuComponent.vue'
import { useMenuStore } from '@/stores/menu'

const auth = useAuthStore()
const dataStore = useDataStore()
const menuStore = useMenuStore()
const showConnectionLostMessage = ref(false)

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

// Monitor for connection loss during session
onMounted(() => {
  dataStore.onConnectionLost(() => {
    showConnectionLostMessage.value = true
    setTimeout(() => {
      showConnectionLostMessage.value = false
    }, 5000) // Hide after 5 seconds
  })
})
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
      
      <!-- Connection lost notification -->
      <div v-if="showConnectionLostMessage" class="connection-lost-message">
        <div class="message-content">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
            <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
          <span>Connection to the database was lost. You have been logged out.</span>
        </div>
      </div>
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

.connection-lost-message {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  background: var(--qui-danger-bg);
  color: var(--qui-text-primary);
  padding: 12px 24px;
  border-radius: 8px;
  box-shadow: var(--qui-shadow-default);
  border: 1px solid var(--qui-danger-border);
  animation: slideDown 0.3s ease-out;
  max-width: 80%;
}

.message-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.message-content svg {
  color: var(--qui-danger-color);
  flex-shrink: 0;
}

@keyframes slideDown {
  from { transform: translate(-50%, -50px); opacity: 0; }
  to { transform: translate(-50%, 0); opacity: 1; }
}
</style>
