/**
 * Keycloak configuration with sensible defaults
 * These can be overridden via environment variables or at runtime
 */
export interface KeycloakConfig {
  url: string;
  realm: string;
  clientId: string;
}

// Default configuration that points to local Docker Compose Keycloak instance
export const keycloakConfig: KeycloakConfig = {
  url: import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8080',
  realm: import.meta.env.VITE_KEYCLOAK_REALM || 'qos',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'qui',
};

export default keycloakConfig;
