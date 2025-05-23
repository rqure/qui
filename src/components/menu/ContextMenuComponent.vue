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

const menuStore = useMenuStore()

const props = defineProps<{
  items: ExtendedMenuItem[]
  position: MenuPosition
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'select', item: MenuItem): void
}>()

const menuElement = ref<HTMLElement | null>(null)
const activeSubmenuIndex = ref<number | null>(null)
const submenuPosition = ref<MenuPosition>({ x: 0, y: 0 })
const adjustedPosition = ref<MenuPosition>({ x: 0, y: 0 })

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
  emit('close')
}

// Calculate and adjust menu position
const calculatePosition = () => {
  if (!menuElement.value) return
  
  const menu = menuElement.value
  const menuRect = menu.getBoundingClientRect()
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  
  // Initial position
  let x = props.position.x
  let y = props.position.y
  
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
const handleMouseEnter = (index: number, item: MenuItem) => {
  if (item.children && item.children.length > 0 && !item.disabled) {
    activeSubmenuIndex.value = index
    
    // Delay slightly to prevent accidental opening
    setTimeout(() => {
      if (menuElement.value) {
        const itemElement = menuElement.value.querySelectorAll('.menu-item')[index] as HTMLElement
        const itemRect = itemElement.getBoundingClientRect()
        
        submenuPosition.value = {
          x: itemRect.right,
          y: itemRect.top,
        }
      }
    }, 50)
  } else {
    activeSubmenuIndex.value = null
  }
}

// Handle mouse leave for menu
const handleMenuLeave = () => {
  // Use timeout to prevent immediate closing when moving to submenu
  setTimeout(() => {
    if (!activeSubmenuIndex.value) return
    
    // Check if mouse is over submenu
    const submenuElement = document.querySelector('.submenu')
    if (submenuElement) {
      const submenuRect = submenuElement.getBoundingClientRect()
      const mouseX = window.event ? (window.event as MouseEvent).clientX : 0
      const mouseY = window.event ? (window.event as MouseEvent).clientY : 0
      
      if (
        mouseX >= submenuRect.left &&
        mouseX <= submenuRect.right &&
        mouseY >= submenuRect.top &&
        mouseY <= submenuRect.bottom
      ) {
        return
      }
    }
    
    activeSubmenuIndex.value = null
  }, 100)
}

// Watch for position changes
watch(() => props.position, calculatePosition, { immediate: true })

// Close on escape or outside click
const handleEscape = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    emit('close')
  }
}

const handleOutsideClick = (e: MouseEvent) => {
  if (menuElement.value && !menuElement.value.contains(e.target as Node)) {
    emit('close')
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleEscape)
  document.addEventListener('mousedown', handleOutsideClick)
  
  // Calculate position after component is mounted
  nextTick(() => {
    calculatePosition()
  })
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleEscape)
  document.removeEventListener('mousedown', handleOutsideClick)
})

// Handle submenu close
const handleSubmenuClose = () => {
  activeSubmenuIndex.value = null
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="menuStore.isVisible"
      ref="menuElement"
      class="context-menu"
      :style="{
        left: `${adjustedPosition.x}px`,
        top: `${adjustedPosition.y}px`,
      }"
      @mouseleave="handleMenuLeave"
    >
      <div v-for="(item, index) in items" :key="item.id">
        <!-- Render separator -->
        <div v-if="isSeparator(item)" class="menu-separator"></div>
        
        <!-- Render custom component if provided -->
        <div v-else-if="item.component" class="menu-custom-component">
          <component :is="item.component" v-bind="item.props || {}"></component>
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
          @click="(e) => handleItemClick(e, item)"
          @mouseenter="() => handleMouseEnter(index, item)"
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
          class="submenu"
          :items="item.children"
          :position="submenuPosition"
          @close="handleSubmenuClose"
          @select="(item) => $emit('select', item)"
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
