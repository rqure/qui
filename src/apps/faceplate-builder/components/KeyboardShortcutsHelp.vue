<script setup lang="ts">
import { ref } from 'vue';

const isOpen = ref(false);

function toggle() {
  isOpen.value = !isOpen.value;
}

defineExpose({ toggle });
</script>

<template>
  <div class="shortcuts-help">
    <button 
      type="button" 
      class="shortcuts-help__trigger" 
      @click="toggle"
      title="Keyboard Shortcuts (? or Shift+?)"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
        <circle cx="12" cy="17" r="0.5" fill="currentColor"/>
      </svg>
    </button>
    
    <div v-if="isOpen" class="shortcuts-help__overlay" @click="toggle">
      <div class="shortcuts-help__dialog" @click.stop>
        <header class="shortcuts-help__header">
          <h3>Keyboard Shortcuts</h3>
          <button type="button" class="shortcuts-help__close" @click="toggle">✕</button>
        </header>
        
        <div class="shortcuts-help__content">
          <section class="shortcuts-section">
            <h4>General</h4>
            <div class="shortcut-row">
              <span class="shortcut-keys"><kbd>Ctrl/Cmd</kbd> + <kbd>S</kbd></span>
              <span class="shortcut-desc">Save faceplate</span>
            </div>
            <div class="shortcut-row">
              <span class="shortcut-keys"><kbd>Ctrl/Cmd</kbd> + <kbd>Z</kbd></span>
              <span class="shortcut-desc">Undo</span>
            </div>
            <div class="shortcut-row">
              <span class="shortcut-keys"><kbd>Ctrl/Cmd</kbd> + <kbd>Shift</kbd> + <kbd>Z</kbd></span>
              <span class="shortcut-desc">Redo</span>
            </div>
            <div class="shortcut-row">
              <span class="shortcut-keys"><kbd>Ctrl/Cmd</kbd> + <kbd>Y</kbd></span>
              <span class="shortcut-desc">Redo (alternative)</span>
            </div>
          </section>
          
          <section class="shortcuts-section">
            <h4>Selection & Editing</h4>
            <div class="shortcut-row">
              <span class="shortcut-keys"><kbd>Ctrl/Cmd</kbd> + <kbd>A</kbd></span>
              <span class="shortcut-desc">Select all components</span>
            </div>
            <div class="shortcut-row">
              <span class="shortcut-keys"><kbd>Delete</kbd> or <kbd>Backspace</kbd></span>
              <span class="shortcut-desc">Delete selected</span>
            </div>
            <div class="shortcut-row">
              <span class="shortcut-keys"><kbd>Ctrl/Cmd</kbd> + <kbd>C</kbd></span>
              <span class="shortcut-desc">Copy selected</span>
            </div>
            <div class="shortcut-row">
              <span class="shortcut-keys"><kbd>Ctrl/Cmd</kbd> + <kbd>V</kbd></span>
              <span class="shortcut-desc">Paste</span>
            </div>
            <div class="shortcut-row">
              <span class="shortcut-keys"><kbd>Ctrl/Cmd</kbd> + <kbd>D</kbd></span>
              <span class="shortcut-desc">Duplicate selected</span>
            </div>
            <div class="shortcut-row">
              <span class="shortcut-keys"><kbd>Shift</kbd> + <kbd>Click</kbd></span>
              <span class="shortcut-desc">Multi-select</span>
            </div>
            <div class="shortcut-row">
              <span class="shortcut-keys"><kbd>Drag</kbd> on canvas</span>
              <span class="shortcut-desc">Box select multiple</span>
            </div>
          </section>
          
          <section class="shortcuts-section">
            <h4>Canvas & View</h4>
            <div class="shortcut-row">
              <span class="shortcut-keys"><kbd>Ctrl/Cmd</kbd> + <kbd>+</kbd></span>
              <span class="shortcut-desc">Zoom in</span>
            </div>
            <div class="shortcut-row">
              <span class="shortcut-keys"><kbd>Ctrl/Cmd</kbd> + <kbd>-</kbd></span>
              <span class="shortcut-desc">Zoom out</span>
            </div>
            <div class="shortcut-row">
              <span class="shortcut-keys"><kbd>Ctrl/Cmd</kbd> + <kbd>0</kbd></span>
              <span class="shortcut-desc">Reset zoom (100%)</span>
            </div>
            <div class="shortcut-row">
              <span class="shortcut-keys"><kbd>Ctrl/Cmd</kbd> + <kbd>Scroll</kbd></span>
              <span class="shortcut-desc">Zoom at cursor</span>
            </div>
            <div class="shortcut-row">
              <span class="shortcut-keys"><kbd>Middle-click</kbd> drag</span>
              <span class="shortcut-desc">Pan canvas</span>
            </div>
          </section>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.shortcuts-help {
  position: relative;
}

.shortcuts-help__trigger {
  padding: 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: var(--qui-text-primary);
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.shortcuts-help__trigger:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(0, 255, 194, 0.4);
}

.shortcuts-help__overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.shortcuts-help__dialog {
  position: relative;
  width: 90%;
  max-width: 700px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  background: rgba(8, 16, 24, 0.98);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 16px;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.6);
  overflow: hidden;
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.shortcuts-help__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 28px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 255, 194, 0.05);
}

.shortcuts-help__header h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  letter-spacing: 0.03em;
  color: var(--qui-text-primary);
}

.shortcuts-help__close {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 6px;
  font-size: 24px;
  color: var(--qui-text-primary);
  cursor: pointer;
  transition: background 0.2s;
}

.shortcuts-help__close:hover {
  background: rgba(255, 255, 255, 0.1);
}

.shortcuts-help__content {
  flex: 1;
  overflow-y: auto;
  padding: 24px 28px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 28px;
}

.shortcuts-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.shortcuts-section h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgba(0, 255, 194, 0.9);
  opacity: 0.9;
}

.shortcut-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.shortcut-row:last-child {
  border-bottom: none;
}

.shortcut-keys {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  white-space: nowrap;
}

.shortcut-keys kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  font-size: 12px;
  font-family: 'SF Mono', 'Monaco', 'Courier New', monospace;
  font-weight: 500;
  color: var(--qui-text-primary);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.shortcut-desc {
  flex: 1;
  text-align: right;
  font-size: 13px;
  color: var(--qui-text-secondary);
}

@media (max-width: 768px) {
  .shortcuts-help__content {
    grid-template-columns: 1fr;
  }
}
</style>
