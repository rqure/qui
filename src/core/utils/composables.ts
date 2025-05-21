import { ref } from 'vue';
import type { EntityId } from '../data/types';

// MIME Type constant that matches what's used elsewhere
export const ENTITY_MIME_TYPE = 'application/x-qui-entity';
export const ENTITY_NAVIGATE_EVENT = 'entity:navigate';

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
    fieldType?: string
  ) => {
    if (!event.dataTransfer) return;
    
    // Set data for the drag operation - use the consistent MIME type
    event.dataTransfer.setData(ENTITY_MIME_TYPE, entityId);
    event.dataTransfer.setData('text/plain', entityId);
    
    // Add metadata for field type, if provided
    if (fieldType) {
      event.dataTransfer.setData(`${ENTITY_MIME_TYPE}:fieldType`, fieldType);
    }
    
    // Set up visual effects for dragging
    event.dataTransfer.effectAllowed = 'all';
    
    // Create a drag image
    const dragIcon = createDragImage(entityId, entityType);
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
 */
export function useEntityDropZone(
  onEntityDrop: (entityId: EntityId) => void
) {
  // Check if this is an entity drag event - use the consistent MIME type
  const isEntityDrag = (event: DragEvent): boolean => {
    if (!event.dataTransfer) return false;
    return event.dataTransfer.types.includes(ENTITY_MIME_TYPE);
  };

  // Process a drop event - use the consistent MIME type
  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    
    if (!event.dataTransfer) return false;
    
    // Check for our custom entity ID data using the consistent MIME type
    const entityId = event.dataTransfer.getData(ENTITY_MIME_TYPE);
    console.log('Drop event data:', {
      types: event.dataTransfer.types,
      entityId: entityId,
      mimeType: ENTITY_MIME_TYPE
    });
    
    if (entityId) {
      onEntityDrop(entityId);
      return true;
    }
    
    return false;
  };
  
  return {
    isEntityDrag,
    handleDrop
  };
}

// Helper functions to maintain consistency
export function broadcastEntityNavigation(entityId: EntityId) {
  window.dispatchEvent(
    new CustomEvent(ENTITY_NAVIGATE_EVENT, {
      bubbles: true,
      detail: { entityId }
    })
  );
}

export function createDragImage(entityId: string, entityType?: string) {
  const dragText = entityType ? `${entityType}: ${entityId}` : entityId;
  
  const element = document.createElement('div');
  element.className = 'qui-entity-drag-icon';
  element.textContent = dragText;
  element.style.position = 'fixed';
  element.style.top = '-1000px';
  document.body.appendChild(element);
  
  return element;
}

export function addDragStyles() {
  document.body.classList.add('qui-entity-drag-in-progress');
}

export function removeDragStyles() {
  document.body.classList.remove('qui-entity-drag-in-progress');
}

// Helper function to initialize cross-window communication if needed
export function initCrossWindowEntityHandling(callback: (entityId: EntityId) => void) {
  // Listen for entity navigation events
  const listener = (event: Event) => {
    const customEvent = event as CustomEvent;
    if (customEvent.detail?.entityId) {
      callback(customEvent.detail.entityId);
    }
  };
  
  window.addEventListener(ENTITY_NAVIGATE_EVENT, listener);
  
  // Return a cleanup function 
  return () => {
    window.removeEventListener(ENTITY_NAVIGATE_EVENT, listener);
  };
}
