<template>
  <div class="schema-editor-tag-input-container" ref="containerEl" @click="focusInput">
    <div class="tag-input-inner">
      <span 
        v-for="(tag, index) in tags" 
        :key="`tag-${index}`" 
        class="schema-editor-tag-item"
      >
        {{ tag }}
        <button
          @click.stop="removeTag(index)"
          type="button"
          class="schema-editor-tag-remove"
          tabindex="-1"
          title="Remove tag"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24">
            <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </span>
      
      <input
        ref="inputEl"
        v-model="inputValue"
        @keydown="onKeydown"
        :placeholder="tags.length === 0 ? placeholder : ''"
        class="schema-editor-tag-text-input"
        :disabled="reachedLimit"
        @blur="onBlur"
        @focus="onFocus"
      />
    </div>
    
    <button 
      v-if="inputValue.trim()" 
      @click.stop="addTag"
      type="button"
      class="schema-editor-tag-add-button"
      title="Add tag"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24">
        <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
      </svg>
    </button>

    <!-- Autocomplete suggestions dropdown -->
    <div v-if="showSuggestions && suggestions?.length" class="schema-editor-suggestions-dropdown">
      <div 
        v-for="(suggestion, index) in suggestions" 
        :key="index"
        class="schema-editor-suggestion-item"
        :class="{ 'active': activeSuggestionIndex === index }"
        @click.stop="selectSuggestion(suggestion)"
      >
        {{ suggestion.field('Name').value.getString() }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Entity } from '@/core/data/types';
import { ref, computed, nextTick, watch } from 'vue';

const props = defineProps<{
  modelValue: string[] | string;
  placeholder?: string;
  limit?: number;
  allowDuplicates?: boolean;
  suggestions?: Entity[];
  autocomplete?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string[]): void;
  (e: 'input', value: string[]): void;
}>();

// Internal state for the input value
const inputValue = ref('');
const inputEl = ref<HTMLInputElement | null>(null);
const containerEl = ref<HTMLElement | null>(null);

// Autocomplete state
const showSuggestions = ref(false);
const activeSuggestionIndex = ref(-1);

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
  emit('input', newTags);
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
  emit('input', newTags);
  
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
  if (showSuggestions.value && props.suggestions && props.suggestions.length > 0) {
    // Navigation in suggestions
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      activeSuggestionIndex.value = Math.min(activeSuggestionIndex.value + 1, props.suggestions.length - 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      activeSuggestionIndex.value = Math.max(activeSuggestionIndex.value - 1, 0);
    } else if (event.key === 'Enter' && activeSuggestionIndex.value >= 0) {
      event.preventDefault();
      selectSuggestion(props.suggestions[activeSuggestionIndex.value]);
      return;
    } else if (event.key === 'Escape') {
      event.preventDefault();
      showSuggestions.value = false;
      return;
    }
  }

  if (event.key === 'Enter' && inputValue.value.trim()) {
    event.preventDefault();
    addTag();
  } else if (event.key === 'Backspace' && !inputValue.value && tags.value.length > 0) {
    removeTag(tags.value.length - 1);
  }
}

function selectSuggestion(suggestion: Entity) {
  inputValue.value = suggestion.field('Name').value.getString();
  addTag();
  showSuggestions.value = false;
  activeSuggestionIndex.value = -1;
}

function onFocus() {
  if (props.autocomplete && props.suggestions && props.suggestions.length > 0) {
    showSuggestions.value = true;
  }
}

function onBlur() {
  // Delay hiding suggestions to allow for click event on suggestion
  setTimeout(() => {
    showSuggestions.value = false;
    activeSuggestionIndex.value = -1;
    
    // Add tag on blur if there is input
    if (inputValue.value.trim()) {
      addTag();
    }
  }, 150);
}

// Watch for changes in suggestions
watch(() => props.suggestions, (newSuggestions) => {
  if (newSuggestions && newSuggestions.length > 0 && inputValue.value && props.autocomplete) {
    showSuggestions.value = true;
    activeSuggestionIndex.value = -1;
  } else {
    showSuggestions.value = false;
  }
}, { deep: true });

// Watch for changes in input value for autocomplete
watch(inputValue, (newValue) => {
  // Emit input event to allow parent to search and update suggestions
  if (newValue && props.autocomplete) {
    emit('input', [...tags.value, newValue]);
  }
  
  // Show suggestions if we have them and autocomplete is enabled
  if (props.autocomplete && props.suggestions && props.suggestions.length > 0) {
    showSuggestions.value = true;
    activeSuggestionIndex.value = -1;
  }
});
</script>

<style scoped>
.schema-editor-tag-input-container {
  position: relative;
  width: 100%;
  min-height: 32px;
  border: 1px solid var(--qui-hover-border);
  border-radius: 4px;
  background: var(--qui-bg-primary);
  padding: 4px 32px 4px 8px;
  box-sizing: border-box;
  cursor: text;
  transition: all 0.25s ease;
}

.schema-editor-tag-input-container:hover {
  border-color: var(--qui-hover-border-dark, #aaa);
}

.schema-editor-tag-input-container:focus-within {
  border-color: var(--qui-accent-color);
  box-shadow: 0 0 0 2px var(--qui-overlay-accent);
}

.tag-input-inner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  width: 100%;
}

.schema-editor-tag-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 1px 5px 1px 6px;
  background: var(--qui-overlay-primary);
  color: var(--qui-text-primary);
  border-radius: 3px;
  font-size: 11px;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  user-select: none;
  transition: all 0.2s ease;
  border: 1px solid var(--qui-hover-border);
  font-weight: var(--qui-font-weight-medium);
  animation: schema-editor-tag-appear 0.2s ease;
}

.schema-editor-tag-item:hover {
  background: var(--qui-overlay-secondary);
  color: var(--qui-bg-primary);
}

.schema-editor-tag-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.1);
  color: inherit;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 0;
}

.schema-editor-tag-item:hover .schema-editor-tag-remove {
  background: rgba(255, 255, 255, 0.25);
}

.schema-editor-tag-text-input {
  flex: 1;
  min-width: 60px;
  border: none;
  outline: none;
  background: transparent;
  color: var(--qui-text-primary);
  font-size: var(--qui-font-size-base);
  padding: 2px 0;
  margin: 0;
  height: 24px;
}

.schema-editor-tag-text-input::placeholder {
  color: var(--qui-text-secondary);
  opacity: 0.7;
}

.schema-editor-tag-add-button {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 3px;
  border: none;
  background: var(--qui-overlay-accent);
  color: var(--qui-accent-color);
  cursor: pointer;
  transition: all 0.2s ease;
  animation: schema-editor-fade-in 0.2s ease;
}

.schema-editor-tag-add-button:hover {
  background: var(--qui-accent-color);
  color: white;
}

/* Autocomplete dropdown styles */
.schema-editor-suggestions-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 10;
  background: var(--qui-bg-primary);
  border: 1px solid var(--qui-hover-border);
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  max-height: 200px;
  overflow-y: auto;
  margin-top: 4px;
  animation: schema-editor-fade-in-dropdown 0.2s ease;
}

.schema-editor-suggestion-item {
  padding: 8px 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: var(--qui-font-size-small);
}

.schema-editor-suggestion-item:hover, 
.schema-editor-suggestion-item.active {
  background: var(--qui-overlay-accent);
  color: var(--qui-accent-color);
}

.shake-animation {
  animation: schema-editor-shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
}

@keyframes schema-editor-tag-appear {
  from { opacity: 0; transform: scale(0.8); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes schema-editor-fade-in-dropdown {
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Other animation keyframes are now defined in global.css with schema-editor- prefixes */
</style>
