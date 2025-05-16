/**
 * Authentication Provider Interface
 * Defines the common API for all authentication providers
 */
export interface AuthProvider {
  /**
   * Initialize the authentication provider and check if user is already logged in
   */
  initialize(): Promise<boolean>;
  
  /**
   * Attempt to login a user
   */
  login(options?: any): Promise<boolean>;
  
  /**
   * Logout the current user
   */
  logout(): Promise<void>;
  
  /**
   * Get the current user profile
   */
  getUserProfile(): Promise<Record<string, any> | null>;
  
  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean;
  
  /**
   * Get the current authentication provider name
   */
  getProviderName(): string;
  
  /**
   * Refresh the authentication token (if applicable)
   */
  refreshToken?(): Promise<boolean>;
  
  /**
   * Add listener for token expiry events
   */
  onTokenExpired?(callback: () => void): void;
}
