import Keycloak from 'keycloak-js'
import { ref } from 'vue'
import keycloakConfig from './keycloak-config'

// Singleton instance of Keycloak
let keycloakInstance: Keycloak | null = null

// Status tracking
const initialized = ref(false)
const authenticated = ref(false)

/**
 * Initialize Keycloak with configuration
 */
export async function initKeycloak(config = keycloakConfig) {
  if (keycloakInstance) {
    return keycloakInstance
  }

  try {
    keycloakInstance = new Keycloak({
      url: config.url,
      realm: config.realm,
      clientId: config.clientId
    })

    await keycloakInstance.init({
      onLoad: 'check-sso',
      pkceMethod: 'S256',
      enableLogging: true,
    })

    initialized.value = true
    authenticated.value = keycloakInstance.authenticated || false
    
    // Setup refresh token mechanism
    if (authenticated.value) {
      setupTokenRefresh()
    }

    return keycloakInstance
  } catch (error) {
    console.error('Failed to initialize Keycloak:', error)
    throw error
  }
}

/**
 * Get the Keycloak instance
 */
export function getKeycloak() {
  if (!keycloakInstance) {
    throw new Error('Keycloak has not been initialized. Call initKeycloak first.')
  }
  return keycloakInstance
}

/**
 * Login using Keycloak - direct redirect approach
 * @param idpHint Optional identity provider hint for social logins
 */
export async function login(idpHint?: string) {
  const keycloak = getKeycloak()
  
  const options: Keycloak.KeycloakLoginOptions = {
    redirectUri: window.location.origin + window.location.pathname,
    prompt: 'login' // Always show the login screen
  }
  
  // If idpHint is provided, add it to the options
  if (idpHint) {
    options.idpHint = idpHint
  }
  
  return keycloak.login(options)
}

/**
 * Logout from Keycloak
 */
export async function logout() {
  const keycloak = getKeycloak()
  return keycloak.logout({
    redirectUri: window.location.origin
  })
}

/**
 * Get user profile from Keycloak
 */
export async function getUserProfile() {
  const keycloak = getKeycloak()
  if (!keycloak.authenticated) {
    return null
  }
  return keycloak.loadUserProfile()
}

/**
 * Set up automatic token refresh
 */
function setupTokenRefresh() {
  if (!keycloakInstance) return
  
  // Update token 30 seconds before expiry
  setInterval(() => {
    keycloakInstance?.updateToken(30)
      .catch(() => {
        // If token refresh fails, force re-login
        authenticated.value = false
      })
  }, 60000) // Check every minute
}

/**
 * Get the current state of Keycloak authentication
 */
export function useKeycloakState() {
  return {
    initialized,
    authenticated,
    keycloak: keycloakInstance
  }
}

/**
 * Check if current URL contains Keycloak callback parameters
 */
export function hasKeycloakCallbackParams(): boolean {
  const urlParams = new URLSearchParams(window.location.search)
  return urlParams.has('code') && urlParams.has('session_state')
}