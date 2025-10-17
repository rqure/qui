<template>
  <div v-if="visible" class="toast" :class="type">
    <div class="toast-content">
      <div class="toast-icon">
        <span v-if="type === 'success'">✓</span>
        <span v-if="type === 'error'">✕</span>
        <span v-if="type === 'info'">ℹ</span>
      </div>
      <div class="toast-message">{{ message }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

interface Props {
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
  visible?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  type: 'info',
  duration: 3000,
  visible: false
});

const emit = defineEmits<{
  'update:visible': [value: boolean];
}>();

const visible = ref(props.visible);

watch(() => props.visible, (newVisible) => {
  visible.value = newVisible;
  if (newVisible && props.duration > 0) {
    setTimeout(() => {
      visible.value = false;
      emit('update:visible', false);
    }, props.duration);
  }
});

watch(visible, (newVisible) => {
  emit('update:visible', newVisible);
});
</script>

<style scoped>
.toast {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
  min-width: 300px;
  max-width: 500px;
  padding: 16px;
  border-radius: var(--qui-window-radius);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  animation: slideIn 0.3s ease-out;
}

.toast.success {
  background: rgba(0, 255, 136, 0.9);
  color: #000;
}

.toast.error {
  background: rgba(255, 100, 100, 0.9);
  color: #fff;
}

.toast.info {
  background: rgba(100, 150, 255, 0.9);
  color: #fff;
}

.toast-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toast-icon {
  font-size: 18px;
  font-weight: bold;
  flex-shrink: 0;
}

.toast-message {
  font-size: var(--qui-font-size-base);
  font-weight: var(--qui-font-weight-medium);
  line-height: 1.4;
}

@keyframes slideIn {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.toast.success .toast-icon {
  color: #008822;
}

.toast.error .toast-icon {
  color: #ff4444;
}

.toast.info .toast-icon {
  color: #4488ff;
}
</style>