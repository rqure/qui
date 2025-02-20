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
    <div class="menu-header">
      <div class="user-info">
        <div class="user-avatar">
          <svg viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z"
            />
          </svg>
        </div>
        <div class="user-name">User</div>
      </div>
    </div>

    <div class="menu-content">
      <div class="menu-section">
        <div class="section-title">System</div>
        <div class="menu-item" @click="$emit('create-window')">
          <span class="item-icon">+</span>
          <span>New Window</span>
        </div>
        <div class="menu-item" @click="$emit('close')">
          <span class="item-icon">×</span>
          <span>Close Menu</span>
        </div>
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

    <div class="menu-footer">
      <button class="power-button">
        <svg viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M16.56,5.44L15.11,6.89C16.84,7.94 18,9.83 18,12A6,6 0 0,1 12,18A6,6 0 0,1 6,12C6,9.83 7.16,7.94 8.88,6.88L7.44,5.44C5.36,6.88 4,9.28 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12C20,9.28 18.64,6.88 16.56,5.44M13,3H11V13H13"
          />
        </svg>
        <span>Power</span>
      </button>
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
  backdrop-filter: blur(12px);
  border: 1px solid rgba(0, 255, 136, 0.2);
  border-radius: 12px;
  box-shadow: 0 0 30px rgba(0, 255, 136, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.menu-header {
  padding: 16px;
  background: var(--qui-gradient-secondary);
  border-bottom: 1px solid rgba(0, 255, 136, 0.2);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(0, 255, 136, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--qui-accent-color);
}

.user-name {
  font-weight: var(--qui-font-weight-medium);
  font-size: var(--qui-font-size-base);
  color: var(--qui-text-primary);
}

.menu-content {
  flex: 1;
  padding: 8px;
  max-height: 480px;
  overflow-y: auto;
}

.menu-section {
  margin-bottom: 12px;
}

.section-title {
  padding: 8px 12px 4px;
  color: var(--qui-accent-color);
  font-size: var(--qui-font-size-small);
  text-transform: uppercase;
  letter-spacing: 1px;
  font-weight: var(--qui-font-weight-bold);
}

.menu-item {
  padding: 8px 12px;
  margin: 2px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
  border-radius: 8px;
  transition: all 0.2s var(--qui-animation-bounce);
  font-size: var(--qui-font-size-base);
  color: var(--qui-text-primary);
}

.menu-item:hover {
  background: var(--qui-gradient-secondary);
  transform: translateX(4px);
}

.item-icon {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  color: var(--qui-accent-color);
}

.app-icon {
  width: 20px;
  height: 20px;
  filter: drop-shadow(0 0 4px rgba(0, 255, 136, 0.4));
}

.menu-footer {
  padding: 12px;
  border-top: 1px solid rgba(0, 255, 136, 0.2);
}

.power-button {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(255, 68, 68, 0.1);
  border: 1px solid var(--qui-accent-secondary);
  border-radius: 8px;
  color: var(--qui-accent-secondary);
  cursor: pointer;
  transition: all 0.2s;
  font-size: var(--qui-font-size-base);
  font-weight: var(--qui-font-weight-medium);
}

.power-button:hover {
  background: rgba(255, 68, 68, 0.2);
  border-color: rgba(255, 68, 68, 0.3);
}

.power-button svg {
  width: 20px;
  height: 20px;
}
</style>
