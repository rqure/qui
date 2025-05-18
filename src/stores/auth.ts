import { defineStore } from 'pinia'
import { useSecurityStore } from './security'
import { useDataStore } from './data'
import { useAppStore } from './apps'
import type { SecurityProfile } from '@/core/security/types'
import type { AuthProvider } from '@/core/security/auth-provider'
import { KeycloakAuthProvider } from '@/core/security/keycloak-provider'
import { CredentialsAuthProvider } from '@/core/security/credentials-provider'
import databaseBrowserApp from '@/apps/database-browser'

// Define auth method type
type AuthMethod = 'keycloak' | 'credentials' | '';

// Type for providers map without the empty string key
type ProvidersMap = {
  keycloak: AuthProvider;
  credentials: AuthProvider;
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    isAuthenticated: false,
    username: '',
    userProfile: null as Record<string, any> | null,
    authMethod: '' as AuthMethod,
    authProviders: {} as ProvidersMap,
    currentProvider: null as AuthProvider | null,
  }),

  actions: {
    /**
     * Initialize available auth providers
     */
    setupAuthProviders() {
      // Only set up providers once
      if (Object.keys(this.authProviders).length > 0) return;
      
      this.authProviders = {
        keycloak: new KeycloakAuthProvider(),
        credentials: new CredentialsAuthProvider(),
      };
      
      // Set up token expiry handlers
      Object.values(this.authProviders).forEach(provider => {
        if ('onTokenExpired' in provider) {
          (provider as any).onTokenExpired(() => {
            console.warn('Token expired and could not be refreshed. Logging out...');
            this.logout();
          });
        }
      });
    },

    /**
     * Initialize authentication on app startup
     */
    async initializeAuth() {
      // Set up auth providers if not already done
      this.setupAuthProviders();
      
      try {
        // Try each provider in order until one works
        for (const provider of Object.values(this.authProviders)) {
          console.log(`Trying authentication provider: ${provider.getProviderName()}`);
          
          const isAuthenticated = await provider.initialize();
          console.log(`Authenticated with ${provider.getProviderName()}: ${isAuthenticated}`);
          if (isAuthenticated) {
            return this.finalizeSuccessfulAuth(provider);
          }
        }
        
        return false;
      } catch (error) {
        console.error('Failed to initialize authentication:', error);
        return false;
      }
    },
    
    /**
     * Login with Keycloak SSO (direct redirect approach)
     */
    async login(idpHint?: string) {
      this.setupAuthProviders();
      
      // If already authenticated, return early
      if (this.isAuthenticated) {
        return true;
      }
      
      const keycloakProvider = this.authProviders.keycloak;
      try {
        // This will redirect to Keycloak
        await keycloakProvider.login(idpHint);
        // The page will redirect, so we won't actually reach this point
        return true;
      } catch (error) {
        console.error('Keycloak login failed:', error);
        throw error;
      }
    },
    
    /**
     * Login with username and password
     */
    async loginWithCredentials(username: string, password: string) {
      this.setupAuthProviders();
      
      if (!username || !password) {
        throw new Error('Username and password are required');
      }
      
      try {
        const credentialsProvider = this.authProviders.credentials;
        const success = await credentialsProvider.login({ username, password });
        
        if (success) {
          return this.finalizeSuccessfulAuth(credentialsProvider);
        }
        
        return false;
      } catch (error) {
        console.error('Credentials login failed:', error);
        throw error;
      }
    },
    
    /**
     * Login with external provider (Google, Microsoft, etc.)
     */
    async loginWithProvider(provider: string) {
      this.setupAuthProviders();
      
      try {
        // For now, we'll use Keycloak with an identity provider hint
        const keycloakProvider = this.authProviders.keycloak;
        await keycloakProvider.login(provider);
        
        return false; // The page will redirect, so this won't actually return
      } catch (error) {
        console.error(`${provider} login failed:`, error);
        throw error;
      }
    },
    
    /**
     * Finalize successful authentication
     */
    async finalizeSuccessfulAuth(provider: AuthProvider) {
      try {
        const profile = await provider.getUserProfile();
        const username = profile?.username || 'unknown';
        
        // Set up state
        this.username = username;
        this.userProfile = profile;
        this.isAuthenticated = true;
        this.authMethod = provider.getProviderName() as AuthMethod;
        this.currentProvider = provider;
        
        // Security profile (mock for now)
        const mockSecurityProfile: SecurityProfile = {
          permissions: ['app.launch', 'window.create'],
          areaOfResponsibility: ['global', 'sales', 'marketing'],
        };
        
        // Set security profile
        const securityStore = useSecurityStore();
        securityStore.setSecurityProfile(mockSecurityProfile);
        
        // Initialize data store
        const dataStore = useDataStore();
        dataStore.initialize();
        
        // Set up connection lost handler
        this.setupConnectionLostHandler();
        
        // Register apps
        this.registerApps();
        
        return true;
      } catch (error) {
        console.error('Failed to finalize authentication:', error);
        return false;
      }
    },
    
    /**
     * Set up handler for connection lost events
     */
    setupConnectionLostHandler() {
      const dataStore = useDataStore();
      dataStore.onConnectionLost(() => {
        console.warn('Database connection lost. Logging out user...');
        this.logout();
      });
    },
    
    /**
     * Register available apps after login
     */
    registerApps() {
      const appStore = useAppStore();
      
      // Register database browser app
      appStore.registerApp(databaseBrowserApp);
      
      console.log('Apps registered successfully after login');
    },

    /**
     * Logout user
     */
    async logout() {
      try {
        // First disconnect the data store
        const dataStore = useDataStore();
        dataStore.cleanup();
        
        // Logout using the current provider
        if (this.currentProvider) {
          await this.currentProvider.logout();
        }
        
        // Reset local state
        this.username = '';
        this.userProfile = null;
        this.isAuthenticated = false;
        this.authMethod = '';
        this.currentProvider = null;
        
        // Reset security profile
        const securityStore = useSecurityStore();
        securityStore.setSecurityProfile({
          permissions: [],
          areaOfResponsibility: []
        });
        
        return true;
      } catch (error) {
        console.error('Logout process failed:', error);
        return false;
      }
    },
  },
})
