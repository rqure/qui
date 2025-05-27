<script setup lang="ts">
const props = defineProps<{
  value: string;
}>();

const emit = defineEmits<{
  (e: 'update', value: string): void;
}>();

function updateColor(e: Event) {
  const input = e.target as HTMLInputElement;
  emit('update', input.value);
}
</script>

<template>
  <div class="color-picker">
    <div class="color-inputs">
      <input
        type="color"
        :value="value"
        @input="updateColor"
        class="color-input"
      >
      <input
        type="text"
        :value="value"
        @input="updateColor"
        class="text-input"
        placeholder="#000000"
      >
    </div>
    <div class="color-preview" :style="{ backgroundColor: value }"></div>
  </div>
</template>

<style scoped>
.color-picker {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-width: 0; /* Allow container to shrink below content size */
}

.color-inputs {
  display: flex;
  gap: 8px;
  flex: 1;
  min-width: 0; /* Allow flex item to shrink */
}

.color-input {
  width: 36px;
  height: 36px;
  padding: 2px;
  border: 1px solid var(--qui-hover-border);
  border-radius: 4px;
  cursor: pointer;
  flex-shrink: 0; /* Prevent color input from shrinking */
}

.text-input {
  flex: 1;
  min-width: 0; /* Allow text input to shrink */
  padding: 8px 12px;
  background: var(--qui-bg-primary);
  border: 1px solid var(--qui-hover-border);
  border-radius: 4px;
  color: var(--qui-text-primary);
  font-family: var(--qui-font-family-mono);
}

.color-preview {
  width: 24px;
  height: 24px;
  border-radius: 12px;
  border: 2px solid var(--qui-hover-border);
  flex-shrink: 0; /* Prevent preview from shrinking */
}
</style>
