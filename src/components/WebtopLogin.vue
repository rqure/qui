<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import QeiLogo from '@/components/common/QeiLogo.vue'
import LoadingIndicator from '@/components/common/LoadingIndicator.vue'
import { useAuthStore } from '@/stores/auth'

const emit = defineEmits<{
  (e: 'login', username: string): void
}>()

const authStore = useAuthStore()
const isLoading = ref(false)
const error = ref('')
const username = ref('')
const password = ref('')
const loginMethod = ref('password') // 'password', 'sso', 'google', 'microsoft'
const isRecovering = ref(false)
const ssoAvailable = ref(true) // Will be set based on Keycloak initialization
const isKeycloakCallback = ref(false)

onMounted(async () => {
  isLoading.value = true;
  isRecovering.value = true;
  
  try {
    // Set up auth providers and check if already authenticated
    const isAuthenticated = await checkAuthentication();
    
    // Update SSO availability status based on Keycloak provider
    ssoAvailable.value = !!authStore.authProviders?.keycloak;
    
    if (isAuthenticated) {
      emit('login', authStore.username);
    } else if (isKeycloakCallback.value) {
      // If we were redirected but not authenticated, show error
      error.value = 'SSO authentication failed. Please try again.';
      
      // Remove callback params from URL without reloading
      const url = new URL(window.location.href);
      url.search = '';
      window.history.replaceState({}, document.title, url.toString());
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    error.value = 'Failed to initialize authentication. Please try again.';
    console.error('Authentication initialization error:', errorMessage);
    
    // If SSO initialization specifically failed, update UI accordingly
    if (errorMessage.includes('SSO')) {
      ssoAvailable.value = false;
      loginMethod.value = 'password'; // Fall back to password auth
    }
  } finally {
    isLoading.value = false;
    isRecovering.value = false;
  }
})

// Function to check authentication status
const checkAuthentication = async () => {
  try {
    const isAuthenticated = await authStore.initializeAuth();
    return isAuthenticated;
  } catch (error) {
    console.error('Error checking authentication:', error);
    return false;
  }
}

const handleSubmit = async () => {
  isLoading.value = true
  error.value = ''
  
  try {
    if (loginMethod.value === 'password') {
      // Username/password login with timeout
      if (!username.value || !password.value) {
        error.value = 'Please enter both username and password'
        isLoading.value = false
        return
      }
      
      // Set up a 5-second timeout for the login request
      const loginPromise = authStore.loginWithCredentials(username.value, password.value)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Login timed out after 5 seconds')), 5000)
      })
      
      try {
        // Race the login promise against the timeout
        await Promise.race([loginPromise, timeoutPromise])
        emit('login', username.value)
      } catch (err) {
        // Handle specific error messages from the auth endpoint
        const errorMessage = err instanceof Error ? err.message : 'Authentication failed'
        error.value = errorMessage.includes('timed out') ? 
          'Connection timed out. Please try again later.' : errorMessage
        throw err
      }
    } else if (loginMethod.value === 'sso') {
      // Check if SSO is available first
      if (!ssoAvailable.value) {
        error.value = 'SSO login is not available. Please use another login method.'
        isLoading.value = false
        return
      }
      
      // Redirect to Keycloak SSO - no need for timeout since it's a redirect
      try {
        await authStore.login();
        // The page will redirect to Keycloak, so we won't reach here
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Authentication failed'
        error.value = errorMessage;
        
        // If SSO is not available, update the UI
        if (errorMessage.includes('SSO')) {
          ssoAvailable.value = false;
          loginMethod.value = 'password'; // Fall back to password auth
        }
        throw err
      }
    } else {
      // Social login (Google, Microsoft, etc.) - also a redirect
      try {
        await authStore.loginWithProvider(loginMethod.value)
        // Will redirect to the provider's auth page
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Authentication failed'
        error.value = errorMessage;
        throw err
      }
    }
  } catch (err) {
    console.error(err)
    if (!error.value) {
      error.value = 'Authentication failed. Please try again.'
    }
  } finally {
    isLoading.value = false
  }
}

const selectLoginMethod = (method: string) => {
  // Only allow selecting SSO if it's available
  if (method === 'sso' && !ssoAvailable.value) {
    error.value = 'SSO login is not available. Please use another login method.';
    return;
  }
  
  loginMethod.value = method
  error.value = '' // Clear errors when changing methods
}
</script>

<template>
  <div class="login-screen">
    <div class="login-box">
      <QeiLogo size="large" class="login-logo" />
      
      <LoadingIndicator 
        v-if="isLoading" 
        :message="isRecovering ? 'Checking for saved session...' : 'Authenticating...'" 
      />
      
      <form v-else class="login-form" @submit.prevent="handleSubmit">
        <div v-if="error" class="error-message">{{ error }}</div>
        
        <!-- Username/password login form -->
        <div v-if="loginMethod === 'password'" class="credentials-form">
          <input
            v-model="username"
            type="text"
            placeholder="Username"
            class="login-input"
            autocomplete="username"
          />
          <input
            v-model="password"
            type="password"
            placeholder="Password"
            class="login-input"
            autocomplete="current-password"
          />
          <button type="submit" class="login-button">
            Sign in
          </button>
        </div>
        
        <!-- SSO login button (when SSO is selected) -->
        <button 
          v-else-if="loginMethod === 'sso'" 
          type="submit" 
          class="login-button sso-button"
          :disabled="!ssoAvailable"
        >
          Sign in with SSO
        </button>
        
        <!-- Provider-specific login buttons (when a provider is selected) -->
        <button 
          v-else 
          type="submit" 
          class="login-button"
          :class="`${loginMethod}-button`"
        >
          Continue with {{ loginMethod.charAt(0).toUpperCase() + loginMethod.slice(1) }}
        </button>
        
        <!-- Login method selector -->
        <div class="login-options">
          <div class="separator"><span>or sign in with</span></div>
          
          <div class="login-methods">
            <button 
              type="button" 
              class="icon-button password-icon" 
              :class="{ active: loginMethod === 'password' }"
              @click="selectLoginMethod('password')"
              title="Username & Password">
              <span class="visually-hidden">Username & Password</span>
            </button>
            
            <button 
              type="button" 
              class="icon-button sso-icon" 
              :class="{ active: loginMethod === 'sso', 'unavailable': !ssoAvailable }"
              @click="selectLoginMethod('sso')"
              :title="ssoAvailable ? 'Single Sign-On' : 'SSO Unavailable'"
              :disabled="!ssoAvailable">
              <span class="visually-hidden">Single Sign-On</span>
            </button>
            
            <button 
              type="button" 
              class="icon-button google-icon" 
              :class="{ active: loginMethod === 'google' }"
              @click="selectLoginMethod('google')"
              title="Google">
              <span class="visually-hidden">Google</span>
            </button>
            
            <button 
              type="button" 
              class="icon-button microsoft-icon" 
              :class="{ active: loginMethod === 'microsoft' }"
              @click="selectLoginMethod('microsoft')"
              title="Microsoft">
              <span class="visually-hidden">Microsoft</span>
            </button>
          </div>
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

.credentials-form {
  width: 100%;
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.login-input {
  display: block;
  width: 100%;
  margin-bottom: 1rem;
  padding: 0.8rem 1rem;
  background: var(--qui-login-input-bg);
  border: var(--qui-login-input-border);
  color: var(--qui-text-primary);
  border-radius: var(--qui-menu-radius);
  font-size: var(--qui-font-size-base);
  font-family: var(--qui-font-family);
  transition: border var(--qui-transition-speed) var(--qui-animation-bounce);
  box-sizing: border-box;
}

.login-input:focus {
  border-color: var(--qui-accent-color);
  outline: none;
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

/* Provider-specific buttons */
.google-button {
  background: #ffffff;
  background-image: none;
  color: #212121;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.microsoft-button {
  background: #2f2f2f;
  background-image: none;
  color: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.separator {
  width: 100%;
  text-align: center;
  border-bottom: 1px solid var(--qui-menu-separator);
  line-height: 0.1rem;
  margin: 1.5rem 0;
  position: relative;
}

.separator span {
  background: var(--qui-login-box-bg);
  padding: 0 10px;
  font-size: var(--qui-font-size-small);
  color: var(--qui-text-secondary);
}

.login-methods {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin: 1rem 0;
}

.icon-button {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 1px solid var(--qui-menu-separator);
  background-color: var(--qui-login-input-bg);
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: all var(--qui-transition-speed) var(--qui-animation-bounce);
  position: relative;
}

.icon-button::before {
  content: "";
  width: 24px;
  height: 24px;
  background-position: center;
  background-repeat: no-repeat;
  background-size: contain;
}

.icon-button.active {
  border-color: var(--qui-accent-color);
  box-shadow: var(--qui-glow-effect);
}

.icon-button:hover {
  transform: var(--qui-hover-scale);
  box-shadow: var(--qui-glow-effect);
}

.password-icon::before {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2300ff88'%3E%3Cpath d='M12 17a2 2 0 0 0 2-2 2 2 0 0 0-2-2 2 2 0 0 0-2 2 2 2 0 0 0 2 2m6-9a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2h1V6a5 5 0 0 1 5-5 5 5 0 0 1 5 5v2h1m-6-5a3 3 0 0 0-3 3v2h6V6a3 3 0 0 0-3-3z'/%3E%3C/svg%3E");
}

.sso-icon::before {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2300ff88'%3E%3Cpath d='M11 10h-6l3-4-3-4h6l3 4-3 4m5 10h6l-3-4 3-4h-6l-3 4 3 4z'/%3E%3C/svg%3E");
}

.google-icon::before {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%23EA4335' d='M12 11v2h5.64c-.56 2.67-3.1 4.09-5.8 3.56-2.5-.5-4.35-2.92-4.35-5.45 0-2.53 1.85-4.95 4.35-5.45 1.22-.25 2.47.07 3.5.8L16.9 5.02c-2.28-1.66-5.72-1.66-8 0-3.16 2.3-3.85 6.7-1.55 9.85 2.3 3.16 6.7 3.85 9.85 1.55.57-.4 1.05-.93 1.44-1.55.72-1.17 1.11-2.5 1.14-3.87H12z'/%3E%3Cpath fill='%23FBBC04' d='M5 11.55c-.33-1.39-.18-2.85.44-4.13L3.87 5.84c-1.22 2.43-1.22 5.41 0 7.84L5.44 12a7.1 7.1 0 0 1-.44-4.45z'/%3E%3Cpath fill='%233AA757' d='M12 16.93c1.4 0 2.74-.43 3.9-1.23l-1.93-1.93a4.01 4.01 0 0 1-6.08-.89L5.46 14.4a7.1 7.1 0 0 0 6.54 2.53z'/%3E%3Cpath fill='%234285F4' d='M20 11c0-.62-.05-1.23-.13-1.83H12v2h5.64c-.25 1.17-.89 2.21-1.8 2.93l1.93 1.93c1.73-1.59 2.23-4.12 2.23-5.03z'/%3E%3C/svg%3E");
}

.microsoft-icon::before {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%23F25022' d='M1 1h10v10H1V1z'/%3E%3Cpath fill='%2300A4EF' d='M1 13h10v10H1V13z'/%3E%3Cpath fill='%237FBA00' d='M13 1h10v10H13V1z'/%3E%3Cpath fill='%23FFB900' d='M13 13h10v10H13V13z'/%3E%3C/svg%3E");
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

.error-message {
  color: var(--qui-danger-text, #ff4444);
  margin-bottom: 1rem;
  font-size: var(--qui-font-size-small);
}

/* Remove custom loading spinner styles as they are now in the LoadingIndicator component */

@keyframes shine {
  from { left: -100%; }
  to { left: 100%; }
}

.icon-button.unavailable {
  opacity: 0.5;
  cursor: not-allowed;
  filter: grayscale(100%);
}

.icon-button.unavailable:hover {
  transform: none;
  box-shadow: none;
}
</style>
