/**
 * Gets the base URL for API requests based on the current hostname
 * Uses port 7860 for API endpoints
 */
export function getApiBaseUrl(): string {
  const protocol = window.location.protocol
  const hostname = window.location.hostname
  
  // Use development URL format when running on localhost
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    if (protocol === 'http:') {
      return `ws://${hostname}:7860/`;
    } else if (protocol === 'https:') {
      return `wss://${hostname}:7860/`;
    }

    return `${protocol}//${hostname}:7860/`;
  }
  
  // In production, we might use the same domain/host with a path prefix
  if (protocol === 'http:') {
    return `ws://${hostname}/api/`;
  } else if (protocol === 'https:') {
    return `wss://${hostname}/api/`;
  }
  
  return `${window.location.origin}/api/`;
}

/**
 * Gets the base URL for authentication services like Keycloak
 * By default uses the same hostname as the current page but with port 8080
 */
export function getAuthServiceBaseUrl2(): string {
  const protocol = window.location.protocol
  const hostname = window.location.hostname
  
  // Use the environment variable if available
  if (import.meta.env.VITE_AUTH_SERVICE_URL) {
    return import.meta.env.VITE_AUTH_SERVICE_URL
  }
  
  // Otherwise construct URL from current hostname
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `${protocol}//${hostname}:7860/`
  }
  
  // In production, we might use the same domain/host with a path prefix
  return `${window.location.origin}/`
}


/**
 * Gets the base URL for authentication services like Keycloak
 * By default uses the same hostname as the current page but with port 8080
 */
export function getAuthServiceBaseUrl(): string {
  const protocol = window.location.protocol
  const hostname = window.location.hostname
  
  // Use the environment variable if available
  if (import.meta.env.VITE_AUTH_SERVICE_URL) {
    return import.meta.env.VITE_AUTH_SERVICE_URL
  }
  
  // Otherwise construct URL from current hostname
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `${protocol}//${hostname}:8080`
  }
  
  // In production, we might use the same domain/host with a path prefix
  return `${window.location.origin}/auth`
}
