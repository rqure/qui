export type Permission = string
export type AreaOfResponsibility = string

export interface SecurityProfile {
  permissions: Permission[]
  areaOfResponsibility: AreaOfResponsibility[]
}

export interface SecurityContext {
  requiredPermissions?: Permission[]
  requiredAOR?: AreaOfResponsibility[]
}

export type SecurityCheck = {
  hasPermission: boolean
  hasAOR: boolean
}
