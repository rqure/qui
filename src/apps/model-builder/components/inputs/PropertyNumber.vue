<script setup lang="ts">
const props = defineProps<{
  value: number;
  property: {
    min?: number;
    max?: number;
    step?: number;
  };
}>();

const emit = defineEmits<{
  (e: 'update', value: number): void;
}>();

function increment() {
  const step = props.property.step || 1;
  const newValue = props.value + step;
  if (props.property.max === undefined || newValue <= props.property.max) {
    emit('update', newValue);
  }
}

function decrement() {
  const step = props.property.step || 1;
  const newValue = props.value - step;
  if (props.property.min === undefined || newValue >= props.property.min) {
    emit('update', newValue);
  }
}

function handleInput(event: Event) {
  const input = event.target as HTMLInputElement;
  const value = Number(input.value);
  if (!isNaN(value)) {
    emit('update', value);
  }
}
</script>

<template>
  <div class="number-input">
    <input
      type="number"
      :value="value"
      :min="property.min"
      :max="property.max"
      :step="property.step || 1"
      @input="handleInput"
    >
    <div class="step-buttons">
      <button 
        @click="increment"
        :disabled="property.max !== undefined && value >= property.max"
      >▲</button>
      <button 
        @click="decrement"
        :disabled="property.min !== undefined && value <= property.min"
      >▼</button>
    </div>
  </div>
</template>

<style scoped>
.number-input {
  display: flex;
  align-items: center;
  background: var(--qui-bg-primary);
  border: 1px solid var(--qui-hover-border);
  border-radius: 4px;
  overflow: hidden;
}

.number-input input {
  flex: 1;
  border: none;
  padding: 8px 12px;
  background: transparent;
  color: var(--qui-text-primary);
  font-size: var(--qui-font-size-base);
  width: 100%;
  outline: none;
}

.step-buttons {
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--qui-hover-border);
}

.step-buttons button {
  border: none;
  background: var(--qui-overlay-primary);
  color: var(--qui-text-secondary);
  padding: 4px 8px;
  cursor: pointer;
  font-size: 8px;
  line-height: 1;
  transition: all 0.2s ease;
}

.step-buttons button:hover:not(:disabled) {
  background: var(--qui-accent-color);
  color: white;
}

.step-buttons button:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.step-buttons button:first-child {
  border-bottom: 1px solid var(--qui-hover-border);
}
</style>
