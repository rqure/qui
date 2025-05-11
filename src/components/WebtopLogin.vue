<script setup lang="ts">
import { ref, onMounted } from 'vue'
import QeiLogo from '@/components/common/QeiLogo.vue'
import { useAuthStore } from '@/stores/auth'

const emit = defineEmits<{
  (e: 'login', username: string): void
}>()

const username = ref('')
const authStore = useAuthStore()
const isLoading = ref(false)
const error = ref('')
const isDevelopmentMode = ref(false)

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
  if (isDevelopmentMode.value && username.value.trim()) {
    // Development mode - use username directly
    emit('login', username.value.trim())
    return
  }
  
  // Production mode - use Keycloak SSO
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

const toggleDevMode = () => {
  isDevelopmentMode.value = !isDevelopmentMode.value
  error.value = ''
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
        
        <!-- Development mode input field -->
        <template v-if="isDevelopmentMode">
          <input
            v-model="username"
            type="text"
            placeholder="Enter your username"
            class="login-input"
            autocomplete="username"
          />
          <button type="submit" class="login-button">Login</button>
        </template>
        
        <!-- SSO login button -->
        <template v-else>
          <button type="submit" class="login-button sso-button">
            Sign in with SSO
          </button>
        </template>
        
        <div class="dev-toggle">
          <label>
            <input type="checkbox" v-model="isDevelopmentMode" @change="toggleDevMode">
            Development mode
          </label>
        </div>
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

input {
  display: block;
  margin: 1rem 0;
  padding: 0.5rem;
  width: 100%;
  background: var(--qui-login-input-bg);
  border: var(--qui-login-input-border);
  color: var(--qui-text-primary);
  border-radius: 4px;
  font-size: var(--qui-font-size-base);
  font-family: var(--qui-font-family);
}

button {
  display: block;
  width: 100%;
  padding: 0.5rem;
  background: var(--qui-login-button-bg);
  border: none;
  border-radius: 4px;
  color: var(--qui-login-button-text);
  cursor: pointer;
  font-weight: var(--qui-font-weight-medium);
  font-size: var(--qui-font-size-base);
}

.sso-button {
  padding: 0.7rem;
  font-size: var(--qui-font-size-large);
  background: var(--qui-login-button-accent, #0066cc);
}

button:hover {
  background: var(--qui-login-button-hover);
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

.dev-toggle {
  margin-top: 1.5rem;
  font-size: var(--qui-font-size-small);
  color: var(--qui-text-secondary);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
