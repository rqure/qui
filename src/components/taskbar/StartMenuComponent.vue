<script setup lang="ts">
import { useAppStore } from '@/stores/apps'

const emit = defineEmits<{
  (e: 'create-window'): void
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
    <div class="menu-section">
      <div class="section-title">System</div>
      <div class="menu-item" @click="$emit('create-window')">New Window</div>
      <div class="menu-item" @click="$emit('close')">Close Menu</div>
    </div>

    <div v-if="appStore.registeredApps.size > 0" class="menu-section">
      <div class="section-title">Applications</div>
      <div
        v-for="[id, app] in appStore.registeredApps"
        :key="id"
        class="menu-item"
        @click="launchApp(id)"
      >
        <img v-if="app.manifest.icon" :src="app.manifest.icon" class="app-icon" />
        <span>{{ app.manifest.name }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.start-menu {
  position: absolute;
  bottom: 100%;
  left: 0;
  width: 240px;
  background: var(--qui-bg-secondary);
  border: var(--qui-window-border);
  border-radius: 8px;
  padding: 0.5rem;
}

.menu-section {
  margin-bottom: 0.5rem;
}

.section-title {
  padding: 0.25rem 1rem;
  color: var(--qui-text-secondary);
  font-size: 0.8em;
  text-transform: uppercase;
}

.menu-item {
  padding: 0.5rem 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
}

.menu-item:hover {
  background: var(--qui-accent-color);
  color: white;
}

.app-icon {
  width: 16px;
  height: 16px;
}
</style>
