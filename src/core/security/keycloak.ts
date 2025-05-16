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
      // Remove silent check since it uses iframes which are blocked by CSP
      silentCheckSsoRedirectUri: undefined,
      checkLoginIframe: false, // Disable iframe checks to avoid CSP issues
      pkceMethod: 'S256', // Use PKCE for more secure auth flow
      enableLogging: true
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
 * Login using Keycloak
 * @param idpHint Optional identity provider hint for social logins
 */
export async function login(idpHint?: string) {
  const keycloak = getKeycloak()
  
  const options: Keycloak.KeycloakLoginOptions = {
    redirectUri: window.location.origin
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