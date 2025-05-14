<script setup lang="ts">
import { defineComponent, markRaw, computed } from 'vue'
import { useWindowStore } from '@/stores/windows'
import { useAuthStore } from '@/stores/auth'
import LogoutConfirmWindow from '@/components/window/LogoutConfirmWindow.vue'
import { logoutIconDataUrl } from '@/assets/logout-icon'
import databaseBrowserApp from '@/apps/database-browser'

const emit = defineEmits<{
  (e: 'close'): void
}>()

const windowStore = useWindowStore()
const authStore = useAuthStore()

// Computed properties for user information
const username = computed(() => authStore.username || 'Guest')
const userInitial = computed(() => (username.value ? username.value.charAt(0).toUpperCase() : 'G'))
const userProfile = computed(() => authStore.userProfile)

// Define apps with our new Database Browser app
const testApps = [
  {
    id: 'database-browser',
    name: 'Database Browser',
    icon: databaseBrowserApp.manifest.icon || '📊',
    component: databaseBrowserApp.component,
  },
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

// Fix the app launching function to close menu first
const launchApp = (app: (typeof testApps)[0]) => {
  // First close the menu
  emit('close')
  
  // Then create the window with a slight delay to prevent UI issues
  setTimeout(() => {
    windowStore.createWindow({
      title: app.name,
      component: app.component,
      width: 400,
      height: 400,
    })
  }, 10)
}

// Fix the logout window creation with proper size and icon
const initiateLogout = () => {
  // First close the menu
  emit('close')
  
  // Create a unique ID each time to prevent conflicts
  const logoutWindowId = 'logout-confirm-window-' + Date.now()
  
  // Then create the window with a slight delay
  setTimeout(() => {
    windowStore.createWindow({
      id: logoutWindowId,
      title: 'Confirm Sign Out',
      component: markRaw(LogoutConfirmWindow),
      width: 400,  // Slightly narrower
      height: 200, // Shorter height to fit content perfectly
      icon: logoutIconDataUrl, // Use the logout icon
      props: {
        windowId: logoutWindowId
      }
    })
  }, 10)
}
</script>

<template>
  <div class="start-menu">
    <!-- User Profile Section -->
    <div class="user-profile-section">
      <div class="user-avatar" :data-initial="userInitial">
        <img 
          v-if="userProfile?.avatar" 
          :src="userProfile.avatar" 
          alt="User avatar"
        />
      </div>
      <div class="user-info">
        <div class="username">{{ username }}</div>
        <div class="user-status">{{ userProfile?.email || 'Signed in' }}</div>
      </div>
    </div>
    
    <!-- Menu separator after user profile -->
    <div class="menu-separator"></div>

    <!-- Applications section -->
    <div v-for="section in sections" :key="section.title" class="menu-section">
      <div class="section-title">{{ section.title }}</div>
      <div class="menu-list">
        <button
          v-for="app in section.items"
          :key="app.id"
          class="menu-item"
          @click="launchApp(app)"
        >
          <span class="item-icon">
            <!-- Render SVG as image if it's a data URL, otherwise render as text emoji -->
            <img v-if="typeof app.icon === 'string' && app.icon.startsWith('data:')" 
                 :src="app.icon" 
                 :alt="app.name"
                 class="app-icon" />
            <span v-else>{{ app.icon }}</span>
          </span>
          <span class="item-name">{{ app.name }}</span>
        </button>
      </div>
    </div>
    
    <!-- Bottom separator -->
    <div class="menu-separator"></div>
    
    <!-- User actions with logout -->
    <div class="menu-section user-section">
      <div class="menu-list">
        <button class="menu-item logout-button" @click="initiateLogout">
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

/* User profile section styles */
.user-profile-section {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: var(--qui-menu-item-radius);
  transition: background 0.2s var(--qui-animation-bounce);
}

.user-profile-section:hover {
  background: var(--qui-menu-item-hover);
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--qui-accent-color), var(--qui-accent-secondary));
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--qui-bg-primary);
  font-weight: var(--qui-font-weight-bold);
  font-size: 18px;
  position: relative;
  overflow: hidden;
}

.user-avatar::before {
  content: attr(data-initial);
  position: absolute;
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.user-info {
  display: flex;
  flex-direction: column;
  justify-content: center;
  overflow: hidden;
}

.username {
  font-weight: var(--qui-font-weight-medium);
  font-size: var(--qui-font-size-base);
  color: var(--qui-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-status {
  font-size: var(--qui-font-size-small);
  color: var(--qui-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.app-icon {
  width: 20px;
  height: 20px;
  object-fit: contain;
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
