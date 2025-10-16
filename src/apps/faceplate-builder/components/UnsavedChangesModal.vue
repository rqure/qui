<template>
  <div class="window-content">
    <div class="warning-content">
      <div class="warning-icon">⚠️</div>
      <p class="warning-message">
        You have unsaved changes.
      </p>
      <p class="warning-details">
        {{ message }}
      </p>
    </div>

    <div class="window-footer">
      <button @click="cancel" class="btn btn-secondary">Cancel</button>
      <button @click="confirm" class="btn btn-primary">
        {{ confirmText }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useWindowStore } from '@/stores/windows';

const props = defineProps<{
  windowId?: string;
  message: string;
  confirmText: string;
}>();

const emit = defineEmits<{
  (e: 'confirm'): void;
  (e: 'cancel'): void;
}>();

const windowStore = useWindowStore();

function confirm() {
  emit('confirm');
  windowStore.closeWindow(props.windowId!);
}

function cancel() {
  emit('cancel');
  windowStore.closeWindow(props.windowId!);
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

.btn-primary {
  background: var(--qui-accent-color);
  color: var(--qui-bg-primary);
  box-shadow: var(--qui-shadow-accent);
}

.btn-primary:hover:not(:disabled) {
  background: color-mix(in srgb, var(--qui-accent-color, #00ff88) 110%, white);
  box-shadow: var(--qui-shadow-accent-strong);
  transform: translateY(-1px);
}

.btn-secondary {
  background: var(--qui-bg-secondary);
  color: var(--qui-text-primary);
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.btn-secondary:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.05);
}
</style>