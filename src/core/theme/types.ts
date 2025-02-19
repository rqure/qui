export interface ThemeVariables {
  '--qui-bg-primary': string
  '--qui-bg-secondary': string
  '--qui-text-primary': string
  '--qui-text-secondary': string
  '--qui-accent-color': string
  '--qui-window-border': string
  '--qui-shadow': string
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
