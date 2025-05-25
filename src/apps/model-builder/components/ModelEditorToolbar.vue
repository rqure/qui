<script setup lang="ts">
import { ref, computed } from 'vue';

const props = defineProps<{
  selectedTool: string;
}>();

const emit = defineEmits<{
  (e: 'set-tool', tool: string): void;
  (e: 'zoom-in'): void;
  (e: 'zoom-out'): void;
  (e: 'zoom-reset'): void;
  (e: 'delete'): void;
  (e: 'save'): void;
  (e: 'grid-toggle'): void;
}>();

const tools = [
  {
    id: 'select',
    name: 'Select',
    icon: '<path d="M7,2L7,10L9,8L11,10L17,4L15,2L11,6L9,4L7,2M22,6L19,9L17.5,7.5L14.5,10.5L13,9L10,12L9,11L5,15L7,17L9,15L10,16L13,13L14.5,14.5L17.5,11.5L19,13L22,10L22,6Z" />'
  },
  {
    id: 'pan',
    name: 'Pan',
    icon: '<path d="M13,6V11H18V7.75L22.25,12L18,16.25V13H13V18H16.25L12,22.25L7.75,18H11V13H6V16.25L1.75,12L6,7.75V11H11V6H7.75L12,1.75L16.25,6H13Z" />'
  },
  {
    id: 'rect',
    name: 'Rectangle',
    icon: '<path d="M4,6V19H20V6H4Z" />'
  },
  {
    id: 'circle',
    name: 'Circle',
    icon: '<path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" />'
  },
  {
    id: 'text',
    name: 'Text',
    icon: '<path d="M18.5,4L19.66,8.35L18.7,8.61C18.25,7.74 17.79,6.87 17.26,6.43C16.73,6 16.11,6 15.5,6H13V16.5C13,17 13,17.5 13.33,17.75C13.67,18 14.33,18 15,18V19H9V18C9.67,18 10.33,18 10.67,17.75C11,17.5 11,17 11,16.5V6H8.5C7.89,6 7.27,6 6.74,6.43C6.21,6.87 5.75,7.74 5.3,8.61L4.34,8.35L5.5,4H18.5Z" />'
  },
  {
    id: 'line',
    name: 'Line',
    icon: '<path d="M22,9L12,2L2,9H22M12,4.4L17,8H7L12,4.4M19,13H5V10H19V13M19,16H5V14H19V16M19,19H5V17H19V19Z" transform="rotate(45 12 12)" />'
  },
  {
    id: 'arrow',
    name: 'Arrow',
    icon: '<path d="M19,6.41L17.59,5L7,15.59V9H5V19H15V17H8.41L19,6.41Z" />'
  }
];

// Toggle grid visibility
const isGridVisible = ref(true);
const toggleGrid = () => {
  isGridVisible.value = !isGridVisible.value;
  emit('grid-toggle');
};

// Whether a shape is currently selected
const canDelete = computed(() => {
  return props.selectedTool === 'select'; // Only enable delete when in select mode with something selected
});

// Tool selection
const selectTool = (toolId: string) => {
  emit('set-tool', toolId);
};

</script>

<template>
  <div class="mb-toolbar">
    <!-- Drawing tools -->
    <div class="mb-toolbar-group">
      <button 
        v-for="tool in tools" 
        :key="tool.id"
        class="mb-toolbar-button"
        :class="{ 'active': selectedTool === tool.id }"
        :title="tool.name"
        @click="selectTool(tool.id)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
          <path fill="currentColor" :d="tool.icon" />
        </svg>
      </button>
    </div>
    
    <!-- View controls -->
    <div class="mb-toolbar-group">
      <button 
        class="mb-toolbar-button" 
        title="Zoom In"
        @click="emit('zoom-in')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
          <path fill="currentColor" d="M15.5,14L20.5,19L19,20.5L14,15.5V14.71L13.73,14.43C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.43,13.73L14.71,14H15.5M9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14M12,10H10V12H9V10H7V9H9V7H10V9H12V10Z" />
        </svg>
      </button>
      
      <button 
        class="mb-toolbar-button" 
        title="Zoom Out"
        @click="emit('zoom-out')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
          <path fill="currentColor" d="M15.5,14H14.71L14.43,13.73C15.41,12.59 16,11.11 16,9.5A6.5,6.5 0 0,0 9.5,3A6.5,6.5 0 0,0 3,9.5A6.5,6.5 0 0,0 9.5,16C11.11,16 12.59,15.41 13.73,14.43L14,14.71V15.5L19,20.5L20.5,19L15.5,14M9.5,14C7,14 5,12 5,9.5C5,7 7,5 9.5,5C12,5 14,7 14,9.5C14,12 12,14 9.5,14M7,9H12V10H7V9Z" />
        </svg>
      </button>
      
      <button 
        class="mb-toolbar-button"
        title="Reset View"
        @click="emit('zoom-reset')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
          <path fill="currentColor" d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z" />
        </svg>
      </button>
      
      <button 
        class="mb-toolbar-button" 
        :class="{ 'active': isGridVisible }"
        title="Toggle Grid"
        @click="toggleGrid"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
          <path fill="currentColor" d="M10,4V8H14V4H10M16,4V8H20V4H16M16,10V14H20V10H16M16,16V20H20V16H16M14,20V16H10V20H14M8,20V16H4V20H8M8,14V10H4V14H8M8,8V4H4V8H8M10,14H14V10H10V14M4,2H20A2,2 0 0,1 22,4V20A2,2 0 0,1 20,22H4C2.92,22 2,21.1 2,20V4A2,2 0 0,1 4,2Z" />
        </svg>
      </button>
    </div>
    
    <!-- Edit tools -->
    <div class="mb-toolbar-group">
      <button 
        class="mb-toolbar-button"
        title="Save"
        @click="emit('save')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
          <path fill="currentColor" d="M15,9H5V5H15M12,19A3,3 0 0,1 9,16A3,3 0 0,1 12,13A3,3 0 0,1 15,16A3,3 0 0,1 12,19M17,3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V7L17,3Z" />
        </svg>
      </button>
      
      <button 
        class="mb-toolbar-button"
        title="Delete Selected"
        :disabled="!canDelete"
        @click="emit('delete')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
          <path fill="currentColor" d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" />
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
/* All styling is in global.css */
</style>
