<script setup lang="ts">
import { ref, defineComponent, markRaw, onMounted, onUnmounted } from 'vue'
import { useWindowStore } from '@/stores/windows'
import StartMenuComponent from './StartMenuComponent.vue'
import { useMenuStore } from '@/stores/menu'
import QeiLogo from '@/components/common/QeiLogo.vue'
import SystemTray from './tray/SystemTray.vue'

const TestWindow = markRaw(
  defineComponent({
    name: 'TestWindow',
    template: '<div>Test Window Content</div>',
  }),
)

const windowStore = useWindowStore()
const isStartMenuOpen = ref(false)
const menuStore = useMenuStore()
const isAnimating = ref(false)

const toggleStartMenu = () => {
  isStartMenuOpen.value = !isStartMenuOpen.value
}

const createTestWindow = () => {
  windowStore.createWindow({
    title: 'Test Window',
    width: 400,
    height: 300,
    component: TestWindow,
  })
  isStartMenuOpen.value = false
}

const handleTaskbarContext = (e: MouseEvent) => {
  e.preventDefault()
  menuStore.showMenu(
    { x: e.clientX, y: e.clientY },
    [
      {
        id: 'taskbar-position',
        label: 'Taskbar Position',
        children: [
          { id: 'position-bottom', label: 'Bottom', action: () => {} },
          { id: 'position-top', label: 'Top', action: () => {} },
        ],
      },
      { id: 'sep1', separator: true, label: '' },
      { id: 'taskbar-settings', label: 'Taskbar Settings', action: () => {} },
    ],
    { type: 'taskbar' },
  )
}

const handleWindowItemContext = (e: MouseEvent, windowId: string) => {
  e.preventDefault()
  e.stopPropagation()
  menuStore.showMenu(
    { x: e.clientX, y: e.clientY },
    [
      { id: 'activate', label: 'Activate', action: () => windowStore.activateWindow(windowId) },
      { id: 'close', label: 'Close', action: () => windowStore.closeWindow(windowId) },
    ],
    { type: 'taskbar-window', data: { windowId } },
  )
}

const handleClickOutside = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (isStartMenuOpen.value && !target?.closest('.start-btn') && !target?.closest('.start-menu')) {
    isStartMenuOpen.value = false
  }
}

// Add event handler for taskbar click
const handleTaskbarButtonClick = (windowId: string) => {
  const window = windowStore.windows.find((w) => w.id === windowId)
  if (!window) return

  if (window.isMinimized) {
    windowStore.unminimizeWindow(windowId)
  } else if (window.id === windowStore.activeWindow?.id) {
    windowStore.minimizeWindow(windowId)
  } else {
    windowStore.activateWindow(windowId)
  }
}

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside)
})
</script>

<template>
  <div class="taskbar" @contextmenu.prevent="handleTaskbarContext">
    <QeiLogo size="small" class="start-btn" @click="toggleStartMenu" />
    <StartMenuComponent
      v-if="isStartMenuOpen"
      @create-window="createTestWindow"
      @close="isStartMenuOpen = false"
    />
    <div class="window-list">
      <button
        v-for="window in windowStore.windows"
        :key="window.id"
        :class="[
          'window-button',
          {
            active: window.id === windowStore.activeWindow?.id && !window.isMinimized,
            minimized: window.isMinimized,
          },
        ]"
        @click="handleTaskbarButtonClick(window.id)"
        @contextmenu="(e) => handleWindowItemContext(e, window.id)"
      >
        <div class="window-button-content">
          <img v-if="window.icon" :src="window.icon" class="window-icon" :alt="window.title" />
          <div v-else class="window-icon-placeholder" />
          <span class="window-title">{{ window.title }}</span>
        </div>
        <div class="active-indicator" />
      </button>
    </div>
    
    <!-- Use the refactored System Tray component -->
    <SystemTray />
  </div>
</template>

<style scoped>
.taskbar {
  display: flex;
  align-items: stretch; /* Changed from center to stretch */
  gap: 8px;
  height: var(--qui-taskbar-height);
  padding: 0 8px;
  background: var(--qui-gradient-taskbar);
  backdrop-filter: blur(var(--qui-backdrop-blur));
  border-top: var(--qui-taskbar-border);
  box-shadow: var(--qui-shadow-taskbar);
  z-index: 9999; /* Increased z-index */
  isolation: isolate; /* Create stacking context */
  transform: translateZ(0); /* Force GPU acceleration */
  will-change: transform; /* Optimize compositing */
}

/* Completely revise start button styles */
.start-btn {
  position: relative; /* Ensure this is set for absolute positioning */
  padding: 0 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(
    to bottom,
    rgba(var(--qui-accent-color), 0.15),
    rgba(var(--qui-accent-secondary), 0.15)
  );
  border: 1px solid rgba(var(--qui-accent-color), 0.25);
  border-radius: var(--qui-taskbar-button-radius);
  cursor: pointer;
  overflow: hidden; /* Change to visible to show indicators */
}

/* Glowing border indicator */
.start-btn::before {
  content: '';
  position: absolute;
  inset: -1px;
  background: linear-gradient(135deg, var(--qui-accent-color), var(--qui-accent-secondary));
  border-radius: var(--qui-taskbar-button-radius);
  opacity: 0.2;
  z-index: -2;
  pointer-events: none;
}

/* Pulsing dot indicator */
.start-btn::after {
  content: '';
  position: absolute;
  right: 4px;
  top: 4px;
  width: 6px;
  height: 6px;
  background: var(--qui-accent-color);
  border-radius: 50%;
  z-index: 1;
  pointer-events: none;
  animation: startPulse 2s ease-in-out infinite;
}

@keyframes startPulse {
  0%,
  100% {
    transform: scale(0.8);
    opacity: 0.5;
  }
  50% {
    transform: scale(1.2);
    opacity: 1;
  }
}

.start-btn:hover {
  transform: translateY(-1px);
  border-color: rgba(var(--qui-accent-color), 0.4);
}

.start-btn:hover::before {
  opacity: 0.4;
  filter: blur(8px);
}

.start-btn,
.window-button {
  height: 100%; /* Changed from fixed height */
  margin: 0; /* Remove margin */
  display: flex;
  align-items: center;
}

/* Remove old start button styles */
.start-icon,
.start-text {
  display: none;
}

.window-list {
  display: flex;
  gap: 4px;
  flex: 1; /* Allow window list to expand */
}

.window-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  background: var(--qui-gradient-primary);
  border: 1px solid rgba(var(--qui-accent-color), var(--qui-border-opacity));
  border-radius: var(--qui-taskbar-button-radius);
  color: var(--qui-text-primary);
  position: relative;
  min-width: 160px;
  max-width: 200px;
  font-size: var(--qui-font-size-base);
  font-family: var(--qui-font-family);
  cursor: pointer;
  transition:
    transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
    opacity 0.2s ease-out,
    border-color 0.3s ease;
  overflow: hidden;
}

.window-button::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--qui-gradient-secondary);
  opacity: 0;
  transition: opacity 0.2s var(--qui-animation-fade);
}

.window-button:hover {
  transform: translateY(-1px);
}

.window-button:active {
  transform: scale(0.95);
}

/* Prevent hover effects during minimizing/unminimizing */
.window-button[data-animating] {
  pointer-events: none;
  transition: none;
}

.window-button:hover::before {
  opacity: 0.2;
}

.window-button:active {
  transform: scale(0.98) translateY(0);
}

.window-button.active {
  opacity: 1;
  transform: translateY(-1px);
  background: var(--qui-gradient-secondary);
  border-color: var(--qui-overlay-secondary);
  box-shadow: var(--qui-shadow-accent);

  /* Force active state to be more visible */
  transform: translateY(-1px);

  .window-title {
    opacity: 1;
  }
}

.window-button.active::before {
  opacity: 0.3;
}

.window-button.minimized {
  opacity: 0.7;
  transform: scale(0.95) translateY(2px);
}

.window-button.minimized:hover {
  opacity: 0.9;
  transform: scale(1) translateY(-1px);
}

.window-button-content {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  position: relative;
  z-index: 1;
}

.window-icon {
  width: 16px;
  height: 16px;
  object-fit: contain;
  flex-shrink: 0;
  filter: var(--qui-shadow-icon);
}

.window-icon-placeholder {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  background: var(--qui-accent-color);
  opacity: 0.3;
  border-radius: 2px;
}

.window-title {
  flex: 1;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--qui-font-size-base);
  font-weight: var(--qui-font-weight-normal);
  color: var(--qui-text-primary);
}

.active-indicator {
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 2px;
  background: var(--qui-gradient-accent);
  opacity: 0;
  transform: scaleX(0.7);
  transition: all 0.3s var(--qui-animation-bounce);
}

.window-button.active .active-indicator {
  opacity: 1;
  transform: scaleX(1);
}

.window-button.minimized {
  opacity: 0.7;
  transform: translateY(2px);
}

.window-button.minimized:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.window-button[data-animating] {
  pointer-events: none;
}

/* System Tray Styles */
.system-tray {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  margin-left: auto;
  padding-left: 12px;
  height: 100%;
  position: relative;
}

/* Add subtle separator before system tray */
.system-tray::before {
  content: '';
  position: absolute;
  left: 0;
  top: 25%;
  bottom: 25%;
  width: 1px;
  background: var(--qui-overlay-primary);
  opacity: 0.3;
}

.tray-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 4px;
  cursor: pointer;
  color: var(--qui-text-secondary);
  transition: all 0.2s var(--qui-animation-bounce);
}

.tray-icon:hover {
  background-color: var(--qui-overlay-primary);
  color: var(--qui-text-primary);
}

.tray-icon:active {
  transform: scale(0.95);
}

/* Network icon specifics */
.network-icon.disconnected {
  color: var(--qui-danger-color);
  opacity: 0.8;
}

.network-icon.disconnected:hover {
  opacity: 1;
}

/* Volume icon specifics */
.volume-icon.muted {
  color: var(--qui-text-secondary);
  opacity: 0.7;
}

/* Time and date display */
.time-date-container {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
  min-width: 90px;
  padding: 0 6px;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s var(--qui-animation-bounce);
}

.time-date-container:hover {
  background-color: var(--qui-overlay-primary);
}

.time-date-container:active {
  transform: scale(0.98);
}

.time {
  font-size: var(--qui-font-size-base);
  font-weight: var(--qui-font-weight-medium);
  color: var(--qui-text-primary);
}

.date {
  font-size: var(--qui-font-size-small);
  color: var(--qui-text-secondary);
}
</style>
