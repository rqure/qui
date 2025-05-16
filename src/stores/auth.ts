import { defineStore } from 'pinia'
import { useSecurityStore } from './security'
import { useDataStore } from './data'
import { useAppStore } from './apps'
import type { SecurityProfile } from '@/core/security/types'
import { 
  initKeycloak, 
  login as keycloakLogin, 
  logout as keycloakLogout,
  getUserProfile
} from '@/core/security/keycloak'
import { getApiBaseUrl, getAuthServiceBaseUrl2 } from '@/core/utils/url'
import databaseBrowserApp from '@/apps/database-browser'

// Token refresh constants
const TOKEN_REFRESH_INTERVAL_MS = 4 * 60 * 1000 // 4 minutes
const REFRESH_TOKEN_STORAGE_KEY = 'qui_refresh_token'
const USER_PROFILE_STORAGE_KEY = 'qui_user_profile'

// Define specific auth method type
type AuthMethod = 'keycloak' | 'credentials' | '';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    isAuthenticated: false,
    username: '',
    userProfile: null as Record<string, any> | null,
    isKeycloakInitialized: false,
    refreshTokenInterval: null as number | null,
    authMethod: '' as AuthMethod,
  }),

  actions: {
    async initializeAuth() {
      try {
        // First try to recover session from stored refresh token
        const recovered = await this.recoverSessionFromStorage()
        if (recovered) {
          return true
        }
        
        // If no stored session, try Keycloak
        let keycloak = null;
        try {
          // Add explicit error handling
          keycloak = await initKeycloak().catch(error => {
            console.error('Explicit Keycloak initialization error:', error);
            return null;
          });
          
          this.isKeycloakInitialized = keycloak !== null;
        } catch (error) {
          console.error('Keycloak initialization failed:', error);
          this.isKeycloakInitialized = false;
        }
        
        if (keycloak && keycloak.authenticated) {
          const profile = await getUserProfile()
          const success = await this.handleSuccessfulAuth(
            profile?.username || keycloak.tokenParsed?.preferred_username || 'unknown',
            profile as Record<string, any> | null,
            'keycloak'
          )
          
          if (success) {
            // Register connection lost handler after successful authentication
            this.setupConnectionLostHandler()
            
            // Set up token refresh monitor to detect invalid sessions
            this.monitorTokenRefreshFailures()
          }
          
          return success
        }
        
        return false
      } catch (error) {
        console.error('Failed to initialize authentication:', error)
        return false
      }
    },
    
    // Try to recover session from stored refresh token
    async recoverSessionFromStorage() {
      try {
        const refreshToken = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)
        if (!refreshToken) {
          return false
        }
        
        const storedProfile = localStorage.getItem(USER_PROFILE_STORAGE_KEY)
        let parsedProfile: Record<string, any> | null = null
        
        if (storedProfile) {
          try {
            parsedProfile = JSON.parse(storedProfile)
          } catch (e) {
            console.warn('Failed to parse stored user profile')
          }
        }
        
        // Try to refresh the token
        const authEndpoint = `${getAuthServiceBaseUrl2()}auth`
        
        const response = await fetch(authEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
          body: JSON.stringify({
            refreshToken
          }),
          credentials: 'include',
          mode: 'cors',
        })
        
        if (!response.ok) {
          // Clear invalid stored tokens
          localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY)
          localStorage.removeItem(USER_PROFILE_STORAGE_KEY)
          return false
        }
        
        const data = await response.json()
        
        if (!data.success) {
          // Clear invalid stored tokens
          localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY)
          localStorage.removeItem(USER_PROFILE_STORAGE_KEY)
          return false
        }
        
        // Update the profile with new tokens
        const updatedProfile = {
          ...parsedProfile,
          username: data.username || parsedProfile?.username || 'unknown',
          token: data.accessToken,
          refreshToken: data.refreshToken,
        }
        
        const success = await this.handleSuccessfulAuth(
          updatedProfile.username,
          updatedProfile,
          'credentials'
        )
        
        if (success) {
          console.log('Session recovered successfully from refresh token')
        }
        
        return success
      } catch (error) {
        console.warn('Failed to recover session:', error)
        return false
      }
    },
    
    // Add a new method to monitor token refresh failures
    monitorTokenRefreshFailures() {
      // Register for token expired notifications using the imported function
      onTokenExpired(() => {
        console.warn('Token expired and could not be refreshed. Logging out...')
        this.logout()
      })
    },
    
    async login() {
      if (!this.isKeycloakInitialized) {
        try {
          await this.initializeAuth()
        } catch (error) {
          console.error('Failed to initialize Keycloak during login:', error);
          throw new Error('SSO system is not available. Please try another login method.');
        }
      }
      
      // If already authenticated, return early
      if (this.isAuthenticated) {
        return true
      }
      
      // Only try Keycloak login if initialization was successful
      if (this.isKeycloakInitialized) {
        try {
          await keycloakLogin()
          return false // The page will redirect, so this won't actually return
        } catch (error) {
          console.error('Keycloak login failed:', error);
          throw new Error('SSO login failed. Please try another login method.');
        }
      } else {
        throw new Error('SSO system is not available. Please try another login method.');
      }
    },
    
    async loginWithCredentials(username: string, password: string) {
      try {
        if (!username || !password) {
          throw new Error('Username and password are required')
        }
        
        // Use dynamic hostname based on current browser location
        const authEndpoint = `${getAuthServiceBaseUrl2()}auth`
        
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
        
        if (!data.success) {
          throw new Error(data.message || 'Authentication failed')
        }
        
        // Construct user profile from response data
        const profile = {
          username: data.username || username,
          name: data.username || username,
          email: data.email || '',
          token: data.accessToken,
          refreshToken: data.refreshToken,
          ...data, // Include any other data from the response
        }
        
        return this.handleSuccessfulAuth(
          profile.username,
          profile,
          'credentials'
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
    
    // Listen for connection loss events from the data store
    setupConnectionLostHandler() {
      const dataStore = useDataStore()
      dataStore.onConnectionLost(() => {
        console.warn('Database connection lost. Logging out user...')
        this.logout()
      })
    },
    
    // Setup token refresh for credentials-based authentication
    setupTokenRefresh() {
      // Clear any existing interval
      if (this.refreshTokenInterval) {
        clearInterval(this.refreshTokenInterval)
      }
      
      // Only set up refresh for credentials-based auth
      if (this.authMethod !== 'credentials' || !this.userProfile?.refreshToken) {
        return
      }
      
      // Set up interval to refresh token
      this.refreshTokenInterval = window.setInterval(async () => {
        try {
          await this.refreshToken()
        } catch (error) {
          console.error('Failed to refresh token:', error)
          // If token refresh fails, log out
          this.logout()
        }
      }, TOKEN_REFRESH_INTERVAL_MS)
    },
    
    // Refresh token for credentials-based auth
    async refreshToken() {
      if (this.authMethod !== 'credentials' || !this.userProfile?.refreshToken) {
        return false
      }
      
      try {
        const authEndpoint = `${getAuthServiceBaseUrl2()}auth`
        
        const response = await fetch(authEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
          body: JSON.stringify({
            refreshToken: this.userProfile.refreshToken
          }),
          credentials: 'include',
          mode: 'cors',
        })
        
        if (!response.ok) {
          throw new Error(`Token refresh failed with status: ${response.status}`)
        }
        
        const data = await response.json()
        
        if (!data.success) {
          throw new Error(data.message || 'Token refresh failed')
        }
        
        // Update tokens in profile
        if (this.userProfile) {
          this.userProfile.token = data.accessToken
          this.userProfile.refreshToken = data.refreshToken
          
          // Update stored profile
          this.persistUserSession()
        }
        
        return true
      } catch (error) {
        console.error('Token refresh failed:', error)
        throw error
      }
    },
    
    // Persist user session in localStorage
    persistUserSession() {
      if (this.userProfile?.refreshToken && this.authMethod === 'credentials') {
        localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, this.userProfile.refreshToken)
        localStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(this.userProfile))
      }
    },
    
    // Update the handleSuccessfulAuth to also set up the connection lost handler
    async handleSuccessfulAuth(username: string, profile: Record<string, any> | null = null, authMethod: 'keycloak' | 'credentials' = 'keycloak') {
      // Security profile can come from Keycloak roles/groups
      const mockSecurityProfile: SecurityProfile = {
        permissions: ['app.launch', 'window.create'],
        areaOfResponsibility: ['global', 'sales', 'marketing'],
      }
      
      this.username = username
      this.userProfile = profile
      this.isAuthenticated = true
      this.authMethod = authMethod
      
      // Set security profile
      const securityStore = useSecurityStore()
      securityStore.setSecurityProfile(mockSecurityProfile)
      
      // Initialize the data store connection
      const dataStore = useDataStore()
      dataStore.initialize()
      
      // Set up connection lost handler
      this.setupConnectionLostHandler()
      
      // Set up token refresh for credentials-based auth
      if (authMethod === 'credentials') {
        this.setupTokenRefresh()
        
        // Persist the session
        this.persistUserSession()
      }
      
      // Register apps after successful login
      this.registerApps()
      
      return true
    },

    // Add a new method to register apps
    registerApps() {
      const appStore = useAppStore()
      
      // Register the database browser app
      appStore.registerApp(databaseBrowserApp)
      
      // Additional apps can be registered here
      
      console.log('Apps registered successfully after login')
    },

    async logout() {
      try {
        // First disconnect the data store
        const dataStore = useDataStore()
        
        // Remove our connection lost callback to avoid recursion during logout
        dataStore.removeConnectionLostCallback(this.setupConnectionLostHandler)
        
        // Clear token refresh interval
        if (this.refreshTokenInterval) {
          clearInterval(this.refreshTokenInterval)
          this.refreshTokenInterval = null
        }
        
        // Clear stored session
        localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY)
        localStorage.removeItem(USER_PROFILE_STORAGE_KEY)
        
        dataStore.cleanup()
        
        // Clean up Keycloak resources if that was our auth method
        if (this.authMethod === 'keycloak') {          
          try {
            await keycloakLogout()
          } catch (err) {
            console.error('Failed to logout from Keycloak:', err)
          }
        }
        
        // Then reset local state
        this.username = ''
        this.userProfile = null
        this.isAuthenticated = false
        this.authMethod = ''
        
        // Reset security profile by setting an empty profile
        const securityStore = useSecurityStore()
        securityStore.setSecurityProfile({
          permissions: [],
          areaOfResponsibility: []
        })
        
        return true
      } catch (error) {
        console.error('Logout process failed:', error)
        return false
      }
    },
  },
})
