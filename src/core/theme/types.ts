export interface ThemeVariables {
  // Fonts
  '--qui-font-family': string
  '--qui-font-size-base': string
  '--qui-font-size-small': string
  '--qui-font-size-large': string
  '--qui-font-weight-normal': string
  '--qui-font-weight-medium': string
  '--qui-font-weight-bold': string
  '--qui-line-height': string

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
  '--qui-titlebar-border': string // Added
  '--qui-titlebar-active-bg': string // Added
  '--qui-window-bg': string // Added
  '--qui-window-padding': string

  // Taskbar
  '--qui-taskbar-height': string
  '--qui-taskbar-bg': string
  '--qui-taskbar-border': string
  '--qui-taskbar-button-bg': string
  '--qui-taskbar-button-hover': string
  '--qui-taskbar-button-active': string
  '--qui-taskbar-button-radius': string

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
  '--qui-menu-radius': string

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

  // Gradients
  '--qui-gradient-primary': string
  '--qui-gradient-secondary': string
  '--qui-gradient-accent': string
  '--qui-gradient-window': string
  '--qui-gradient-taskbar': string
  '--qui-gradient-hover': string

  // Danger Theme
  '--qui-danger-color': string
  '--qui-danger-bg': string
  '--qui-danger-hover': string
  '--qui-danger-border': string
  '--qui-danger-glow': string

  // Effects & Overlays
  '--qui-backdrop-blur': string
  '--qui-border-opacity': string
  '--qui-shadow-opacity': string

  // Shadows
  '--qui-shadow-glow': string
  '--qui-shadow-default': string
  '--qui-shadow-window': string
  '--qui-shadow-taskbar': string
  '--qui-shadow-accent': string
  '--qui-shadow-accent-strong': string

  // Icon Effects
  '--qui-shadow-icon': string
  '--qui-shadow-icon-strong': string

  // Overlays & Hovers
  '--qui-overlay-hover': string
  '--qui-overlay-active': string
  '--qui-overlay-primary': string
  '--qui-overlay-secondary': string
  '--qui-overlay-accent': string
  '--qui-overlay-light': string
  '--qui-hover-border': string

  // Interactive Effects
  '--qui-hover-lift': string
  '--qui-active-scale': string
  '--qui-hover-rotation': string
  '--qui-shine-effect': string
  '--qui-glow-opacity': string
  '--qui-interaction-speed': string
  '--qui-shine-speed': string
  '--qui-shadow-hover': string
  '--qui-shadow-active': string
  '--qui-inset-shadow': string
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
