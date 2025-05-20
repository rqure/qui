import { onMounted, onUnmounted } from 'vue';
import type { EntityId } from '../data/types';
import { 
  ENTITY_MIME_TYPE, 
  ENTITY_NAVIGATE_EVENT,
  broadcastEntityNavigation,
  createDragImage,
  initCrossWindowDragDrop,
  addDragStyles,
  removeDragStyles
} from './dragdrop';

/**
 * Composable for entity drag capability
 */
export function useEntityDrag() {
  // Start dragging an entity
  const startEntityDrag = (
    event: DragEvent, 
    entityId: string, 
    entityType?: string,
    entityName?: string,
    fieldType?: string // Added parameter for fieldType
  ) => {
    if (!event.dataTransfer) return;
    
    // Set data for the drag operation
    event.dataTransfer.setData(ENTITY_MIME_TYPE, entityId);
    event.dataTransfer.setData('text/plain', entityId);
    
    // Add metadata for field type, if provided
    if (fieldType) {
      event.dataTransfer.setData(`${ENTITY_MIME_TYPE}:fieldType`, fieldType);
    }
    
    event.dataTransfer.effectAllowed = 'all';
    
    // Set custom drag image
    const dragIcon = createDragImage(entityId, entityType);
    
    event.dataTransfer.setDragImage(dragIcon, 15, 15);
    
    // Remove the temporary element after a delay
    setTimeout(() => {
      if (dragIcon.parentNode) {
        document.body.removeChild(dragIcon);
      }
    }, 100);
    
    // Add drag styling
    addDragStyles();
    
    // Listen for drag end to remove styles
    const handleDragEnd = () => {
      removeDragStyles();
      window.removeEventListener('dragend', handleDragEnd);
    };
    
    window.addEventListener('dragend', handleDragEnd);
  };
  
  // Trigger entity navigation (click or drop)
  const navigateToEntity = (entityId: string) => {
    broadcastEntityNavigation(entityId);
  };
  
  return {
    startEntityDrag,
    navigateToEntity
  };
}

/**
 * Composable for entity drop zone capability
 */
export function useEntityDropZone(
  onEntityDrop: (entityId: EntityId) => void
) {
  // Set up cross-window communication for navigation
  let cleanup: (() => void) | null = null;
  
  onMounted(() => {
    cleanup = initCrossWindowDragDrop(onEntityDrop);
  });
  
  onUnmounted(() => {
    if (cleanup) cleanup();
  });
  
  // Handle drop event
  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    
    if (!event.dataTransfer) return;
    
    // Check for our custom entity ID data
    const entityId = event.dataTransfer.getData(ENTITY_MIME_TYPE);
    if (entityId) {
      onEntityDrop(entityId);
      return true;
    }
    
    return false;
  };
  
  // Check if this is a valid entity being dragged
  const isEntityDrag = (event: DragEvent): boolean => {
    if (!event.dataTransfer) return false;
    return event.dataTransfer.types.includes(ENTITY_MIME_TYPE);
  };
  
  return {
    handleDrop,
    isEntityDrag
  };
}
