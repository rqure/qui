<template>
  <div class="modal-overlay" @click.self="close">
    <div class="modal-dialog">
      <div class="modal-header">
        <h3>Error</h3>
        <button @click="close" class="close-button">✕</button>
      </div>

      <div class="modal-body">
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
      </div>

      <div class="modal-footer">
        <button @click="close" class="btn btn-primary">OK</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  message: string;
  details?: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

function close() {
  emit('close');
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-dialog {
  width: 90%;
  max-width: 500px;
  background: var(--qui-bg-secondary);
  border: var(--qui-window-border);
  border-radius: var(--qui-window-radius);
  box-shadow: var(--qui-shadow-window);
  display: flex;
  flex-direction: column;
  max-height: 80vh;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: var(--qui-window-border);
}

.modal-header h3 {
  margin: 0;
  font-size: var(--qui-font-size-large);
  font-weight: var(--qui-font-weight-bold);
  color: var(--qui-text-primary);
}

.close-button {
  background: none;
  border: none;
  font-size: 24px;
  color: var(--qui-text-secondary);
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--qui-window-radius);
  transition: background var(--qui-interaction-speed);
}

.close-button:hover {
  background: var(--qui-overlay-hover);
}

.modal-body {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.error-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  text-align: center;
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

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  border-top: var(--qui-window-border);
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