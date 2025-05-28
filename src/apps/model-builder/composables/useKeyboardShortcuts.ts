import { onMounted, onUnmounted } from 'vue';

interface ShortcutHandlers {
  onDelete?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onSelectAll?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetZoom?: () => void;
  onEscape?: () => void;
  onSave?: () => void;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  function handleKeyDown(event: KeyboardEvent) {
    // Don't handle shortcuts if focus is in an input element
    if (event.target instanceof HTMLInputElement || 
        event.target instanceof HTMLTextAreaElement) {
      return;
    }

    const isMac = navigator.platform.toLowerCase().includes('mac');
    const ctrlKey = isMac ? event.metaKey : event.ctrlKey;
    
    // Handle keyboard shortcuts
    switch (event.key.toLowerCase()) {
      case 'delete':
      case 'backspace':
        if (handlers.onDelete) {
          event.preventDefault();
          handlers.onDelete();
        }
        break;

      case 'c':
        if (ctrlKey && handlers.onCopy) {
          event.preventDefault();
          handlers.onCopy();
        }
        break;

      case 'v':
        if (ctrlKey && handlers.onPaste) {
          event.preventDefault();
          handlers.onPaste();
        }
        break;

      case 'z':
        if (ctrlKey && !event.shiftKey && handlers.onUndo) {
          event.preventDefault();
          handlers.onUndo();
        }
        break;

      case 'y':
        if (ctrlKey && handlers.onRedo) {
          event.preventDefault();
          handlers.onRedo();
        }
        break;
        
      case 'z':
        if (ctrlKey && event.shiftKey && handlers.onRedo) {
          event.preventDefault();
          handlers.onRedo();
        }
        break;

      case 'a':
        if (ctrlKey && handlers.onSelectAll) {
          event.preventDefault();
          handlers.onSelectAll();
        }
        break;

      case '=':
      case '+':
        if (ctrlKey && handlers.onZoomIn) {
          event.preventDefault();
          handlers.onZoomIn();
        }
        break;

      case '-':
      case '_':
        if (ctrlKey && handlers.onZoomOut) {
          event.preventDefault();
          handlers.onZoomOut();
        }
        break;

      case '0':
        if (ctrlKey && handlers.onResetZoom) {
          event.preventDefault();
          handlers.onResetZoom();
        }
        break;

      case 'escape':
        if (handlers.onEscape) {
          event.preventDefault();
          handlers.onEscape();
        }
        break;

      case 's':
        if (ctrlKey && handlers.onSave) {
          event.preventDefault();
          handlers.onSave();
        }
        break;
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
