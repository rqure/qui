<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import type { MenuItem, MenuPosition } from '@/core/menu/types'
import { isSeparator } from '@/core/menu/utils'
import { useMenuStore } from '@/stores/menu'

// Extend MenuItem interface to support custom components
interface ExtendedMenuItem extends MenuItem {
  component?: any;
  props?: Record<string, any>;
}

interface Props {
  items?: MenuItem[];
  position?: MenuPosition;
  class?: string;
}

const props = withDefaults(defineProps<Props>(), {
  items: undefined,
  position: undefined,
  class: ''
});

defineEmits<{
  close: [];
}>();

const menuStore = useMenuStore()
const menuElement = ref<HTMLElement | null>(null)
const activeSubmenuIndex = ref<number | null>(null)
const submenuPosition = ref<MenuPosition>({ x: 0, y: 0 })
const adjustedPosition = ref<MenuPosition>({ x: 0, y: 0 })
const submenuCloseTimeout = ref<number | null>(null)
const submenuOpenTimeout = ref<number | null>(null)

// Handle menu item click
const handleItemClick = (e: Event, item: ExtendedMenuItem) => {
  // Don't close for items that are disabled or separators
  if (item.disabled || isSeparator(item)) return

  // For items with children, show submenu instead of closing
  if (item.children && item.children.length > 0) return

  // Don't trigger actions for custom component items
  if (!item.component) {
    if (item.action) {
      item.action()
    }
  }
  
  // Close the menu after action
  menuStore.hideMenu()
}

// Calculate and adjust menu position
const calculatePosition = () => {
  if (!menuElement.value) {
    // If menu element isn't available yet, use store position directly
    adjustedPosition.value = { ...menuStore.position }
    return
  }
  
  const menu = menuElement.value
  const menuRect = menu.getBoundingClientRect()
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  
  // Initial position
  let x = menuStore.position.x
  let y = menuStore.position.y
  
  // Adjust if menu would go off right edge
  if (x + menuRect.width > viewportWidth) {
    x = Math.max(0, viewportWidth - menuRect.width)
  }
  
  // Adjust if menu would go off bottom edge
  if (y + menuRect.height > viewportHeight) {
    y = Math.max(0, y - menuRect.height)
  }
  
  adjustedPosition.value = { x, y }
}

// Handle mouse enter for submenu items
const handleMouseEnter = (event: MouseEvent, index: number, item: MenuItem) => {
  // Clear any pending close timeout
  if (submenuCloseTimeout.value) {
    clearTimeout(submenuCloseTimeout.value)
    submenuCloseTimeout.value = null
  }
  
  if (item.children && item.children.length > 0 && !item.disabled) {
    // Clear any pending open timeout
    if (submenuOpenTimeout.value) {
      clearTimeout(submenuOpenTimeout.value)
    }
    
    // Set active index immediately for hover effect
    activeSubmenuIndex.value = index

    const targetElement = event.currentTarget as HTMLElement | null
    
    // Delay positioning to prevent accidental opening
    submenuOpenTimeout.value = window.setTimeout(() => {
      if (activeSubmenuIndex.value === index && targetElement) {
        const itemRect = targetElement.getBoundingClientRect()

        submenuPosition.value = {
          x: itemRect.right,
          y: itemRect.top,
        }
      }
      submenuOpenTimeout.value = null
    }, 150)
  } else {
    // Close submenu when hovering over non-submenu items
    submenuCloseTimeout.value = window.setTimeout(() => {
      activeSubmenuIndex.value = null
      submenuCloseTimeout.value = null
    }, 100)
  }
}

// Watch for position changes
watch(() => props.position || menuStore.position, (newPosition) => {
  // Set initial position immediately
  adjustedPosition.value = { ...newPosition }
  
  // Then calculate adjusted position after DOM update
  nextTick(calculatePosition)
}, { immediate: true })

// Watch for visibility changes
watch(() => menuStore.isVisible, (isVisible) => {
  if (isVisible) {
    // When menu becomes visible, calculate position after DOM update
    nextTick(calculatePosition)
  }
})

// Close on escape or outside click
const handleEscape = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    menuStore.hideMenu()
  }
}

const handleOutsideClick = (e: MouseEvent) => {
  // Check if click is inside ANY context menu (parent or submenu)
  // All context menus have the class 'context-menu'
  const clickedElement = e.target as HTMLElement;
  const isInsideAnyMenu = clickedElement.closest('.context-menu');
  
  if (!isInsideAnyMenu) {
    menuStore.hideMenu()
  }
}

onMounted(() => {
  // Only register global handlers for root menu (not submenus)
  if (!props.items) {
    document.addEventListener('keydown', handleEscape)
    document.addEventListener('mousedown', handleOutsideClick)
  }
  
  // Initial position calculation
  if (menuStore.isVisible || props.items) {
    nextTick(calculatePosition)
  }
})

onBeforeUnmount(() => {
  // Only remove handlers if this was a root menu
  if (!props.items) {
    document.removeEventListener('keydown', handleEscape)
    document.removeEventListener('mousedown', handleOutsideClick)
  }
  
  // Clear any pending timeouts
  if (submenuCloseTimeout.value) {
    clearTimeout(submenuCloseTimeout.value)
  }
  if (submenuOpenTimeout.value) {
    clearTimeout(submenuOpenTimeout.value)
  }
})

// Handle submenu close
const handleSubmenuClose = () => {
  activeSubmenuIndex.value = null
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="props.items ? true : menuStore.isVisible"
      ref="menuElement"
      :class="['context-menu', props.class]"
      :style="{
        left: `${props.position?.x ?? adjustedPosition.x}px`,
        top: `${props.position?.y ?? adjustedPosition.y}px`,
      }"
    >
      <div v-for="(item, index) in (props.items || menuStore.items)" :key="item.id">
        <!-- Render separator -->
        <div v-if="isSeparator(item)" class="menu-separator"></div>
        
        <!-- Render custom component if provided -->
        <div v-else-if="(item as ExtendedMenuItem).component" class="menu-custom-component">
          <component :is="(item as ExtendedMenuItem).component" v-bind="(item as ExtendedMenuItem).props || {}"></component>
        </div>
        
        <!-- Regular menu item -->
        <div
          v-else
          class="menu-item"
          :class="{
            disabled: item.disabled,
            'with-submenu': item.children && item.children.length > 0,
            active: index === activeSubmenuIndex
          }"
          @click.stop="(e) => handleItemClick(e, item)"
          @mouseenter="(event) => handleMouseEnter(event, index, item)"
        >
          <div class="item-content">
            <span v-if="item.icon" class="item-icon">{{ item.icon }}</span>
            <span class="item-label">{{ item.label }}</span>
          </div>
          <span v-if="item.shortcut" class="item-shortcut">{{ item.shortcut }}</span>
          <span v-if="item.children && item.children.length > 0" class="submenu-indicator">
            <svg viewBox="0 0 24 24" width="12" height="12">
              <path fill="currentColor" d="M8,5.14V19.14L19,12.14L8,5.14Z" />
            </svg>
          </span>
        </div>
        
        <!-- Render submenu if active -->
        <ContextMenuComponent
          v-if="index === activeSubmenuIndex && item.children"
          :class="'submenu'"
          :items="item.children"
          :position="submenuPosition"
          @close="handleSubmenuClose"
        />
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.context-menu {
  position: fixed;
  min-width: 180px;
  max-width: 280px;
  background: var(--qui-menu-bg);
  border: var(--qui-menu-border);
  border-radius: var(--qui-menu-radius);
  box-shadow: var(--qui-menu-shadow);
  padding: 6px;
  z-index: 9999;
  backdrop-filter: blur(var(--qui-backdrop-blur));
  pointer-events: auto;
}

.context-menu.submenu {
  z-index: 10000;
}

.menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--qui-menu-item-height);
  padding: 0 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s var(--qui-animation-bounce);
}

.menu-item:not(.disabled):hover,
.menu-item.active {
  background: var(--qui-menu-item-hover);
}

.menu-item.disabled {
  opacity: var(--qui-menu-disabled-opacity);
  cursor: default;
}

.item-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.item-icon {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}

.item-label {
  font-size: var(--qui-font-size-base);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-shortcut {
  font-size: var(--qui-font-size-small);
  color: var(--qui-text-secondary);
  opacity: 0.7;
}

.submenu-indicator {
  color: var(--qui-text-secondary);
  opacity: 0.7;
}

.menu-separator {
  height: 1px;
  background: var(--qui-menu-separator);
  margin: 4px 0;
}

.submenu {
  position: absolute;
  z-index: 10000;
}

.menu-custom-component {
  padding: 0;
}

.with-submenu:hover .submenu-indicator {
  opacity: 1;
  transform: translateX(2px);
}

.submenu-indicator {
  transition: all 0.2s var(--qui-animation-bounce);
}
</style>
