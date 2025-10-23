import { defineStore } from 'pinia'
import { useSecurityStore } from './security'
import { useDataStore } from './data'
import { useAppStore } from './apps'
import type { SecurityProfile } from '@/core/security/types'
import type { AuthProvider } from '@/core/security/auth-provider'
import { CredentialsAuthProvider } from '@/core/security/credentials-provider'
import databaseBrowserApp from '@/apps/database-browser';
import schemaEditorApp from '@/apps/schema-editor';
import terminalApp from '@/apps/terminal';
import { faceplateBuilderApp } from '@/apps/faceplate-builder';

// Define auth method type
type AuthMethod = 'credentials' | '';

// Type for providers map
type ProvidersMap = {
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
        credentials: new CredentialsAuthProvider(),
      };
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
        console.warn('Database connection lost. Will attempt to reconnect automatically.');
        // Connection loss no longer triggers logout - we attempt to reconnect instead
      });
    },

    /**
     * Register available apps after login
     */
    registerApps() {
      const appStore = useAppStore();

      // Register database browser app
      appStore.registerApp(databaseBrowserApp);
      appStore.registerApp(terminalApp);
      appStore.registerApp(faceplateBuilderApp);
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
