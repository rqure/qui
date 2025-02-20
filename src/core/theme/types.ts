export interface ThemeVariables {
  // Global
  '--qui-bg-primary': string
  '--qui-bg-secondary': string
  '--qui-text-primary': string
  '--qui-text-secondary': string
  '--qui-accent-color': string
  '--qui-accent-secondary': string // Added
  '--qui-accent-deep': string // Added
  '--qui-shadow': string

  // Window
  '--qui-window-border': string
  '--qui-window-radius': string
  '--qui-titlebar-height': string
  '--qui-titlebar-bg': string
  '--qui-window-padding': string

  // Taskbar
  '--qui-taskbar-height': string
  '--qui-taskbar-bg': string
  '--qui-taskbar-border': string
  '--qui-taskbar-button-bg': string
  '--qui-taskbar-button-hover': string
  '--qui-taskbar-button-active': string

  // Start Menu
  '--qui-startmenu-width': string
  '--qui-startmenu-bg': string
  '--qui-startmenu-border': string
  '--qui-startmenu-shadow': string
  '--qui-startmenu-item-hover': string
  '--qui-startmenu-section-title': string

  // Context Menu
  '--qui-menu-bg': string
  '--qui-menu-border': string
  '--qui-menu-shadow': string
  '--qui-menu-item-height': string
  '--qui-menu-item-hover': string
  '--qui-menu-separator': string
  '--qui-menu-disabled-opacity': string

  // Login Screen
  '--qui-login-bg': string
  '--qui-login-box-bg': string
  '--qui-login-box-border': string
  '--qui-login-box-shadow': string
  '--qui-login-input-bg': string
  '--qui-login-input-border': string
  '--qui-login-button-bg': string
  '--qui-login-button-hover': string
  '--qui-login-button-text': string

  // Animations
  '--qui-transition-speed': string
  '--qui-hover-scale': string
  '--qui-glow-effect': string
  '--qui-glow-effect-strong': string
  '--qui-animation-bounce': string
  '--qui-animation-fade': string
}

export interface ComponentTheme {
  [key: string]: string | number
}

export interface Theme {
  name: string
  variables: Partial<ThemeVariables>
  components?: {
    [key: string]: ComponentTheme
  }
}
