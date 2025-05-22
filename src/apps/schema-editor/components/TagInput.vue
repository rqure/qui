<template>
  <div class="tag-input-container" ref="containerEl" @click="focusInput">
    <div class="tag-input-inner">
      <span 
        v-for="(tag, index) in tags" 
        :key="`tag-${index}`" 
        class="tag-item"
      >
        {{ tag }}
        <button
          @click.stop="removeTag(index)"
          type="button"
          class="tag-remove"
          tabindex="-1"
          title="Remove tag"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24">
            <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </span>
      
      <input
        ref="inputEl"
        v-model="inputValue"
        @keydown="onKeydown"
        :placeholder="tags.length === 0 ? placeholder : ''"
        class="tag-text-input"
        :disabled="reachedLimit"
        @blur="inputValue.trim() && addTag()"
      />
    </div>
    
    <button 
      v-if="inputValue.trim()" 
      @click.stop="addTag"
      type="button"
      class="tag-add-button"
      title="Add tag"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
        <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue';

const props = defineProps<{
  modelValue: string[] | string;
  placeholder?: string;
  limit?: number;
  allowDuplicates?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string[]): void;
}>();

// Internal state for the input value
const inputValue = ref('');
const inputEl = ref<HTMLInputElement | null>(null);
const containerEl = ref<HTMLElement | null>(null);

// Convert string input to array if needed
const tags = computed<string[]>(() => {
  if (typeof props.modelValue === 'string') {
    return props.modelValue.split(',').filter(tag => tag.trim() !== '');
  }
  return [...props.modelValue];
});

// Check if we've reached the limit
const reachedLimit = computed(() => {
  if (!props.limit) return false;
  return tags.value.length >= props.limit;
});

function addTag() {
  if (!inputValue.value.trim()) return;
  
  // Check for duplicates
  if (!props.allowDuplicates && tags.value.includes(inputValue.value.trim())) {
    shake();
    inputValue.value = '';
    return;
  }
  
  // Check for limit
  if (props.limit && tags.value.length >= props.limit) {
    shake();
    return;
  }
  
  const newTags = [...tags.value, inputValue.value.trim()];
  emit('update:modelValue', newTags);
  inputValue.value = '';
  
  // Focus input after adding
  nextTick(() => {
    inputEl.value?.focus();
  });
}

function removeTag(index: number) {
  const newTags = [...tags.value];
  newTags.splice(index, 1);
  emit('update:modelValue', newTags);
  
  // Focus input after removing
  nextTick(() => {
    inputEl.value?.focus();
  });
}

function shake() {
  if (!containerEl.value) return;
  containerEl.value.classList.add('shake-animation');
  setTimeout(() => {
    containerEl.value?.classList.remove('shake-animation');
  }, 500);
}

function focusInput() {
  inputEl.value?.focus();
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && inputValue.value.trim()) {
    event.preventDefault();
    addTag();
  } else if (event.key === 'Backspace' && !inputValue.value && tags.value.length > 0) {
    removeTag(tags.value.length - 1);
  }
}
</script>

<style scoped>
.tag-input-container {
  position: relative;
  width: 100%;
  min-height: 42px;
  border: 1px solid var(--qui-hover-border);
  border-radius: 8px;
  background: var(--qui-bg-primary);
  padding: 6px 36px 6px 10px;
  box-sizing: border-box;
  cursor: text;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.tag-input-container:hover {
  border-color: var(--qui-hover-border-dark, #aaa);
}

.tag-input-container:focus-within {
  border-color: var(--qui-accent-color);
  box-shadow: 0 0 0 2px var(--qui-overlay-accent);
  transform: translateY(-1px);
}

.tag-input-inner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.tag-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 8px 3px 10px;
  background: var(--qui-overlay-accent);
  color: var(--qui-accent-color);
  border-radius: 16px;
  font-size: var(--qui-font-size-small);
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  user-select: none;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
  border: 1px solid transparent;
  animation: tag-appear 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.tag-item:hover {
  background: var(--qui-accent-color);
  color: white;
  transform: translateY(-1px);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.tag-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.1);
  color: inherit;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 0;
}

.tag-item:hover .tag-remove {
  background: rgba(255, 255, 255, 0.2);
}

.tag-remove:hover {
  transform: scale(1.1);
  background: rgba(255, 255, 255, 0.3);
}

.tag-text-input {
  flex: 1;
  min-width: 60px;
  border: none;
  outline: none;
  background: transparent;
  color: var(--qui-text-primary);
  font-size: var(--qui-font-size-base);
  padding: 6px 0;
}

.tag-text-input::placeholder {
  color: var(--qui-text-secondary);
  opacity: 0.7;
}

.tag-add-button {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: none;
  background: var(--qui-overlay-accent);
  color: var(--qui-accent-color);
  cursor: pointer;
  transition: all 0.2s ease;
  animation: fade-in 0.2s ease;
}

.tag-add-button:hover {
  background: var(--qui-accent-color);
  color: white;
  transform: translateY(-50%) scale(1.05);
}

.tag-add-button:active {
  transform: translateY(-50%) scale(0.95);
}

@keyframes tag-appear {
  from { opacity: 0; transform: scale(0.8); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.shake-animation {
  animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
}

@keyframes shake {
  10%, 90% { transform: translateX(-1px); }
  20%, 80% { transform: translateX(2px); }
  30%, 50%, 70% { transform: translateX(-3px); }
  40%, 60% { transform: translateX(3px); }
}
</style>
