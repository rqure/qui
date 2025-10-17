<template>
  <div class="window-content">
    <div class="warning-content">
      <div class="warning-icon">⚠️</div>
      <p class="warning-message">
        Are you sure you want to delete this shape?
      </p>
      <p class="warning-details">
        This action cannot be undone.
      </p>
    </div>

    <div class="window-footer">
      <button @click="cancel" class="btn btn-secondary">Cancel</button>
      <button @click="confirm" class="btn btn-danger">
        Delete Shape
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useWindowStore } from '@/stores/windows';

const props = defineProps<{
  windowId?: string;
}>();

const emit = defineEmits<{
  (e: 'confirm'): void;
  (e: 'cancel'): void;
}>();

const windowStore = useWindowStore();

function confirm() {
  emit('confirm');
  // Don't close the window here - let the parent handle it
}

function cancel() {
  emit('cancel');
  // Don't close the window here - let the parent handle it
}
</script>

<style scoped>
.window-content {
  padding: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 24px;
}

.warning-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 16px;
  flex: 1;
  justify-content: center;
}

.warning-icon {
  font-size: 48px;
  opacity: 0.8;
}

.warning-message {
  margin: 0;
  font-size: var(--qui-font-size-base);
  color: var(--qui-text-primary);
  font-weight: var(--qui-font-weight-medium);
}

.warning-details {
  margin: 0;
  font-size: var(--qui-font-size-small);
  color: var(--qui-text-secondary);
  opacity: 0.8;
}

.window-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 0 0 0;
  border-top: var(--qui-window-border);
  width: 100%;
  flex-shrink: 0;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: var(--qui-window-radius);
  font-size: var(--qui-font-size-base);
  font-weight: var(--qui-font-weight-medium);
  cursor: pointer;
  transition: all var(--qui-interaction-speed);
  font-family: var(--qui-font-family);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--qui-bg-secondary);
  color: var(--qui-text-primary);
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--qui-overlay-hover);
}

.btn-danger {
  background: var(--qui-danger-color);
  color: white;
  box-shadow: var(--qui-danger-glow);
}

.btn-danger:hover {
  background: var(--qui-danger-hover);
  transform: var(--qui-hover-lift);
  box-shadow: var(--qui-danger-glow);
}
</style>