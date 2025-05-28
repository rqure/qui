import { onMounted, onUnmounted } from 'vue';
import type { ModelComponent } from '../types';

interface ShortcutHandlers {
  onDelete?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onSelectAll?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetZoom?: () => void;
}

export function useCanvasShortcuts(handlers: ShortcutHandlers) {
  function handleKeyDown(event: KeyboardEvent) {
    // Don't handle shortcuts if focus is in an input element
    if (event.target instanceof HTMLInputElement || 
        event.target instanceof HTMLTextAreaElement) {
      return;
    }

    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const ctrlKey = isMac ? event.metaKey : event.ctrlKey;

    if (event.key === 'Delete' && handlers.onDelete) {
      event.preventDefault();
      handlers.onDelete();
    }
    else if (ctrlKey && event.key === 'z' && handlers.onUndo) {
      event.preventDefault();
      handlers.onUndo();
    }
    else if (ctrlKey && event.key === 'y' && handlers.onRedo) {
      event.preventDefault();
      handlers.onRedo();
    }
    else if (ctrlKey && event.key === 'c' && handlers.onCopy) {
      event.preventDefault();
      handlers.onCopy();
    }
    else if (ctrlKey && event.key === 'v' && handlers.onPaste) {
      event.preventDefault();
      handlers.onPaste();
    }
    else if (ctrlKey && event.key === 'a' && handlers.onSelectAll) {
      event.preventDefault();
      handlers.onSelectAll();
    }
    else if (ctrlKey && event.key === '=' && handlers.onZoomIn) {
      event.preventDefault();
      handlers.onZoomIn();
    }
    else if (ctrlKey && event.key === '-' && handlers.onZoomOut) {
      event.preventDefault();
      handlers.onZoomOut();
    }
    else if (ctrlKey && event.key === '0' && handlers.onResetZoom) {
      event.preventDefault();
      handlers.onResetZoom();
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeyDown);
  });

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown);
  });

  return {
    // Return any methods that might be needed externally
  };
}
