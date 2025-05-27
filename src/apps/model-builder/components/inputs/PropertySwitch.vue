<script setup lang="ts">
const props = defineProps<{
  value: boolean;
}>();

const emit = defineEmits<{
  (e: 'update', value: boolean): void;
}>();
</script>

<template>
  <div class="property-switch">
    <label class="switch">
      <input
        type="checkbox"
        :checked="value"
        @change="e => emit('update', (e.target as HTMLInputElement).checked)"
      >
      <span class="slider"></span>
    </label>
    <span class="switch-label">{{ value ? 'On' : 'Off' }}</span>
  </div>
</template>

<style scoped>
.property-switch {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 0;
}

.switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background-color: var(--qui-hover-border);
  transition: .3s;
  border-radius: 24px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: .3s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: var(--qui-accent-color);
}

input:checked + .slider:before {
  transform: translateX(20px);
}

.switch-label {
  font-size: var(--qui-font-size-small);
  color: var(--qui-text-secondary);
  min-width: 30px;
}
</style>
