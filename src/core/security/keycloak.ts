import Keycloak from 'keycloak-js'
import { ref } from 'vue'
import keycloakConfig from './keycloak-config'

// Singleton instance of Keycloak
let keycloakInstance: Keycloak | null = null

// Status tracking
const initialized = ref(false)
const authenticated = ref(false)

// Token refresh interval
let tokenRefreshInterval: number | null = null
const tokenRefreshIntervalMs = 30000 // Check every 30 seconds

// Event callbacks
const onTokenRefreshedCallbacks: Array<(token: string) => void> = []
const onTokenExpiredCallbacks: Array<() => void> = []

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

    // Set up event handlers before initialization
    keycloakInstance.onTokenExpired = () => {
      console.log('Token expired, attempting refresh')
      refreshToken(60)
        .then(refreshed => {
          if (!refreshed) {
            // If refresh fails, notify listeners
            onTokenExpiredCallbacks.forEach(callback => {
              try {
                callback()
              } catch (error) {
                console.error('Error in token expired callback:', error)
              }
            })
          }
        })
    }

    // Initialize Keycloak
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
 * Register a callback for when the token is refreshed
 */
export function onTokenRefreshed(callback: (token: string) => void): () => void {
  onTokenRefreshedCallbacks.push(callback)
  
  // Return a function to unregister
  return () => {
    const index = onTokenRefreshedCallbacks.indexOf(callback)
    if (index > -1) {
      onTokenRefreshedCallbacks.splice(index, 1)
    }
  }
}

/**
 * Register a callback for when the token expires and can't be refreshed
 */
export function onTokenExpired(callback: () => void): () => void {
  onTokenExpiredCallbacks.push(callback)
  
  // Return a function to unregister
  return () => {
    const index = onTokenExpiredCallbacks.indexOf(callback)
    if (index > -1) {
      onTokenExpiredCallbacks.splice(index, 1)
    }
  }
}

/**
 * Explicitly refresh the token
 */
export async function refreshToken(minValidity = 60): Promise<boolean> {
  try {
    if (!keycloakInstance) {
      console.warn('Keycloak not initialized')
      return false
    }

    const refreshed = await keycloakInstance.updateToken(minValidity)
    
    // Notify listeners when token is refreshed
    if (refreshed && keycloakInstance.token) {
      onTokenRefreshedCallbacks.forEach(callback => {
        try {
          callback(keycloakInstance!.token!)
        } catch (error) {
          console.error('Error in token refresh callback:', error)
        }
      })
    }
    
    return refreshed
  } catch (error) {
    console.error('Failed to refresh token:', error)
    return false
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
  // Clean up token refresh interval
  if (tokenRefreshInterval) {
    clearInterval(tokenRefreshInterval)
    tokenRefreshInterval = null
  }
  
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
  
  // Clear any existing interval
  if (tokenRefreshInterval) {
    clearInterval(tokenRefreshInterval)
  }
  
  // Create a new interval to check the token periodically
  tokenRefreshInterval = window.setInterval(() => {
    if (keycloakInstance?.isTokenExpired(30)) {
      refreshToken(60)
        .then(refreshed => {
          if (refreshed) {
            console.log('Token was successfully refreshed')
          }
        })
        .catch(error => {
          console.error('Error refreshing token:', error)
          authenticated.value = false
          console.warn('Failed to refresh token, user may need to re-authenticate')
        })
    }
  }, tokenRefreshIntervalMs)
}

/**
 * Clean up Keycloak resources
 */
export function cleanup() {
  if (tokenRefreshInterval) {
    clearInterval(tokenRefreshInterval)
    tokenRefreshInterval = null
  }
  
  onTokenRefreshedCallbacks.length = 0
  onTokenExpiredCallbacks.length = 0
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
