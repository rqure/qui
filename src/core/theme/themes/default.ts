import type { Theme } from '../types'

export const defaultTheme: Theme = {
  name: 'default',
  variables: {
    // Global
    '--qui-bg-primary': '#0e1127',
    '--qui-bg-secondary': '#10182d',
    '--qui-text-primary': '#ffffff',
    '--qui-text-secondary': 'rgba(255, 255, 255, 0.9)',
    '--qui-accent-color': '#00ff88',
    '--qui-accent-secondary': '#00b4ff',
    '--qui-accent-deep': '#1B5E20',
    '--qui-shadow': '0 4px 20px rgba(0, 255, 136, 0.2)',

    // Animations
    '--qui-transition-speed': '0.2s',
    '--qui-hover-scale': 'scale(1.02)',
    '--qui-glow-effect': '0 0 10px rgba(0, 255, 136, 0.3)',
    '--qui-glow-effect-strong': '0 0 20px rgba(0, 255, 136, 0.5)',
    '--qui-animation-bounce': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    '--qui-animation-fade': 'cubic-bezier(0.4, 0, 0.2, 1)',

    // Window
    '--qui-window-border': '1px solid rgba(0, 255, 136, 0.15)',
    '--qui-window-radius': '4px', // Changed from 0px to 4px
    '--qui-titlebar-height': '38px',
    '--qui-titlebar-bg': 'linear-gradient(to bottom, #1a2035, #151928)',
    '--qui-titlebar-border': '1px solid rgba(0, 255, 136, 0.2)',
    '--qui-titlebar-active-bg': 'linear-gradient(to bottom, #1e2540, #1a2035)',
    '--qui-window-bg': 'linear-gradient(135deg, rgba(16, 24, 45, 0.95), rgba(14, 17, 39, 0.95))',
    '--qui-window-padding': '1rem',

    // Taskbar
    '--qui-taskbar-height': '44px',
    '--qui-taskbar-bg': 'rgba(16, 24, 45, 0.95)',
    '--qui-taskbar-border': '1px solid rgba(0, 255, 136, 0.15)',
    '--qui-taskbar-button-bg': 'rgba(14, 17, 39, 0.8)',
    '--qui-taskbar-button-hover': 'rgba(0, 255, 136, 0.1)',
    '--qui-taskbar-button-active': 'rgba(0, 180, 255, 0.2)',
    '--qui-taskbar-button-radius': '4px', // Added new variable for taskbar buttons

    // Start Menu
    '--qui-startmenu-width': '280px',
    '--qui-startmenu-bg': 'rgba(16, 24, 45, 0.98)',
    '--qui-startmenu-border': '1px solid rgba(0, 255, 136, 0.15)',
    '--qui-startmenu-shadow': '0 -4px 20px rgba(0, 255, 136, 0.2)',
    '--qui-startmenu-item-hover': 'rgba(0, 255, 136, 0.1)',
    '--qui-startmenu-section-title': 'rgba(0, 255, 136, 0.7)',

    // Context Menu
    '--qui-menu-bg': 'rgba(16, 24, 45, 0.98)',
    '--qui-menu-border': '1px solid rgba(0, 255, 136, 0.15)',
    '--qui-menu-shadow': '0 4px 20px rgba(0, 255, 136, 0.2)',
    '--qui-menu-item-height': '32px',
    '--qui-menu-item-hover': 'rgba(0, 255, 136, 0.1)',
    '--qui-menu-separator': 'rgba(0, 255, 136, 0.15)',
    '--qui-menu-disabled-opacity': '0.5',
    '--qui-menu-radius': '4px', // Added new variable for menus

    // Login Screen
    '--qui-login-bg': '#0e1127',
    '--qui-login-box-bg': 'rgba(16, 24, 45, 0.95)',
    '--qui-login-box-border': '1px solid rgba(0, 255, 136, 0.15)',
    '--qui-login-box-shadow': '0 0 30px rgba(0, 255, 136, 0.2)',
    '--qui-login-input-bg': 'rgba(14, 17, 39, 0.8)',
    '--qui-login-input-border': '1px solid rgba(0, 255, 136, 0.3)',
    '--qui-login-button-bg': '#00ff88',
    '--qui-login-button-hover': '#00b4ff',
    '--qui-login-button-text': '#0e1127',

    // Gradients
    '--qui-gradient-primary':
      'linear-gradient(135deg, rgba(14, 17, 39, 0.95), rgba(16, 24, 45, 0.95))',
    '--qui-gradient-secondary':
      'linear-gradient(135deg, rgba(0, 255, 136, 0.15), rgba(0, 180, 255, 0.15))',
    '--qui-gradient-accent': 'linear-gradient(135deg, rgba(0, 255, 136, 1), rgba(0, 180, 255, 1))',
    '--qui-gradient-window':
      'linear-gradient(135deg, rgba(16, 24, 45, 0.85), rgba(14, 17, 39, 0.95))',
    '--qui-gradient-taskbar':
      'linear-gradient(180deg, rgba(16, 24, 45, 0.9), rgba(14, 17, 39, 0.95))',
    '--qui-gradient-hover':
      'linear-gradient(135deg, rgba(0, 255, 136, 0.2), rgba(0, 180, 255, 0.2))',

    // Fonts
    '--qui-font-family':
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif",
    '--qui-font-size-base': '14px',
    '--qui-font-size-small': '12px',
    '--qui-font-size-large': '16px',
    '--qui-font-weight-normal': '400',
    '--qui-font-weight-medium': '500',
    '--qui-font-weight-bold': '600',
    '--qui-line-height': '1.5',

    // Danger Theme
    '--qui-danger-color': '#ff4444',
    '--qui-danger-bg': 'rgba(255, 68, 68, 0.1)',
    '--qui-danger-hover': 'rgba(255, 68, 68, 0.2)',
    '--qui-danger-border': 'rgba(255, 68, 68, 0.3)',
    '--qui-danger-glow': '0 0 20px rgba(255, 68, 68, 0.3)',

    // Effects
    '--qui-overlay-hover': 'rgba(255, 255, 255, 0.1)',
    '--qui-overlay-active': 'rgba(0, 255, 136, 0.1)',
    '--qui-border-opacity': '0.2',
    '--qui-shadow-opacity': '0.15',
    '--qui-shadow-glow': '0 0 30px',
    '--qui-backdrop-blur': '12px',

    // Effects & Shadows
    '--qui-shadow-default': '0 0 20px rgba(0, 0, 0, 0.2)',
    '--qui-shadow-window': '0 0 30px rgba(0, 0, 0, 0.3)',
    '--qui-shadow-taskbar': '0 -4px 20px rgba(0, 0, 0, 0.2)',
    '--qui-shadow-icon': 'drop-shadow(0 0 4px rgba(0, 255, 136, 0.2))',
    '--qui-shadow-icon-strong': 'drop-shadow(0 0 4px rgba(0, 255, 136, 0.4))',
    '--qui-shadow-accent': '0 0 15px rgba(0, 180, 255, 0.2)',
    '--qui-shadow-accent-strong': '0 0 20px rgba(0, 255, 136, 0.3)',

    // Overlays
    '--qui-overlay-primary': 'rgba(0, 255, 136, 0.1)',
    '--qui-overlay-secondary': 'rgba(0, 180, 255, 0.3)',
    '--qui-overlay-accent': 'rgba(255, 255, 255, 0.9)',
    '--qui-overlay-light': 'rgba(255, 255, 255, 0.1)',
    '--qui-hover-border': 'rgba(0, 255, 136, 0.3)',
  },
}
