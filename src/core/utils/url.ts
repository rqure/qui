/**
 * Gets the base URL for API requests based on the current hostname
 * Uses port 7860 for API endpoints
 */
export function getApiBaseUrl(): string {
  const protocol = window.location.protocol
  const hostname = window.location.hostname
  return `${protocol}//${hostname}:7860/`
}

/**
 * Gets the base URL for authentication services like Keycloak
 * By default uses the same hostname as the current page but with port 8080
 */
export function getAuthServiceBaseUrl(): string {
  const protocol = window.location.protocol
  const hostname = window.location.hostname
  
  // Use the environment variable if available, otherwise construct URL from current hostname
  return import.meta.env.VITE_AUTH_SERVICE_URL || `${protocol}//${hostname}:8080`
}
