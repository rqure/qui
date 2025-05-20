/**
 * Utilities for drag and drop operations in the QUI framework
 */

import type { EntityId } from '../data/types';

// Custom MIME type for entity dragging
export const ENTITY_MIME_TYPE = 'application/x-qui-entity-id';

// Event names for cross-window communication
export const ENTITY_DRAG_START_EVENT = 'qui:entity:drag-start';
export const ENTITY_NAVIGATE_EVENT = 'qui:entity:navigate';

// Data structure for entity drag events
export interface EntityDragData {
  entityId: EntityId;
  entityType?: string;
  entityName?: string;
  fieldType?: string;  // Field type that the entity is being dragged from
  sourceWindowId?: string;
  timestamp: number;
}

// Generate a unique window ID for cross-window communication
const generateWindowId = () => {
  return `window_${Math.random().toString(36).substring(2, 9)}`;
};

// Current window's unique ID
const WINDOW_ID = generateWindowId();

/**
 * Create a custom drag image element
 */
export function createDragImage(entityId: string, entityType?: string): HTMLElement {
  const dragIcon = document.createElement('div');
  dragIcon.className = 'qui-entity-drag-icon';
  
  // Extract type from ID if not provided
  const displayType = entityType || entityId.split('$')[0] || 'Entity';
  
  dragIcon.textContent = displayType;
  
  // Style the drag image - these will be overridden by global CSS
  Object.assign(dragIcon.style, {
    padding: '4px 10px',
    background: 'var(--qui-accent-bg-faint, rgba(0, 255, 136, 0.1))',
    color: 'var(--qui-accent-color, rgb(0, 255, 136))',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 'bold',
    boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
    pointerEvents: 'none',
    position: 'fixed',
    zIndex: '-1',
    top: '-1000px'
  });
  
  document.body.appendChild(dragIcon);
  return dragIcon;
}

/**
 * Use local storage for cross-window communication
 */
export function broadcastEntityNavigation(entityId: EntityId): void {
  try {
    // Use structured data for navigation events
    const data: EntityDragData = {
      entityId,
      sourceWindowId: WINDOW_ID,
      timestamp: Date.now()
    };
    
    // Dispatch local event first
    window.dispatchEvent(
      new CustomEvent(ENTITY_NAVIGATE_EVENT, { detail: data })
    );
    
    // Store in localStorage for other windows
    localStorage.setItem('qui-entity-navigation', JSON.stringify(data));
    
    // Clean up after a short delay
    setTimeout(() => {
      localStorage.removeItem('qui-entity-navigation');
    }, 100);
  } catch (error) {
    console.error('Error broadcasting entity navigation:', error);
  }
}

/**
 * Initialize cross-window communication for drag and drop
 */
export function initCrossWindowDragDrop(
  navigateCallback: (entityId: EntityId) => void
): () => void {
  // Set up the storage event listener for cross-window communication
  const handleStorageEvent = (event: StorageEvent) => {
    if (event.key === 'qui-entity-navigation' && event.newValue) {
      try {
        const data = JSON.parse(event.newValue) as EntityDragData;
        
        // Ignore events from the same window
        if (data.sourceWindowId === WINDOW_ID) {
          return;
        }
        
        // Check if the event is recent (within last second)
        if (data.timestamp && Date.now() - data.timestamp < 1000) {
          navigateCallback(data.entityId);
        }
      } catch (error) {
        console.error('Error parsing cross-window entity data:', error);
      }
    }
  };

  // Listen for local navigation events
  const handleLocalNavEvent = (event: Event) => {
    const customEvent = event as CustomEvent<EntityDragData>;
    if (customEvent.detail?.entityId) {
      navigateCallback(customEvent.detail.entityId);
    }
  };

  // Set up event listeners
  window.addEventListener('storage', handleStorageEvent);
  window.addEventListener(ENTITY_NAVIGATE_EVENT, handleLocalNavEvent);
  
  // Return cleanup function
  return () => {
    window.removeEventListener('storage', handleStorageEvent);
    window.removeEventListener(ENTITY_NAVIGATE_EVENT, handleLocalNavEvent);
  };
}

/**
 * Add entity drag styles to the document body during drag operations
 */
export function addDragStyles(): void {
  document.body.classList.add('qui-entity-drag-in-progress');
}

/**
 * Remove entity drag styles when drag ends
 */
export function removeDragStyles(): void {
  document.body.classList.remove('qui-entity-drag-in-progress');
}
