<template>
  <div class="modal-overlay" @click.self="cancel">
    <div class="modal-dialog">
      <div class="modal-header">
        <h3>Delete Shape</h3>
        <button @click="cancel" class="close-button">✕</button>
      </div>

      <div class="modal-body">
        <div class="warning-content">
          <div class="warning-icon">⚠️</div>
          <p class="warning-message">
            Are you sure you want to delete this shape?
          </p>
          <p class="warning-details">
            This action cannot be undone.
          </p>
        </div>
      </div>

      <div class="modal-footer">
        <button @click="cancel" class="btn btn-secondary">Cancel</button>
        <button @click="confirm" class="btn btn-danger">
          Delete Shape
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
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
  max-width: 400px;
  background: var(--qui-bg-secondary, #2a2a2a);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--qui-text-primary, #fff);
}

.close-button {
  background: none;
  border: none;
  font-size: 24px;
  color: var(--qui-text-secondary, #aaa);
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background 0.2s;
}

.close-button:hover {
  background: rgba(255, 255, 255, 0.05);
}

.modal-body {
  padding: 24px;
}

.warning-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 16px;
}

.warning-icon {
  font-size: 48px;
  opacity: 0.8;
}

.warning-message {
  margin: 0;
  font-size: var(--qui-font-size-base, 14px);
  color: var(--qui-text-primary, #fff);
  font-weight: var(--qui-font-weight-medium, 500);
}

.warning-details {
  margin: 0;
  font-size: var(--qui-font-size-small, 12px);
  color: var(--qui-text-secondary, #aaa);
  opacity: 0.8;
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--qui-accent-color, #00ff88);
  color: var(--qui-bg-primary, #000);
}

.btn-primary:hover:not(:disabled) {
  background: color-mix(in srgb, var(--qui-accent-color, #00ff88) 110%, white);
}

.btn-secondary {
  background: var(--qui-bg-secondary, #2a2a2a);
  color: var(--qui-text-primary, #fff);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.btn-secondary:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.05);
}

.btn-danger {
  background: linear-gradient(135deg, #d32f2f 0%, #b71c1c 100%);
  color: white;
  box-shadow: 0 2px 6px rgba(211, 47, 47, 0.4),
              inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.btn-danger:hover {
  background: linear-gradient(135deg, #e53935 0%, #c62828 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(211, 47, 47, 0.5),
              inset 0 1px 0 rgba(255, 255, 255, 0.3);
}
</style>