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

// Default configuration that uses current hostname for Keycloak URL
export const keycloakConfig: KeycloakConfig = {
  url: import.meta.env.VITE_KEYCLOAK_URL || getAuthServiceBaseUrl(),
  realm: import.meta.env.VITE_KEYCLOAK_REALM || 'qos',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'qui',
};

export default keycloakConfig;
