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
    
    async login(username?: string) {
      if (!this.isKeycloakInitialized) {
        await this.initializeAuth()
      }
      
      // If already authenticated, return early
      if (this.isAuthenticated) {
        return true
      }
      
      // If username is provided, we're in development mode
      // This allows bypassing Keycloak for development
      if (username) {
        return this.handleSuccessfulAuth(username)
      }
      
      // Otherwise, redirect to Keycloak login
      await keycloakLogin()
      return false // The page will redirect, so this won't actually return
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
