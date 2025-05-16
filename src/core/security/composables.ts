import { type Component } from 'vue'
import { useSecurityStore } from '@/stores/security'
import type { SecurityContext } from './types'

export function useSecurityCheck() {
  const securityStore = useSecurityStore()

  return {
    checkAccess: (context: SecurityContext) => {
      const check = securityStore.checkSecurity(context)
      return check.hasPermission && check.hasAOR
    },

    requirePermission: (permission: string) => {
      return securityStore.hasPermission(permission)
    },

    requireAOR: (scope: string) => {
      return securityStore.hasAOR(scope)
    },
  }
}

export function withSecurity(component: Component, context: SecurityContext) {
  return {
    ...component,
    beforeMount() {
      const security = useSecurityStore()
      const check = security.checkSecurity(context)

      if (!check.hasPermission) {
        throw new Error(`Access denied: Missing required permission${context.requiredPermissions && context.requiredPermissions.length > 0 ? ': ' + context.requiredPermissions.join(', ') : ''}`)
      }
      
      if (!check.hasAOR) {
        throw new Error(`Access denied: Missing required area of responsibility${context.requiredAOR && context.requiredAOR.length > 0 ? ': ' + context.requiredAOR.join(', ') : ''}`)
      }
    },
  }
}
