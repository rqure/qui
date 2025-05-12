<script setup lang="ts">
import { defineComponent, markRaw } from 'vue'
import { useWindowStore } from '@/stores/windows'
import { useAuthStore } from '@/stores/auth'

const emit = defineEmits<{
  (e: 'close'): void
}>()

const windowStore = useWindowStore()
const authStore = useAuthStore()

// Define some test apps
const testApps = [
  {
    id: 'notepad',
    name: 'Notepad',
    icon: '📝',
    component: markRaw(
      defineComponent({
        template: '<div class="p-4">Notepad Content</div>',
      }),
    ),
  },
  {
    id: 'calculator',
    name: 'Calculator',
    icon: '🔢',
    component: markRaw(
      defineComponent({
        template: '<div class="p-4">Calculator Content</div>',
      }),
    ),
  },
  {
    id: 'settings',
    name: 'Settings',
    icon: '⚙️',
    component: markRaw(
      defineComponent({
        template: '<div class="p-4">Settings Content</div>',
      }),
    ),
  },
  {
    id: 'terminal',
    name: 'Terminal',
    icon: '💻',
    component: markRaw(
      defineComponent({
        template: '<div class="p-4">Terminal Content</div>',
      }),
    ),
  },
]

const sections = [
  {
    title: 'Applications',
    items: testApps,
  },
]

const launchApp = (app: (typeof testApps)[0]) => {
  windowStore.createWindow({
    title: app.name,
    component: app.component,
    width: 400,
    height: 300,
  })
  emit('close')
}

const handleLogout = async () => {
  try {
    await authStore.logout()
    // After logout, you might want to redirect or refresh the page
    window.location.reload()
  } catch (error) {
    console.error('Logout failed:', error)
  }
  emit('close')
}
</script>

<template>
  <div class="start-menu">
    <div v-for="section in sections" :key="section.title" class="menu-section">
      <div class="section-title">{{ section.title }}</div>
      <div class="menu-list">
        <button
          v-for="app in section.items"
          :key="app.id"
          class="menu-item"
          @click="launchApp(app)"
        >
          <span class="item-icon">{{ app.icon }}</span>
          <span class="item-name">{{ app.name }}</span>
        </button>
      </div>
    </div>
    
    <!-- Separator -->
    <div class="menu-separator"></div>
    
    <!-- User section with logout -->
    <div class="menu-section user-section">
      <div class="menu-list">
        <button class="menu-item logout-button" @click="handleLogout">
          <span class="item-icon logout-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M16 17v-3H9v-4h7V7l5 5-5 5M14 2a2 2 0 012 2v2h-2V4H5v16h9v-2h2v2a2 2 0 01-2 2H5a2 2 0 01-2-2V4a2 2 0 012-2h9z" />
            </svg>
          </span>
          <span class="item-name">Logout</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.start-menu {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 0;
  width: 280px;
  background: var(--qui-gradient-primary);
  backdrop-filter: blur(var(--qui-backdrop-blur));
  border: 1px solid rgba(var(--qui-accent-color), var(--qui-border-opacity));
  border-radius: var(--qui-menu-radius);
  box-shadow: var(--qui-shadow-menu);
  overflow: hidden;
  padding: 6px;
}

.menu-section {
  padding: 4px 0;
}

.section-title {
  padding: 6px 12px;
  font-size: var(--qui-font-size-small);
  font-weight: var(--qui-font-weight-medium);
  color: var(--qui-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.menu-list {
  display: flex;
  flex-direction: column;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border: none;
  background: transparent;
  color: var(--qui-text-primary);
  cursor: pointer;
  border-radius: var(--qui-menu-item-radius);
  transition: all 0.2s var(--qui-animation-bounce);
  text-align: left;
  width: 100%;
}

.menu-item:hover {
  background: var(--qui-menu-item-hover);
}

.item-icon {
  font-size: 18px;
  opacity: 0.9;
}

.item-name {
  font-size: var(--qui-font-size-base);
  font-weight: var(--qui-font-weight-normal);
}

.menu-separator {
  height: 1px;
  background: var(--qui-menu-separator);
  margin: 4px 8px;
  opacity: 0.5;
}

.user-section {
  margin-top: 4px;
}

.logout-button {
  color: var(--qui-danger-text, #ff4444);
}

.logout-button:hover {
  background: var(--qui-danger-bg, rgba(255, 68, 68, 0.1));
}

.logout-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  /* Remove the rotation that was applied to the emoji */
  transform: none;
}

/* Add animation to the logout icon */
.logout-button:hover .logout-icon svg {
  transform: translateX(2px);
}

.logout-icon svg {
  transition: transform 0.2s var(--qui-animation-bounce);
}
</style>
