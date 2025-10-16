<template>
  <div class="window-content">
    <div class="error-content">
      <div class="error-icon">⚠️</div>
      <div class="error-message">{{ message }}</div>
      <div v-if="details" class="error-details">
        <details>
          <summary>Technical Details</summary>
          <pre>{{ details }}</pre>
        </details>
      </div>
    </div>

    <div class="window-footer">
      <button @click="close" class="btn btn-primary">OK</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useWindowStore } from '@/stores/windows';

const props = defineProps<{
  windowId?: string;
  message: string;
  details?: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const windowStore = useWindowStore();

function close() {
  emit('close');
  windowStore.closeWindow(props.windowId!);
}
</script>

<style scoped>
.window-content {
  padding: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.error-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  text-align: center;
  flex: 1;
}

.error-icon {
  font-size: 48px;
  opacity: 0.8;
}

.error-message {
  font-size: var(--qui-font-size-base);
  color: var(--qui-text-primary);
  line-height: var(--qui-line-height);
}

.error-details {
  width: 100%;
  margin-top: 16px;
}

.error-details details {
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--qui-window-radius);
  background: var(--qui-bg-primary);
}

.error-details summary {
  padding: 12px 16px;
  cursor: pointer;
  font-size: var(--qui-font-size-base);
  font-weight: var(--qui-font-weight-medium);
  color: var(--qui-text-secondary);
  background: var(--qui-bg-primary);
  border-radius: var(--qui-window-radius);
  transition: background var(--qui-interaction-speed);
}

.error-details summary:hover {
  background: var(--qui-overlay-hover);
}

.error-details pre {
  padding: 16px;
  margin: 0;
  background: var(--qui-bg-primary);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0 0 var(--qui-window-radius) var(--qui-window-radius);
  font-family: monospace;
  font-size: var(--qui-font-size-small);
  color: var(--qui-text-secondary);
  white-space: pre-wrap;
  word-break: break-word;
  overflow-x: auto;
}

.window-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 0 0 0;
  border-top: var(--qui-window-border);
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

.btn-primary {
  background: var(--qui-accent-color);
  color: var(--qui-bg-primary);
  box-shadow: var(--qui-shadow-accent);
}

.btn-primary:hover {
  background: var(--qui-accent-secondary);
  box-shadow: var(--qui-shadow-accent-strong);
  transform: var(--qui-hover-lift);
}
</style>