import type { MenuItem } from './types'

export function isSeparator(item: Partial<MenuItem>): item is { id: string; separator: true } {
  return item.separator === true
}

// We can add more menu-related utilities here in the future
// Like menu positioning helpers, keyboard navigation, etc.
