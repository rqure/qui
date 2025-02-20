<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import ThemeProvider from './core/theme/ThemeProvider.vue'
import WebtopLogin from './components/WebtopLogin.vue'
import WorkspaceComponent from './components/workspace/WorkspaceComponent.vue'
import TaskbarComponent from './components/taskbar/TaskbarComponent.vue'

const auth = useAuthStore()

const handleLogin = (user: string) => {
  auth.login(user)
}
</script>

<template>
  <ThemeProvider>
    <WebtopLogin v-if="!auth.isAuthenticated" @login="handleLogin" />
    <div v-else class="webtop">
      <WorkspaceComponent />
      <div class="taskbar-container">
        <TaskbarComponent />
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
</style>
