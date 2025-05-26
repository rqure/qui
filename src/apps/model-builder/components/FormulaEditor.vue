<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';

const props = defineProps<{
  value: string;
  entityType: string | null;
  availableFields: string[];
}>();

const emit = defineEmits<{
  (e: 'update', value: string): void;
}>();

const formula = ref(props.value || '');
const isEditing = ref(false);
const showFieldMenu = ref(false);
const fieldMenuPosition = ref({ x: 0, y: 0 });
const formulaElement = ref<HTMLElement | null>(null);

// Watch for external value changes
watch(() => props.value, (newValue) => {
  if (!isEditing.value) {
    formula.value = newValue || '';
  }
});

// Format formula with syntax highlighting
const formattedFormula = computed(() => {
  if (!formula.value) return '';
  
  let formatted = formula.value;
  
  // Highlight field references
  formatted = formatted.replace(
    /\{([^{}]+)\}/g,
    '<span class="field-reference">{\$1}</span>'
  );
  
  // Highlight operators
  formatted = formatted.replace(
    /([+\-*\/^%])/g,
    '<span class="operator">\$1</span>'
  );
  
  // Highlight functions
  formatted = formatted.replace(
    /(abs|sqrt|sin|cos|tan|min|max|floor|ceil|round|avg)\(/g,
    '<span class="function">\$1</span>('
  );
  
  // Highlight numbers
  formatted = formatted.replace(
    /\b(\d+(\.\d+)?)\b/g,
    '<span class="number">\$1</span>'
  );
  
  return formatted;
});

// Enable editing mode
function startEditing() {
  isEditing.value = true;
}

// Save changes and exit editing mode
function saveFormula() {
  isEditing.value = false;
  emit('update', formula.value);
}

// Discard changes and exit editing mode
function cancelEditing() {
  isEditing.value = false;
  formula.value = props.value || '';
}

// Show field selection menu
function showFieldSelector(event: MouseEvent) {
  if (!props.entityType || props.availableFields.length === 0) return;
  
  fieldMenuPosition.value = {
    x: event.clientX,
    y: event.clientY
  };
  showFieldMenu.value = true;
  
  // Add an event listener to close the menu when clicking outside
  setTimeout(() => {
    document.addEventListener('click', closeFieldMenu);
  }, 100);
}

// Close the field selection menu
function closeFieldMenu() {
  showFieldMenu.value = false;
  document.removeEventListener('click', closeFieldMenu);
}

// Insert a field reference into the formula
function insertField(fieldName: string) {
  formula.value += `{${fieldName}}`;
  closeFieldMenu();
}

// Insert an operator or function into the formula
function insertOperator(operator: string) {
  formula.value += ` ${operator} `;
}

// Insert a function into the formula
function insertFunction(func: string) {
  formula.value += `${func}()`;
  
  // Position cursor between the parentheses
  if (formulaElement.value) {
    const textArea = formulaElement.value.querySelector('textarea');
    if (textArea) {
      const cursorPos = textArea.selectionStart;
      textArea.selectionEnd = cursorPos - 1;
    }
  }
}

onMounted(() => {
  // Focus the textarea when entering edit mode
  watch(isEditing, (editing) => {
    if (editing && formulaElement.value) {
      const textArea = formulaElement.value.querySelector('textarea');
      if (textArea) {
        setTimeout(() => {
          textArea.focus();
        }, 100);
      }
    }
  });
});
</script>

<template>
  <div class="formula-editor" ref="formulaElement">
    <!-- Display Mode -->
    <div v-if="!isEditing" class="formula-display" @click="startEditing">
      <div v-if="formula" class="formula-content" v-html="formattedFormula"></div>
      <div v-else class="empty-formula">Click to add a formula</div>
      
      <button class="edit-formula-button" @click.stop="startEditing">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24">
          <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
        </svg>
      </button>
    </div>
    
    <!-- Edit Mode -->
    <div v-else class="formula-editor-active">
      <div class="formula-toolbar">
        <div class="toolbar-section">
          <button class="toolbar-button" @click="showFieldSelector($event)" :disabled="!entityType">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
              <path fill="currentColor" d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-7-7 1.41-1.41L11 13.17l4.59-4.59L17 10l-5 5z"/>
            </svg>
            <span>Insert Field</span>
          </button>
          
          <span class="toolbar-divider"></span>
          
          <button class="toolbar-button" @click="insertOperator('+')">+</button>
          <button class="toolbar-button" @click="insertOperator('-')">-</button>
          <button class="toolbar-button" @click="insertOperator('*')">×</button>
          <button class="toolbar-button" @click="insertOperator('/')">/</button>
          
          <span class="toolbar-divider"></span>
          
          <button class="toolbar-button" @click="insertFunction('min')">min</button>
          <button class="toolbar-button" @click="insertFunction('max')">max</button>
          <button class="toolbar-button" @click="insertFunction('sqrt')">sqrt</button>
          <button class="toolbar-button" @click="insertFunction('round')">round</button>
        </div>
      </div>
      
      <textarea 
        v-model="formula"
        class="formula-input"
        placeholder="Enter formula (e.g., {Temperature} * 9/5 + 32)"
      ></textarea>
      
      <div class="formula-actions">
        <button class="action-button save-button" @click="saveFormula">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24">
            <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
          </svg>
          <span>Save</span>
        </button>
        <button class="action-button cancel-button" @click="cancelEditing">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24">
            <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
          <span>Cancel</span>
        </button>
      </div>
      
      <!-- Field Selection Menu -->
      <div 
        v-if="showFieldMenu" 
        class="field-selection-menu"
        :style="{
          left: `${fieldMenuPosition.x}px`,
          top: `${fieldMenuPosition.y}px`
        }"
      >
        <div class="menu-title">Insert Field</div>
        <div class="menu-items">
          <div 
            v-for="field in availableFields" 
            :key="field"
            class="menu-item"
            @click.stop="insertField(field)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24">
              <path fill="currentColor" d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-7-7 1.41-1.41L11 13.17l4.59-4.59L17 10l-5 5z"/>
            </svg>
            <span>{{ field }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.formula-editor {
  position: relative;
  width: 100%;
}

.formula-display {
  position: relative;
  padding: 8px 12px;
  min-height: 40px;
  background: var(--qui-bg-secondary);
  border: 1px solid var(--qui-hover-border);
  border-radius: 4px;
  color: var(--qui-text-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: all 0.2s ease;
}

.formula-display:hover {
  background: var(--qui-bg-hover);
  border-color: rgba(0, 176, 255, 0.3);
}

.formula-content {
  font-family: var(--qui-font-family-mono);
  font-size: var(--qui-font-size-small);
  line-height: 1.5;
  white-space: pre-wrap;
}

.empty-formula {
  color: var(--qui-text-secondary);
  font-style: italic;
  font-size: var(--qui-font-size-small);
}

.edit-formula-button {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: var(--qui-text-secondary);
  opacity: 0;
  transition: opacity 0.2s ease;
  cursor: pointer;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.formula-display:hover .edit-formula-button {
  opacity: 0.6;
}

.edit-formula-button:hover {
  opacity: 1 !important;
  background: rgba(0, 176, 255, 0.1);
  color: #00b0ff;
}

.formula-editor-active {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: var(--qui-bg-secondary);
  border: 1px solid #00b0ff;
  border-radius: 4px;
  box-shadow: 0 0 0 2px rgba(0, 176, 255, 0.2);
  overflow: hidden;
}

.formula-toolbar {
  display: flex;
  padding: 8px;
  background: rgba(0, 0, 0, 0.1);
  border-bottom: 1px solid var(--qui-hover-border);
  overflow-x: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--qui-scrollbar-thumb) var(--qui-scrollbar-track);
}

.formula-toolbar::-webkit-scrollbar {
  height: 6px;
}

.formula-toolbar::-webkit-scrollbar-track {
  background: var(--qui-scrollbar-track);
}

.formula-toolbar::-webkit-scrollbar-thumb {
  background: var(--qui-scrollbar-thumb);
  border-radius: 3px;
}

.toolbar-section {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: nowrap;
}

.toolbar-button {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px 8px;
  background: transparent;
  border: 1px solid var(--qui-hover-border);
  border-radius: 4px;
  color: var(--qui-text-primary);
  cursor: pointer;
  font-size: var(--qui-font-size-small);
  transition: all 0.2s ease;
  white-space: nowrap;
  min-width: 24px;
  height: 28px;
  gap: 6px;
}

.toolbar-button:hover {
  background: rgba(0, 176, 255, 0.1);
  border-color: #00b0ff;
  color: #00b0ff;
}

.toolbar-button:active {
  background: rgba(0, 176, 255, 0.2);
}

.toolbar-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: transparent;
  border-color: var(--qui-hover-border);
  color: var(--qui-text-secondary);
}

.toolbar-divider {
  width: 1px;
  height: 20px;
  background: var(--qui-hover-border);
  margin: 0 4px;
}

.formula-input {
  resize: none;
  padding: 10px;
  min-height: 80px;
  background: var(--qui-bg-primary);
  border: none;
  color: var(--qui-text-primary);
  font-family: var(--qui-font-family-mono);
  font-size: var(--qui-font-size-small);
  line-height: 1.5;
  width: 100%;
  outline: none;
  border-bottom: 1px solid var(--qui-hover-border);
}

.formula-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 8px;
}

.action-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 4px;
  border: none;
  color: var(--qui-text-primary);
  cursor: pointer;
  font-size: var(--qui-font-size-small);
  transition: all 0.2s ease;
}

.save-button {
  background: #00b0ff;
  color: white;
}

.save-button:hover {
  background: #4fc3f7;
  transform: translateY(-1px);
}

.cancel-button {
  background: rgba(255, 255, 255, 0.1);
}

.cancel-button:hover {
  background: rgba(255, 255, 255, 0.2);
}

.field-selection-menu {
  position: fixed;
  z-index: 1000;
  background: var(--qui-bg-primary);
  border: 1px solid var(--qui-hover-border);
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  min-width: 180px;
  transform: translate(-50%, 10px);
}

.menu-title {
  padding: 8px 12px;
  font-size: var(--qui-font-size-small);
  font-weight: var(--qui-font-weight-medium);
  color: var(--qui-text-secondary);
  border-bottom: 1px solid var(--qui-hover-border);
  background: rgba(0, 0, 0, 0.1);
}

.menu-items {
  max-height: 250px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--qui-scrollbar-thumb) var(--qui-scrollbar-track);
}

.menu-items::-webkit-scrollbar {
  width: 6px;
}

.menu-items::-webkit-scrollbar-track {
  background: var(--qui-scrollbar-track);
}

.menu-items::-webkit-scrollbar-thumb {
  background: var(--qui-scrollbar-thumb);
  border-radius: 3px;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.menu-item:hover {
  background: rgba(0, 176, 255, 0.1);
}

.menu-item span {
  font-size: var(--qui-font-size-small);
}
</style>

<style>
/* Non-scoped styles for formatted formula */
.formula-content .field-reference {
  color: #4fc3f7;
  background: rgba(0, 176, 255, 0.1);
  padding: 1px 3px;
  border-radius: 3px;
  font-weight: 500;
}

.formula-content .operator {
  color: #ff9800;
  font-weight: bold;
  margin: 0 2px;
}

.formula-content .function {
  color: #9c27b0;
  font-weight: 500;
}

.formula-content .number {
  color: #4caf50;
  font-weight: 500;
}
</style>
