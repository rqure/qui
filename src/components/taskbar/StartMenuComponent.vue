<script setup lang="ts">
import { useAppStore } from '@/stores/apps'

const emit = defineEmits<{
  (e: 'close'): void
}>()

const appStore = useAppStore()

const launchApp = (appId: string) => {
  appStore.launchApp(appId)
  emit('close')
}
</script>

<template>
  <div class="start-menu">
    <div
      v-for="[id, app] in appStore.registeredApps"
      :key="id"
      class="menu-item"
      @click="launchApp(id)"
    >
      <img v-if="app.manifest.icon" :src="app.manifest.icon" class="app-icon" />
      {{ app.manifest.name }}
    </div>
  </div>
</template>

<style scoped>
.start-menu {
  position: absolute;
  bottom: 100%;
  left: 0;
  width: 200px;
  background: var(--qui-bg-secondary);
  border: var(--qui-window-border);
  border-radius: 8px;
  padding: 0.5rem;
}

.menu-item {
  padding: 0.5rem 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
}

.menu-item:hover {
  background: var(--qui-accent-color);
  color: white;
}

.app-icon {
  width: 16px;
  height: 16px;
  margin-right: 8px;
}
</style>
