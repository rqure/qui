import { defineStore } from 'pinia'
import { useSecurityStore } from './security'
import type { SecurityProfile } from '@/core/security/types'
import { 
  initKeycloak, 
  login as keycloakLogin, 
  logout as keycloakLogout,
  getUserProfile
} from '@/core/security/keycloak'

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
        // In a real app, this would make an API call to verify credentials
        // For now, we'll simulate a successful login for any non-empty credentials
        if (!username || !password) {
          throw new Error('Username and password are required')
        }
        
        // Simple validation - in a real app this would call an API
        if (password.length < 4) {
          throw new Error('Invalid credentials')
        }
        
        return this.handleSuccessfulAuth(username)
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
      
      return true
    },

    async logout() {
      this.username = ''
      this.userProfile = null
      this.isAuthenticated = false
      
      // Reset security profile by setting an empty profile
      // since resetSecurityProfile() doesn't exist
      const securityStore = useSecurityStore()
      securityStore.setSecurityProfile({
        permissions: [],
        areaOfResponsibility: []
      })
      
      // Log out of Keycloak if initialized
      if (this.isKeycloakInitialized) {
        await keycloakLogout()
      }
    },
  },
})
