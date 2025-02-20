<script setup lang="ts">
import { useAppStore } from '@/stores/apps'
import QeiLogo from '@/components/common/QeiLogo.vue'

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
    <div class="menu-header">
      <QeiLogo size="large" />
    </div>
  </div>
</template>

<style scoped>
.start-menu {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 0;
  width: var(--qui-startmenu-width);
  background: var(--qui-gradient-primary);
  backdrop-filter: blur(var(--qui-backdrop-blur));
  border: 1px solid rgba(var(--qui-accent-color), var(--qui-border-opacity));
  border-radius: 12px;
  box-shadow: var(--qui-shadow-glow) rgba(0, 255, 136, var(--qui-shadow-opacity));
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.menu-header {
  padding: 16px;
  background: var(--qui-gradient-secondary);
  border-bottom: var(--qui-menu-separator);
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
