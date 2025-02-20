export interface MenuItem {
  id: string
  label: string
  icon?: string
  disabled?: boolean
  shortcut?: string
  separator?: boolean
  action?: () => void
  children?: MenuItem[]
}

export interface MenuPosition {
  x: number
  y: number
}

export interface MenuContextData {
  id?: string
  [key: string]: unknown
}

export interface MenuContext {
  type: string
  data?: MenuContextData
}
