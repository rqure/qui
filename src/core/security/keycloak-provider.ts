import type { AuthProvider } from './auth-provider';
import { 
  initKeycloak, 
  login as keycloakLogin, 
  logout as keycloakLogout,
  getUserProfile,
  useKeycloakState
} from './keycloak';

/**
 * Keycloak Authentication Provider
 * Handles authentication using Keycloak
 */
export class KeycloakAuthProvider implements AuthProvider {
  private keycloakState = useKeycloakState();
  private tokenExpiryListeners: Array<() => void> = [];
  
  constructor() {
    // Set up token refresh monitoring if Keycloak has a method for that
    if (this.keycloakState.keycloak) {
      this.setupTokenRefreshMonitoring();
    }
  }
  
  /**
   * Initialize Keycloak and check if user is already authenticated
   */
  async initialize(): Promise<boolean> {
    try {
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
      await keycloakLogin(idpHint);
      // This will redirect, so we won't actually return true
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
    return this.keycloakState.authenticated.value;
  }
  
  /**
   * Get provider name
   */
  getProviderName(): string {
    return 'keycloak';
  }
  
  /**
   * Add listener for token expiry events
   */
  onTokenExpired(callback: () => void): void {
    this.tokenExpiryListeners.push(callback);
  }
  
  /**
   * Setup monitoring for token refresh failures
   */
  private setupTokenRefreshMonitoring(): void {
    const keycloak = this.keycloakState.keycloak;
    if (!keycloak) return;
    
    // Add event listener for token expiry
    keycloak.onTokenExpired = () => {
      console.log('Token expired, attempting to refresh...');
      
      keycloak.updateToken(30).catch(() => {
        console.warn('Token refresh failed');
        this.tokenExpiryListeners.forEach(listener => listener());
      });
    };
  }
}
