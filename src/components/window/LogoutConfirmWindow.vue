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
    <div class="logout-icon">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48">
        <path fill="currentColor" d="M16 17v-3H9v-4h7V7l5 5-5 5M14 2a2 2 0 012 2v2h-2V4H5v16h9v-2h2v2a2 2 0 01-2 2H5a2 2 0 01-2-2V4a2 2 0 012-2h9z" />
      </svg>
    </div>
    <h2 class="confirm-title">Confirm Logout</h2>
    <p class="confirm-message">Are you sure you want to log out of the system?</p>
    
    <div class="button-container">
      <button class="cancel-button" @click="handleCancel">Cancel</button>
      <button class="confirm-button" @click="handleConfirm">Logout</button>
    </div>
  </div>
</template>

<style scoped>
.logout-confirm-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  height: 100%;
}

.logout-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  background: var(--qui-danger-bg, rgba(255, 68, 68, 0.1));
  border-radius: 50%;
  margin-bottom: 16px;
  color: var(--qui-danger-text, #ff4444);
}

.confirm-title {
  font-size: var(--qui-font-size-large);
  font-weight: var(--qui-font-weight-bold);
  margin-bottom: 8px;
  text-align: center;
}

.confirm-message {
  font-size: var(--qui-font-size-base);
  color: var(--qui-text-secondary);
  text-align: center;
  margin-bottom: 24px;
}

.button-container {
  display: flex;
  gap: 16px;
}

button {
  padding: 10px 20px;
  border-radius: var(--qui-menu-item-radius);
  border: none;
  font-weight: var(--qui-font-weight-medium);
  cursor: pointer;
  transition: all 0.2s var(--qui-animation-bounce);
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
</style>
