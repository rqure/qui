import type { AuthProvider } from './auth-provider';
import { 
  initKeycloak, 
  login as keycloakLogin, 
  logout as keycloakLogout,
  getUserProfile,
  useKeycloakState,
} from './keycloak';

/**
 * Keycloak Authentication Provider
 * Handles authentication using Keycloak
 */
export class KeycloakAuthProvider implements AuthProvider {
  private keycloakState = useKeycloakState();
  
  constructor() {
  }
  
  /**
   * Initialize Keycloak and check if user is already authenticated
   */
  async initialize(): Promise<boolean> {
    try {      
      // Initialize Keycloak
      await initKeycloak();
      
      return this.isAuthenticated();
    } catch (error) {
      console.error('Failed to initialize Keycloak:', error);
      return false;
    }
  }
  
  /**
   * Login with Keycloak
   * @param idpHint Optional identity provider hint
   */
  async login(idpHint?: string): Promise<boolean> {
    try {
      // This will redirect to Keycloak
      await keycloakLogin(idpHint);
      // The page will redirect, so we won't get here
      return true;
    } catch (error) {
      console.error('Keycloak login failed:', error);
      throw new Error('SSO login failed. Please try another login method.');
    }
  }
  
  /**
   * Logout from Keycloak
   */
  async logout(): Promise<void> {
    if (this.isAuthenticated()) {
      try {
        await keycloakLogout();
      } catch (error) {
        console.error('Keycloak logout failed:', error);
      }
    }
  }
  
  /**
   * Get the user profile from Keycloak
   */
  async getUserProfile(): Promise<Record<string, any> | null> {
    if (!this.isAuthenticated()) {
      return null;
    }
    
    try {
      const profile = await getUserProfile();
      if (!profile) return null;
      
      return {
        username: profile.username || this.keycloakState.keycloak?.tokenParsed?.preferred_username || 'unknown',
        name: profile.firstName && profile.lastName 
          ? `${profile.firstName} ${profile.lastName}` 
          : profile.username,
        email: profile.email || '',
        ...profile
      };
    } catch (error) {
      console.error('Failed to get user profile from Keycloak:', error);
      return null;
    }
  }
  
  /**
   * Check if user is authenticated with Keycloak
   */
  isAuthenticated(): boolean {
    return this.keycloakState.authenticated as unknown as boolean;
  }
  
  /**
   * Get provider name
   */
  getProviderName(): string {
    return 'keycloak';
  }
}
