/**
 * Logging utility for Faceplate Builder
 * Provides consistent logging with dev mode support
 */

// Check if we're in development mode
const isDevelopment = import.meta.env.DEV;

export const logger = {
  debug(...args: any[]) {
    if (isDevelopment) {
      console.log('[Faceplate Debug]', ...args);
    }
  },

  info(...args: any[]) {
    console.info('[Faceplate Info]', ...args);
  },

  warn(...args: any[]) {
    console.warn('[Faceplate Warning]', ...args);
  },

  error(...args: any[]) {
    console.error('[Faceplate Error]', ...args);
  },

  /**
   * Show user-friendly error message
   * TODO: Integrate with UI notification system
   */
  userError(message: string, error?: unknown) {
    console.error('[Faceplate Error]', message, error);
    // Future: Show toast notification to user
    // showNotification({ type: 'error', message });
  },
};
