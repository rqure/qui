<script setup lang="ts">
import { ref, onMounted } from 'vue'
import QeiLogo from '@/components/common/QeiLogo.vue'
import { useAuthStore } from '@/stores/auth'

const emit = defineEmits<{
  (e: 'login', username: string): void
}>()

const authStore = useAuthStore()
const isLoading = ref(false)
const error = ref('')

// Extract token from URL if it's a callback from Keycloak
const checkAuthenticationCallback = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  const sessionState = urlParams.get('session_state');
  
  // If we have code and session_state, we might be in an OAuth callback
  if (code && sessionState) {
    isLoading.value = true;
    return true;
  }
  return false;
}

onMounted(async () => {
  isLoading.value = true;
  const isCallback = checkAuthenticationCallback();
  
  try {
    // Try to initialize Keycloak and check if already authenticated
    const isAuthenticated = await authStore.initializeAuth();
    if (isAuthenticated) {
      emit('login', authStore.username);
    } else if (isCallback) {
      // If we were redirected but not authenticated, show error
      error.value = 'Authentication failed. Please try again.';
    }
    
    // Clean up URL if we came from a callback
    if (isCallback) {
      // Remove query parameters without reloading the page
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  } catch (err) {
    error.value = 'Failed to initialize authentication. Please try again.';
    console.error(err);
  } finally {
    isLoading.value = false;
  }
})

const handleSubmit = async () => {
  // Use Keycloak SSO
  isLoading.value = true
  error.value = ''
  
  try {
    await authStore.login()
    // Note: If successful, page will redirect to Keycloak
  } catch (err) {
    error.value = 'Authentication failed. Please try again.'
    console.error(err)
    isLoading.value = false
  }
}
</script>

<template>
  <div class="login-screen">
    <div class="login-box">
      <QeiLogo size="large" class="login-logo" />
      
      <div v-if="isLoading" class="loading-indicator">
        <span class="loading-spinner"></span>
        <p>Initializing authentication...</p>
      </div>
      
      <form v-else class="login-form" @submit.prevent="handleSubmit">
        <h2>Welcome to QUI</h2>
        
        <div v-if="error" class="error-message">{{ error }}</div>
        
        <!-- SSO login button -->
        <button type="submit" class="login-button">
          Sign in with SSO
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.login-screen {
  height: 100vh;
  background: var(--qui-login-bg);
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-box {
  width: 100%;
  max-width: 400px;
  background: var(--qui-login-box-bg);
  backdrop-filter: blur(var(--qui-backdrop-blur));
  border: var(--qui-login-box-border);
  border-radius: 12px;
  padding: 2rem;
  box-shadow: var(--qui-login-box-shadow);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
}

.login-logo {
  margin-bottom: 1rem;
}

.login-form {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

h2 {
  color: var(--qui-text-primary);
  margin-bottom: 1.5rem;
  font-weight: var(--qui-font-weight-bold);
  font-size: var(--qui-font-size-large);
}

.login-button {
  display: block;
  width: 100%;
  padding: 0.8rem;
  background: var(--qui-accent-color);
  background-image: linear-gradient(135deg, var(--qui-accent-color), var(--qui-accent-secondary));
  border: none;
  border-radius: var(--qui-menu-radius);
  color: var(--qui-bg-primary);
  cursor: pointer;
  font-weight: var(--qui-font-weight-bold);
  font-size: var(--qui-font-size-large);
  box-shadow: var(--qui-shadow-accent);
  transition: all var(--qui-transition-speed) var(--qui-animation-bounce);
  position: relative;
  overflow: hidden;
}

.login-button:hover {
  transform: var(--qui-hover-lift);
  box-shadow: var(--qui-shadow-accent-strong);
  background-image: linear-gradient(135deg, var(--qui-accent-secondary), var(--qui-accent-color));
}

.login-button:active {
  transform: var(--qui-active-scale);
  box-shadow: var(--qui-shadow-active);
}

.login-button::after {
  content: "";
  position: absolute;
  top: 0;
  left: -100%;
  width: 200%;
  height: 100%;
  background-image: var(--qui-shine-effect);
  animation: shine var(--qui-shine-speed) infinite;
  pointer-events: none;
}

.error-message {
  color: var(--qui-danger-text, #ff4444);
  margin-bottom: 1rem;
  font-size: var(--qui-font-size-small);
}

.loading-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: var(--qui-text-secondary);
}

.loading-spinner {
  display: inline-block;
  width: 30px;
  height: 30px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: var(--qui-accent-primary, #0066cc);
  animation: spin 1s ease-in-out infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes shine {
  from { left: -100%; }
  to { left: 100%; }
}
</style>
