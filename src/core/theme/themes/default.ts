import type { Theme } from '../types'

export const defaultTheme: Theme = {
  name: 'default',
  variables: {
    // Global
    '--qui-bg-primary': '#1a1a1a',
    '--qui-bg-secondary': '#2a2a2a',
    '--qui-text-primary': '#ffffff',
    '--qui-text-secondary': '#cccccc',
    '--qui-accent-color': '#0066cc',
    '--qui-shadow': '0 4px 6px rgba(0, 0, 0, 0.1)',

    // Window
    '--qui-window-border': '1px solid #333333',
    '--qui-window-radius': '8px',
    '--qui-titlebar-height': '32px',
    '--qui-titlebar-bg': '#1a1a1a',
    '--qui-window-padding': '1rem',

    // Taskbar
    '--qui-taskbar-height': '40px',
    '--qui-taskbar-bg': '#2a2a2a',
    '--qui-taskbar-border': '1px solid #333333',
    '--qui-taskbar-button-bg': '#1a1a1a',
    '--qui-taskbar-button-hover': '#3a3a3a',
    '--qui-taskbar-button-active': '#0066cc',

    // Start Menu
    '--qui-startmenu-width': '240px',
    '--qui-startmenu-bg': '#2a2a2a',
    '--qui-startmenu-border': '1px solid #333333',
    '--qui-startmenu-shadow': '0 -4px 6px rgba(0, 0, 0, 0.1)',
    '--qui-startmenu-item-hover': '#0066cc',
    '--qui-startmenu-section-title': '#cccccc',

    // Context Menu
    '--qui-menu-bg': '#2a2a2a',
    '--qui-menu-border': '1px solid #333333',
    '--qui-menu-shadow': '0 2px 4px rgba(0, 0, 0, 0.2)',
    '--qui-menu-item-height': '28px',
    '--qui-menu-item-hover': '#0066cc',
    '--qui-menu-separator': '#333333',
    '--qui-menu-disabled-opacity': '0.5',
  },
}
