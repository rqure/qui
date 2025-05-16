import { getAuthServiceBaseUrl } from '../utils/url'

/**
 * Keycloak configuration with sensible defaults
 * These can be overridden via environment variables or at runtime
 */
export interface KeycloakConfig {
  url: string;
  realm: string;
  clientId: string;
}

// Function to get base URL with fallback mechanism
function getBaseUrl(): string {
  // Try to get from environment variables first
  if (import.meta.env.VITE_KEYCLOAK_URL) {
    return import.meta.env.VITE_KEYCLOAK_URL;
  }
  
  // Fall back to our URL utility
  try {
    return getAuthServiceBaseUrl();
  } catch (error) {
    console.warn('Failed to get auth service base URL:', error);
    // Final fallback to current origin which might work in some cases
    return window.location.origin;
  }
}

// Default configuration that uses current hostname for Keycloak URL
export const keycloakConfig: KeycloakConfig = {
  url: getBaseUrl(),
  realm: import.meta.env.VITE_KEYCLOAK_REALM || 'qos',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'qui',
};

export default keycloakConfig;
