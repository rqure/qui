import { defineStore } from 'pinia'
import { useSecurityStore } from './security'
import { useDataStore } from './data'
import type { SecurityProfile } from '@/core/security/types'
import { 
  initKeycloak, 
  login as keycloakLogin, 
  logout as keycloakLogout,
  getUserProfile,
  cleanup as cleanupKeycloak
} from '@/core/security/keycloak'
import { getApiBaseUrl } from '@/core/utils/url'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    isAuthenticated: false,
    username: '',
    userProfile: null as Record<string, any> | null,
    isKeycloakInitialized: false,
  }),

  actions: {
    async initializeAuth() {
      try {
        const keycloak = await initKeycloak()
        this.isKeycloakInitialized = true
        
        if (keycloak.authenticated) {
          const profile = await getUserProfile()
          return this.handleSuccessfulAuth(
            profile?.username || keycloak.tokenParsed?.preferred_username || 'unknown',
            profile as Record<string, any> | null
          )
        }
        
        return false
      } catch (error) {
        console.error('Failed to initialize authentication:', error)
        return false
      }
    },
    
    async login() {
      if (!this.isKeycloakInitialized) {
        await this.initializeAuth()
      }
      
      // If already authenticated, return early
      if (this.isAuthenticated) {
        return true
      }
      
      // Otherwise, redirect to Keycloak login
      await keycloakLogin()
      return false // The page will redirect, so this won't actually return
    },
    
    async loginWithCredentials(username: string, password: string) {
      try {
        if (!username || !password) {
          throw new Error('Username and password are required')
        }
        
        // Use dynamic hostname based on current browser location
        const authEndpoint = `${getApiBaseUrl()}auth`
        
        // Send credentials to the specified authentication endpoint
        const response = await fetch(authEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
          body: JSON.stringify({
            username,
            password,
          }),
          credentials: 'include', // Include cookies in the request
          mode: 'cors', // Explicitly state we're using CORS
        })

        if (!response.ok) {
          // Handle HTTP error responses
          const errorData = await response.json().catch(() => null)
          throw new Error(errorData?.message || `Authentication failed with status: ${response.status}`)
        }
        
        // Process the successful response
        const data = await response.json()
        
        // Construct user profile from response data
        const profile = {
          username: data.username || username,
          name: data.name || username,
          email: data.email || '',
          ...data, // Include any other data from the response
        }
        
        return this.handleSuccessfulAuth(
          profile.username,
          profile
        )
      } catch (error) {
        console.error('Login failed:', error)
        throw error
      }
    },
    
    async loginWithProvider(provider: string) {
      try {
        // In a real app, this would redirect to the OAuth provider
        if (!this.isKeycloakInitialized) {
          await this.initializeAuth()
        }
        
        console.log(`Logging in with provider: ${provider}`)
        
        // For now, we'll use Keycloak's login with a kc_idp_hint
        // This tells Keycloak which identity provider to use
        await keycloakLogin(provider)
        
        return false // The page will redirect, so this won't actually return
      } catch (error) {
        console.error(`${provider} login failed:`, error)
        throw error
      }
    },
    
    async handleSuccessfulAuth(username: string, profile: Record<string, any> | null = null) {
      // Security profile can come from Keycloak roles/groups
      const mockSecurityProfile: SecurityProfile = {
        permissions: ['app.launch', 'window.create'],
        areaOfResponsibility: ['global', 'sales', 'marketing'],
      }
      
      this.username = username
      this.userProfile = profile
      this.isAuthenticated = true
      
      // Set security profile
      const securityStore = useSecurityStore()
      securityStore.setSecurityProfile(mockSecurityProfile)
      
      // Initialize the data store connection
      const dataStore = useDataStore()
      dataStore.initialize()
      
      return true
    },

    async logout() {
      try {
        // First disconnect the data store
        const dataStore = useDataStore()
        dataStore.cleanup()
        
        // Clean up Keycloak resources
        cleanupKeycloak()
        
        // Then reset local state
        this.username = ''
        this.userProfile = null
        this.isAuthenticated = false
        
        // Reset security profile by setting an empty profile
        const securityStore = useSecurityStore()
        securityStore.setSecurityProfile({
          permissions: [],
          areaOfResponsibility: []
        })
        
        // Log out of Keycloak if initialized
        if (this.isKeycloakInitialized) {
          try {
            await keycloakLogout()
          } catch (err) {
            console.error('Failed to logout from Keycloak:', err)
            // Continue with local logout even if Keycloak logout fails
          }
        }
        
        return true
      } catch (error) {
        console.error('Logout process failed:', error)
        return false
      }
    },
  },
})
