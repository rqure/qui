<script setup lang="ts">
const props = defineProps<{
  value: string | number;
  property: {
    options?: Array<{ label: string; value: string | number }>;
  };
}>();

const emit = defineEmits<{
  (e: 'update', value: string | number): void;
}>();

function handleChange(event: Event) {
  const select = event.target as HTMLSelectElement;
  emit('update', props.property.options?.[select.selectedIndex]?.value ?? '');
}
</script>

<template>
  <div class="property-select">
    <select 
      class="select-input"
      :value="value"
      @change="handleChange"
    >
      <option 
        v-for="option in property.options" 
        :key="option.value"
        :value="option.value"
      >
        {{ option.label }}
      </option>
    </select>
    <span class="select-icon">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
        <path fill="currentColor" d="M7 10l5 5 5-5z"/>
      </svg>
    </span>
  </div>
</template>

<style scoped>
.property-select {
  position: relative;
  width: 100%;
}

.select-input {
  width: 100%;
  padding: 8px 32px 8px 12px;
  appearance: none;
  background: var(--qui-bg-primary);
  border: 1px solid var(--qui-hover-border);
  border-radius: 4px;
  color: var(--qui-text-primary);
  font-size: var(--qui-font-size-base);
  cursor: pointer;
  transition: all 0.2s ease;
}

.select-input:hover {
  border-color: var(--qui-accent-color);
}

.select-input:focus {
  border-color: var(--qui-accent-color);
  outline: none;
  box-shadow: 0 0 0 2px var(--qui-accent-glow);
}

.select-icon {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  color: var(--qui-text-secondary);
}
</style>
