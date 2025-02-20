import { defineStore } from 'pinia'
import type {
  Permission,
  AreaOfResponsibility,
  SecurityProfile,
  SecurityContext,
} from '@/core/security/types'

export const useSecurityStore = defineStore('security', {
  state: () => ({
    permissions: [] as Permission[],
    areaOfResponsibility: [] as AreaOfResponsibility[],
  }),

  actions: {
    setSecurityProfile(profile: SecurityProfile) {
      this.permissions = profile.permissions
      this.areaOfResponsibility = profile.areaOfResponsibility
    },

    hasPermission(permission: Permission): boolean {
      return this.permissions.includes(permission)
    },

    hasAOR(area: AreaOfResponsibility): boolean {
      return this.areaOfResponsibility.includes(area) || this.areaOfResponsibility.includes('*')
    },

    checkSecurity(context: SecurityContext) {
      return {
        hasPermission:
          !context.requiredPermissions ||
          context.requiredPermissions.every((p) => this.hasPermission(p)),
        hasAOR: !context.requiredAOR || context.requiredAOR.every((s) => this.hasAOR(s)),
      }
    },
  },
})
