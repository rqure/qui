<script setup lang="ts">
import { defineEmits, defineProps } from 'vue';

const props = defineProps<{
  show: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'info' | 'warning' | 'danger';
}>();

const emit = defineEmits<{
  (e: 'confirm'): void;
  (e: 'cancel'): void;
}>();

function confirm() {
  emit('confirm');
}

function cancel() {
  emit('cancel');
}
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="schema-editor-dialog-backdrop">
      <div class="schema-editor-panel schema-editor-anim-scale" :class="`type-${type || 'info'}`">
        <div class="schema-editor-confirm-dialog-header">
          <h3 class="schema-editor-confirm-dialog-title">{{ title }}</h3>
          <button class="schema-editor-confirm-dialog-close-btn" @click="cancel">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
              <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
        <div class="schema-editor-confirm-dialog-body">
          <p>{{ message }}</p>
        </div>
        <div class="schema-editor-confirm-dialog-footer">
          <button class="schema-editor-btn schema-editor-btn-secondary" @click="cancel">
            {{ cancelText || 'Cancel' }}
          </button>
          <button 
            class="schema-editor-btn" 
            :class="type === 'danger' ? 'schema-editor-btn-danger' : 'schema-editor-btn-primary'"
            @click="confirm"
          >
            {{ confirmText || 'Confirm' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.schema-editor-dialog-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: fade-in 0.2s ease-out;
  padding: 16px;
  box-sizing: border-box;
}

.schema-editor-panel {
  min-width: 400px;
  max-width: 90vw;
  background: var(--qui-bg-primary);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: var(--qui-shadow-default), 0 15px 35px rgba(0, 0, 0, 0.15);
  border: 1px solid var(--qui-hover-border);
  position: relative;
  width: auto;
}

.schema-editor-confirm-dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 24px;
  border-bottom: 1px solid var(--qui-hover-border);
  position: relative;
}

.schema-editor-confirm-dialog-header::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: -1px;
  width: 50px;
  height: 2px;
  background: var(--qui-accent-color);
  box-shadow: var(--qui-shadow-accent);
  transition: width 0.3s ease;
}

.schema-editor-panel:hover .schema-editor-confirm-dialog-header::after {
  width: 70px;
}

.type-info .schema-editor-confirm-dialog-header {
  background: var(--qui-titlebar-bg);
}

.type-warning .schema-editor-confirm-dialog-header {
  background: rgba(255, 152, 0, 0.1);
  color: #FF9800;
}

.type-warning .schema-editor-confirm-dialog-header::after {
  background: #FF9800;
  box-shadow: 0 0 10px rgba(255, 152, 0, 0.3);
}

.type-danger .schema-editor-confirm-dialog-header {
  background: rgba(244, 67, 54, 0.1);
  color: #F44336;
}

.type-danger .schema-editor-confirm-dialog-header::after {
  background: #F44336;
  box-shadow: 0 0 10px rgba(244, 67, 54, 0.3);
}

.schema-editor-confirm-dialog-title {
  margin: 0;
  font-size: 18px;
  font-weight: var(--qui-font-weight-medium);
}

.schema-editor-confirm-dialog-close-btn {
  background: transparent;
  border: none;
  color: var(--qui-text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.schema-editor-confirm-dialog-close-btn:hover {
  background: var(--qui-overlay-primary);
  color: var(--qui-text-primary);
  transform: rotate(90deg);
}

.schema-editor-confirm-dialog-close-btn:active {
  transform: rotate(90deg) scale(0.9);
}

.schema-editor-confirm-dialog-body {
  padding: 24px;
  max-height: 400px;
  overflow-y: auto;
}

.schema-editor-confirm-dialog-body p {
  margin: 0 0 12px 0;
  line-height: 1.6;
  color: var(--qui-text-primary);
}

.schema-editor-confirm-dialog-footer {
  padding: 18px 24px;
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  border-top: 1px solid var(--qui-hover-border);
  background: var(--qui-bg-secondary);
}

.schema-editor-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 0 16px; /* Smaller padding */
  height: 32px; /* Smaller consistent height */
  border-radius: 4px; /* Consistent with app design */
  font-size: var(--qui-font-size-base);
  font-weight: var(--qui-font-weight-medium);
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.schema-editor-btn-primary {
  background: var(--qui-accent-color);
  color: white;
  border: none;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.schema-editor-btn-primary:hover {
  background: var(--qui-accent-secondary);
  transform: translateY(-2px);
  box-shadow: var(--qui-shadow-accent), 0 5px 15px rgba(0, 0, 0, 0.1);
}

.schema-editor-btn-primary:active {
  transform: translateY(0);
  box-shadow: 0 2px 3px rgba(0, 0, 0, 0.1);
}

.schema-editor-btn-secondary {
  background: var(--qui-overlay-primary);
  color: var(--qui-text-primary);
  border: 1px solid var(--qui-hover-border);
}

.schema-editor-btn-secondary:hover {
  background: var(--qui-overlay-secondary);
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.05);
}

.schema-editor-btn-secondary:active {
  transform: translateY(0);
  box-shadow: none;
}

.schema-editor-btn-danger {
  background: var(--qui-danger-bg);
  color: var(--qui-danger-color);
  border: 1px solid var(--qui-danger-border);
  box-shadow: 0 2px 5px rgba(244, 67, 54, 0.1);
}

.schema-editor-btn-danger:hover {
  background: var(--qui-danger-color);
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 0 0 2px var(--qui-danger-glow), 0 5px 15px rgba(244, 67, 54, 0.2);
}

.schema-editor-btn-danger:active {
  transform: translateY(0);
  box-shadow: 0 0 0 2px var(--qui-danger-glow);
}

.schema-editor-anim-scale {
  animation: schema-editor-scale-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

@keyframes schema-editor-scale-in {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@media (max-width: 768px) {
  .schema-editor-panel {
    width: 100%;
    min-width: unset;
  }
  
  .schema-editor-confirm-dialog-header {
    padding: 16px 20px;
  }
  
  .schema-editor-confirm-dialog-body {
    padding: 20px;
  }
  
  .schema-editor-confirm-dialog-footer {
    padding: 16px 20px;
  }
  
  .schema-editor-btn {
    height: 42px;
    padding: 0 16px;
  }
}
</style>
