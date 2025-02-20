import { defineStore } from 'pinia'
import { useSecurityStore } from './security'
import type { SecurityProfile } from '@/core/security/types'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    isAuthenticated: false,
    username: '',
  }),

  actions: {
    async login(username: string) {
      // Simulate API call - replace with real backend call later
      const mockSecurityProfile: SecurityProfile = {
        permissions: ['app.launch', 'window.create'],
        areaOfResponsibility: ['global', 'sales', 'marketing'], // Simplified AOR array
      }

      this.username = username
      this.isAuthenticated = true

      // Set security profile
      const securityStore = useSecurityStore()
      securityStore.setSecurityProfile(mockSecurityProfile)
    },

    logout() {
      this.username = ''
      this.isAuthenticated = false
    },
  },
})
