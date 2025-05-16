/**
 * Gets the base URL for API requests based on the current hostname
 */
export function getApiBaseUrl(): string {  
  return `${window.location.origin}/core/`;
}

/**
 * Gets the base URL for CORE authentication services
 */
export function getAuthServiceBaseUrl2(): string {
  return `${getApiBaseUrl()}auth/`;
}


/**
 * Gets the base URL for Keycloak authentication services
 */
export function getAuthServiceBaseUrl(): string {
  return `${window.location.origin}/auth`
}
