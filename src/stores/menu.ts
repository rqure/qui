import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { MenuItem, MenuPosition, MenuContext } from '@/core/menu/types'

export const useMenuStore = defineStore('menu', () => {
  const isVisible = ref(false)
  const position = ref<MenuPosition>({ x: 0, y: 0 })
  const items = ref<MenuItem[]>([])
  const context = ref<MenuContext | null>(null)

  function showMenu(pos: MenuPosition, menuItems: MenuItem[], ctx?: MenuContext) {
    position.value = pos
    items.value = menuItems
    context.value = ctx || null
    isVisible.value = true
  }

  function hideMenu() {
    isVisible.value = false
    items.value = []
    context.value = null
  }

  return {
    isVisible,
    position,
    items,
    context,
    showMenu,
    hideMenu,
  }
})
