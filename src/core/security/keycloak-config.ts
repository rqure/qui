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
  return getAuthServiceBaseUrl();
}

// Default configuration that uses current hostname for Keycloak URL
export const keycloakConfig: KeycloakConfig = {
  url: getBaseUrl(),
  realm: import.meta.env.VITE_KEYCLOAK_REALM || 'qos',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'qui',
};

export default keycloakConfig;
