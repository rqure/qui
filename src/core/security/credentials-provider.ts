import type { AuthProvider } from './auth-provider';
import { getApiBaseUrl } from '@/core/utils/url';

// Constants for token storage and refresh
const TOKEN_REFRESH_INTERVAL_MS = 30 * 1000; // 30 seconds (token expires in 1 minute)
const TOKEN_STORAGE_KEY = 'qui_auth_token';
const USER_PROFILE_STORAGE_KEY = 'qui_user_profile';

/**
 * Credentials Authentication Provider
 * Handles username/password based authentication
 */
export class CredentialsAuthProvider implements AuthProvider {
  private isAuthenticatedFlag = false;
  private userProfile: Record<string, any> | null = null;
  private refreshWorker: Worker | null = null;
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
      
      const loginEndpoint = `${getApiBaseUrl()}/login`;
      
      const response = await fetch(loginEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: credentials.username,
          password: credentials.password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `Authentication failed with status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success || !data.data?.token) {
        throw new Error(data.error || 'Authentication failed');
      }
      
      // Construct user profile
      this.userProfile = {
        username: credentials.username,
        name: credentials.username,
        email: '',
        token: data.data.token,
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
    // Call logout endpoint if we have a token
    if (this.userProfile?.token) {
      try {
        const logoutEndpoint = `${getApiBaseUrl()}/logout`;
        await fetch(logoutEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.userProfile.token}`,
          },
          body: JSON.stringify({}),
        });
      } catch (error) {
        console.warn('Logout API call failed:', error);
      }
    }
    
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
    if (!this.userProfile?.token) {
      return false;
    }
    
    try {
      const refreshEndpoint = `${getApiBaseUrl()}/refresh`;
      
      const response = await fetch(refreshEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.userProfile.token}`,
        },
        body: JSON.stringify({}),
      });
      
      if (!response.ok) {
        throw new Error(`Token refresh failed with status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success || !data.data?.token) {
        throw new Error(data.error || 'Token refresh failed');
      }
      
      // Update token in profile
      if (this.userProfile) {
        this.userProfile.token = data.data.token;
        this.persistUserSession();
      }
      
      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      // Stop the refresh interval to prevent repeated failed requests
      this.clearTokenRefresh();
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
   * Try to recover session from stored token
   */
  private async recoverSessionFromStorage(): Promise<boolean> {
    try {
      const token = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (!token) {
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
      const refreshEndpoint = `${getApiBaseUrl()}/refresh`;
      
      const response = await fetch(refreshEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });
      
      if (!response.ok) {
        this.clearStoredSession();
        return false;
      }
      
      const data = await response.json();
      
      if (!data.success || !data.data?.token) {
        this.clearStoredSession();
        return false;
      }
      
      // Update the profile with new token
      this.userProfile = {
        ...parsedProfile,
        username: parsedProfile?.username || 'unknown',
        token: data.data.token,
      };
      
      this.isAuthenticatedFlag = true;
      this.persistUserSession();
      this.setupTokenRefresh();
      
      console.log('Session recovered successfully from stored token');
      return true;
    } catch (error) {
      console.warn('Failed to recover session:', error);
      this.clearStoredSession();
      return false;
    }
  }
  
  /**
   * Setup automatic token refresh using Web Worker for reliability
   */
  private setupTokenRefresh(): void {
    this.clearTokenRefresh();
    
    try {
      // Create Web Worker for reliable interval (not throttled when tab is inactive)
      this.refreshWorker = new Worker('/refresh-worker.js');
      
      this.refreshWorker.onmessage = async (e) => {
        const { type } = e.data;
        
        if (type === 'refresh') {
          // Worker triggered refresh
          try {
            const success = await this.refreshToken();
            if (!success) {
              console.warn('Token refresh returned false, stopping refresh worker');
            }
          } catch (error) {
            console.error('Failed to refresh token:', error);
            this.clearTokenRefresh();
            this.tokenExpiryListeners.forEach(listener => listener());
          }
        } else if (type === 'started') {
          console.log('Token refresh worker started with interval:', e.data.intervalMs);
        } else if (type === 'stopped') {
          console.log('Token refresh worker stopped');
        }
      };
      
      this.refreshWorker.onerror = (error) => {
        console.error('Token refresh worker error:', error);
        this.clearTokenRefresh();
      };
      
      // Start the worker with configured interval
      this.refreshWorker.postMessage({ 
        type: 'start', 
        data: { intervalMs: TOKEN_REFRESH_INTERVAL_MS } 
      });
    } catch (error) {
      console.error('Failed to create token refresh worker:', error);
      // Fallback: user will need to refresh manually or re-login
    }
  }
  
  /**
   * Clear token refresh worker
   */
  private clearTokenRefresh(): void {
    if (this.refreshWorker) {
      this.refreshWorker.postMessage({ type: 'stop' });
      this.refreshWorker.terminate();
      this.refreshWorker = null;
    }
  }
  
  /**
   * Save user profile to localStorage
   */
  private persistUserSession(): void {
    if (this.userProfile?.token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, this.userProfile.token);
      localStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(this.userProfile));
    }
  }
  
  /**
   * Clear stored session data
   */
  private clearStoredSession(): void {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
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
