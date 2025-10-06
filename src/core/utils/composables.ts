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
    entityId: EntityId | string, 
    entityType?: string,
    entityName?: string,
    fieldType?: string
  ) => {
    if (!event.dataTransfer) return;
    // Centralize conversion here: drag APIs require string payloads
    const idStr = typeof entityId === 'number' ? String(entityId) : entityId;

    // Set data for the drag operation - use the consistent MIME type
    event.dataTransfer.setData(ENTITY_MIME_TYPE, idStr);
    event.dataTransfer.setData('text/plain', idStr);
    
    // Add metadata for field type, if provided
    if (fieldType) {
      event.dataTransfer.setData(`${ENTITY_MIME_TYPE}:fieldType`, fieldType);
    }
    
    // Set up visual effects for dragging
    event.dataTransfer.effectAllowed = 'all';
    
    // Create a drag image
  const dragIcon = createDragImage(idStr, entityType);
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
  const navigateToEntity = (entityId: EntityId | string) => {
    // Convert to numeric for broadcast detail where possible
    const idVal = typeof entityId === 'number' ? entityId : (isNaN(Number(entityId)) ? entityId : Number(entityId));
    broadcastEntityNavigation(idVal as any);
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
      // Convert to numeric EntityId where appropriate before invoking callback
      const parsed = isNaN(Number(entityId)) ? entityId : Number(entityId);
      onEntityDrop(parsed as any);
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
  // Use a more subtle class for drag operations that doesn't create a white fade
  document.body.classList.add('qui-entity-drag-in-progress');
  
  // Add a style tag for temporary drag styles if not already present
  if (!document.getElementById('qui-drag-styles')) {
    const styleTag = document.createElement('style');
    styleTag.id = 'qui-drag-styles';
    styleTag.textContent = `
      body.qui-entity-drag-in-progress {
        cursor: grabbing !important;
      }
      
      /* Avoid white fade effect but still show drag feedback */
      .dragging {
        opacity: 0.7;
        outline: 1px dashed var(--qui-accent-color);
        background-color: var(--qui-accent-bg-faint) !important;
      }
    `;
    document.head.appendChild(styleTag);
  }
}

export function removeDragStyles() {
  document.body.classList.remove('qui-entity-drag-in-progress');
  
  // Clean up drag styles
  const dragStyles = document.getElementById('qui-drag-styles');
  if (dragStyles) {
    document.head.removeChild(dragStyles);
  }
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

// Add type declarations for Window and CustomEvent
declare global {
  interface WindowEventMap {
    'show-context-menu': CustomEvent<{x: number, y: number, items: any[]}>;
    'entity:navigate': CustomEvent<{entityId: EntityId | number}>;
  }

  interface Window {
    createContextMenu(x: number, y: number, items: any[]): void;
  }
}
