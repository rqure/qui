import type { AuthProvider } from './auth-provider';
import { getAuthServiceBaseUrl2 } from '@/core/utils/url';

// Constants for token storage and refresh
const TOKEN_REFRESH_INTERVAL_MS = 4 * 60 * 1000; // 4 minutes
const REFRESH_TOKEN_STORAGE_KEY = 'qui_refresh_token';
const USER_PROFILE_STORAGE_KEY = 'qui_user_profile';

/**
 * Credentials Authentication Provider
 * Handles username/password based authentication
 */
export class CredentialsAuthProvider implements AuthProvider {
  private isAuthenticatedFlag = false;
  private userProfile: Record<string, any> | null = null;
  private refreshTokenInterval: number | null = null;
  private tokenExpiryListeners: Array<() => void> = [];
  
  constructor() {
    // Try to load user profile from storage
    this.loadUserProfileFromStorage();
  }
  
  /**
   * Initialize the provider and try to recover session
   */
  async initialize(): Promise<boolean> {
    return this.recoverSessionFromStorage();
  }
  
  /**
   * Login with username and password
   */
  async login(credentials: { username: string, password: string }): Promise<boolean> {
    try {
      if (!credentials.username || !credentials.password) {
        throw new Error('Username and password are required');
      }
      
      const authEndpoint = getAuthServiceBaseUrl2();
      
      const response = await fetch(authEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({
          username: credentials.username,
          password: credentials.password,
        }),
        credentials: 'include',
        mode: 'cors',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || `Authentication failed with status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Authentication failed');
      }
      
      // Construct user profile
      this.userProfile = {
        username: data.username || credentials.username,
        name: data.username || credentials.username,
        email: data.email || '',
        token: data.accessToken,
        refreshToken: data.refreshToken,
        ...data,
      };
      
      this.isAuthenticatedFlag = true;
      this.persistUserSession();
      this.setupTokenRefresh();
      
      return true;
    } catch (error) {
      console.error('Credentials login failed:', error);
      throw error;
    }
  }
  
  /**
   * Logout user
   */
  async logout(): Promise<void> {
    this.clearTokenRefresh();
    this.clearStoredSession();
    this.isAuthenticatedFlag = false;
    this.userProfile = null;
  }
  
  /**
   * Get the current user profile
   */
  async getUserProfile(): Promise<Record<string, any> | null> {
    return this.userProfile;
  }
  
  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.isAuthenticatedFlag;
  }
  
  /**
   * Get provider name
   */
  getProviderName(): string {
    return 'credentials';
  }
  
  /**
   * Refresh the auth token
   */
  async refreshToken(): Promise<boolean> {
    if (!this.userProfile?.refreshToken) {
      return false;
    }
    
    try {
      const authEndpoint = getAuthServiceBaseUrl2();
      
      const response = await fetch(authEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({
          refreshToken: this.userProfile.refreshToken
        }),
        credentials: 'include',
        mode: 'cors',
      });
      
      if (!response.ok) {
        throw new Error(`Token refresh failed with status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Token refresh failed');
      }
      
      // Update tokens in profile
      if (this.userProfile) {
        this.userProfile.token = data.accessToken;
        this.userProfile.refreshToken = data.refreshToken;
        this.persistUserSession();
      }
      
      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      // Notify listeners about token expiry
      this.tokenExpiryListeners.forEach(listener => listener());
      return false;
    }
  }
  
  /**
   * Add listener for token expiry events
   */
  onTokenExpired(callback: () => void): void {
    this.tokenExpiryListeners.push(callback);
  }
  
  /**
   * Try to recover session from stored refresh token
   */
  private async recoverSessionFromStorage(): Promise<boolean> {
    try {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
      if (!refreshToken) {
        return false;
      }
      
      const storedProfile = localStorage.getItem(USER_PROFILE_STORAGE_KEY);
      let parsedProfile: Record<string, any> | null = null;
      
      if (storedProfile) {
        try {
          parsedProfile = JSON.parse(storedProfile);
        } catch (e) {
          console.warn('Failed to parse stored user profile');
        }
      }
      
      // Try to refresh the token
      const authEndpoint = getAuthServiceBaseUrl2();
      
      const response = await fetch(authEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({
          refreshToken
        }),
        credentials: 'include',
        mode: 'cors',
      });
      
      if (!response.ok) {
        this.clearStoredSession();
        return false;
      }
      
      const data = await response.json();
      
      if (!data.success) {
        this.clearStoredSession();
        return false;
      }
      
      // Update the profile with new tokens
      this.userProfile = {
        ...parsedProfile,
        username: data.username || parsedProfile?.username || 'unknown',
        token: data.accessToken,
        refreshToken: data.refreshToken,
      };
      
      this.isAuthenticatedFlag = true;
      this.persistUserSession();
      this.setupTokenRefresh();
      
      console.log('Session recovered successfully from refresh token');
      return true;
    } catch (error) {
      console.warn('Failed to recover session:', error);
      this.clearStoredSession();
      return false;
    }
  }
  
  /**
   * Setup automatic token refresh
   */
  private setupTokenRefresh(): void {
    this.clearTokenRefresh();
    
    this.refreshTokenInterval = window.setInterval(async () => {
      try {
        await this.refreshToken();
      } catch (error) {
        console.error('Failed to refresh token:', error);
        this.tokenExpiryListeners.forEach(listener => listener());
      }
    }, TOKEN_REFRESH_INTERVAL_MS);
  }
  
  /**
   * Clear token refresh interval
   */
  private clearTokenRefresh(): void {
    if (this.refreshTokenInterval) {
      clearInterval(this.refreshTokenInterval);
      this.refreshTokenInterval = null;
    }
  }
  
  /**
   * Save user profile to localStorage
   */
  private persistUserSession(): void {
    if (this.userProfile?.refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, this.userProfile.refreshToken);
      localStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(this.userProfile));
    }
  }
  
  /**
   * Clear stored session data
   */
  private clearStoredSession(): void {
    localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_PROFILE_STORAGE_KEY);
  }
  
  /**
   * Load user profile from storage (without validating)
   */
  private loadUserProfileFromStorage(): void {
    const storedProfile = localStorage.getItem(USER_PROFILE_STORAGE_KEY);
    if (storedProfile) {
      try {
        this.userProfile = JSON.parse(storedProfile);
      } catch (e) {
        console.warn('Failed to parse stored user profile');
      }
    }
  }
}
