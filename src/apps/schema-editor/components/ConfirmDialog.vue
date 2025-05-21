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
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.schema-editor-confirm-dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--qui-hover-border);
}

.type-info .schema-editor-confirm-dialog-header {
  background: var(--qui-titlebar-bg);
}

.type-warning .schema-editor-confirm-dialog-header {
  background: rgba(255, 152, 0, 0.1);
  color: #FF9800;
}

.type-danger .schema-editor-confirm-dialog-header {
  background: rgba(244, 67, 54, 0.1);
  color: #F44336;
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
  width: 28px;
  height: 28px;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.schema-editor-confirm-dialog-close-btn:hover {
  background: var(--qui-overlay-primary);
  color: var(--qui-text-primary);
}

.schema-editor-confirm-dialog-body {
  padding: 20px;
  max-height: 300px;
  overflow-y: auto;
}

.schema-editor-confirm-dialog-body p {
  margin: 0 0 12px 0;
  line-height: 1.5;
}

.schema-editor-confirm-dialog-body p:last-child {
  margin-bottom: 0;
}

.schema-editor-confirm-dialog-footer {
  padding: 12px 20px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  border-top: 1px solid var(--qui-hover-border);
  background: var(--qui-bg-secondary);
}
</style>
