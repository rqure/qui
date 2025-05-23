import { defineStore } from 'pinia'
import type { MenuItem, MenuPosition, MenuContext } from '@/core/menu/types'
import { markRaw } from 'vue'

// Extend MenuItem to support custom components
interface ExtendedMenuItem extends MenuItem {
  component?: any;
  props?: Record<string, any>;
}

export const useMenuStore = defineStore('menu', {
  state: () => ({
    isVisible: false,
    position: { x: 0, y: 0 } as MenuPosition,
    items: [] as ExtendedMenuItem[],
    context: null as MenuContext | null,
  }),

  actions: {
    showMenu(position: MenuPosition, items: ExtendedMenuItem[], context?: MenuContext) {
      // Process components if they exist
      const processedItems = items.map(item => {
        if (item.component) {
          return {
            ...item,
            component: markRaw(item.component) // Ensure component is marked as raw
          };
        }
        return item;
      });

      this.isVisible = true
      this.position = position
      this.items = processedItems
      this.context = context || null
    },

    hideMenu() {
      this.isVisible = false
    },

    setItems(items: ExtendedMenuItem[]) {
      this.items = items
    },

    setPosition(position: MenuPosition) {
      this.position = position
    },

    setContext(context: MenuContext) {
      this.context = context
    },
  },
})
