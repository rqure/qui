import { ref } from 'vue';
import type { EntityId } from '../data/types';
import { 
  ENTITY_MIME_TYPE, 
  ENTITY_NAVIGATE_EVENT,
  broadcastEntityNavigation,
  createDragImage,
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
    
    // Make the drag effect more consistent and less flickery
    event.dataTransfer.effectAllowed = 'all';
    
    // Reduce flickering with improved drag image handling
    const dragIcon = createDragImage(entityId, entityType);
    
    // Use a fixed offset for more stability
    event.dataTransfer.setDragImage(dragIcon, 20, 20);
    
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
 * COMPLETELY REWRITTEN to avoid any lifecycle hooks
 */
export function useEntityDropZone(
  onEntityDrop: (entityId: EntityId) => void
) {
  // Check if this is an entity drag event
  const isEntityDrag = (event: DragEvent): boolean => {
    if (!event.dataTransfer) return false;
    return event.dataTransfer.types.includes(ENTITY_MIME_TYPE);
  };

  // Process a drop event
  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    
    if (!event.dataTransfer) return false;
    
    // Check for our custom entity ID data
    const entityId = event.dataTransfer.getData(ENTITY_MIME_TYPE);
    if (entityId) {
      onEntityDrop(entityId);
      return true;
    }
    
    return false;
  };
  
  // Return only the necessary functions, no lifecycle hooks
  return {
    isEntityDrag,
    handleDrop
  };
}

// Helper function to initialize cross-window communication if needed
// This is called directly by components, not inside the composable
export function initCrossWindowEntityHandling(callback: (entityId: EntityId) => void) {
  // Listen for entity navigation events
  const listener = (event: Event) => {
    const customEvent = event as CustomEvent;
    if (customEvent.detail?.entityId) {
      callback(customEvent.detail.entityId);
    }
  };
  
  window.addEventListener('entity:navigate', listener);
  
  // Return a cleanup function 
  return () => {
    window.removeEventListener('entity:navigate', listener);
  };
}
