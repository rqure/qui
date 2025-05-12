<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useWindowStore } from '@/stores/windows'

const authStore = useAuthStore()
const windowStore = useWindowStore()

// Get window id from the current component's instance
const props = defineProps({
  windowId: {
    type: String,
    required: true
  }
})

const handleCancel = () => {
  // Close this window using the provided windowId
  windowStore.closeWindow(props.windowId)
}

const handleConfirm = async () => {
  try {
    // Close the window first for better UX
    windowStore.closeWindow(props.windowId)
    
    // Execute logout
    await authStore.logout()
    
    // Reload the page after logout
    window.location.reload()
  } catch (error) {
    console.error('Logout failed:', error)
  }
}
</script>

<template>
  <div class="logout-confirm-container">
    <div class="logout-content">
      <div class="logout-icon-container">
        <div class="logout-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
            <path fill="currentColor" d="M16 17v-3H9v-4h7V7l5 5-5 5M14 2a2 2 0 012 2v2h-2V4H5v16h9v-2h2v2a2 2 0 01-2 2H5a2 2 0 01-2-2V4a2 2 0 012-2h9z" />
          </svg>
        </div>
      </div>
      
      <div class="confirm-content">
        <h2 class="confirm-title">Sign Out</h2>
        <p class="confirm-message">Are you sure you want to sign out of your account? Any unsaved changes may be lost.</p>
      </div>
    </div>
    
    <div class="button-container">
      <button class="cancel-button" @click="handleCancel">Cancel</button>
      <button class="confirm-button" @click="handleConfirm">Sign Out</button>
    </div>
  </div>
</template>

<style scoped>
.logout-confirm-container {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 20px;
  height: 100%;
  background: var(--qui-window-bg);
}

.logout-content {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.logout-icon-container {
  flex-shrink: 0;
}

.logout-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  background: var(--qui-danger-bg, rgba(255, 68, 68, 0.1));
  border-radius: 50%;
  color: var(--qui-danger-text, #ff4444);
  box-shadow: 0 2px 12px rgba(255, 68, 68, 0.15);
}

.confirm-content {
  flex-grow: 1;
}

.confirm-title {
  font-size: var(--qui-font-size-large);
  font-weight: var(--qui-font-weight-bold);
  margin-bottom: 8px;
  margin-top: 0;
  color: var(--qui-text-primary);
}

.confirm-message {
  font-size: var(--qui-font-size-base);
  color: var(--qui-text-secondary);
  margin-bottom: 0;
  line-height: 1.5;
}

.button-container {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

button {
  padding: 8px 16px;
  border-radius: var(--qui-menu-item-radius);
  border: none;
  font-weight: var(--qui-font-weight-medium);
  cursor: pointer;
  transition: all 0.2s var(--qui-animation-bounce);
  font-size: var(--qui-font-size-base);
}

.cancel-button {
  background: var(--qui-overlay-primary, rgba(255, 255, 255, 0.1));
  color: var(--qui-text-primary);
}

.cancel-button:hover {
  background: var(--qui-overlay-secondary, rgba(255, 255, 255, 0.2));
}

.confirm-button {
  background: var(--qui-danger-bg, rgba(255, 68, 68, 0.2));
  color: var(--qui-danger-text, #ff4444);
}

.confirm-button:hover {
  background: var(--qui-danger-bg-hover, rgba(255, 68, 68, 0.3));
}

/* Add subtle hover effects to buttons */
button:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

button:active {
  transform: translateY(1px);
}
</style>
