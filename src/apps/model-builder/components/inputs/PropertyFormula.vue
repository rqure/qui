<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  value: string | null;  // Allow null value
  component: any;
  activeModel: any;
}>();

const emit = defineEmits<{
  (e: 'update', value: string): void;
}>();

// Add computed property to handle null values
const formulaValue = computed(() => props.value || '');

// Update handler to ensure we emit a string
function handleChange(event: Event) {
  const textarea = event.target as HTMLTextAreaElement;
  emit('update', textarea.value || '');  // Ensure empty string instead of null
}
</script>

<template>
  <div class="formula-editor">
    <textarea
      :value="formulaValue"
      @input="handleChange"
      class="formula-input"
      placeholder="Enter formula (e.g., {Temperature} * 9/5 + 32)"
      spellcheck="false"
    ></textarea>
    <div class="formula-footer">
      <span class="formula-info">Supports basic math operators and field references {FieldName}</span>
    </div>
  </div>
</template>

<style scoped>
.formula-editor {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
}

.formula-input {
  width: 100%;
  min-height: 80px;
  padding: 8px 12px;
  background: var(--qui-bg-primary);
  border: 1px solid var(--qui-hover-border);
  border-radius: 4px;
  color: var(--qui-text-primary);
  font-family: var(--qui-font-family-mono);
  font-size: var(--qui-font-size-small);
  line-height: 1.4;
  resize: vertical;
  transition: all 0.2s ease;
}

.formula-input:hover {
  border-color: var(--qui-accent-color);
}

.formula-input:focus {
  border-color: var(--qui-accent-color);
  outline: none;
  box-shadow: 0 0 0 2px var(--qui-accent-glow);
}

.formula-footer {
  padding: 4px 8px;
}

.formula-info {
  font-size: var(--qui-font-size-small);
  color: var(--qui-text-secondary);
  font-style: italic;
}
</style>
