import { ref } from 'vue';

export interface HistoryEntry {
  undo: () => void;
  redo: () => void;
  description?: string;
}

export function useUndoRedo(maxHistory = 50) {
  const history = ref<HistoryEntry[]>([]);
  const currentIndex = ref(-1);
  const canUndo = ref(false);
  const canRedo = ref(false);

  function addHistoryEntry(entry: HistoryEntry) {
    // Remove any redo entries
    if (currentIndex.value < history.value.length - 1) {
      history.value.splice(currentIndex.value + 1);
    }

    // Add new entry
    history.value.push(entry);
    
    // Remove oldest entries if exceeding max
    if (history.value.length > maxHistory) {
      history.value.shift();
    }

    currentIndex.value = history.value.length - 1;
    updateCanUndoRedo();
  }

  function undo() {
    if (!canUndo.value) return;
    
    const entry = history.value[currentIndex.value];
    entry.undo();
    currentIndex.value--;
    updateCanUndoRedo();
  }

  function redo() {
    if (!canRedo.value) return;
    
    currentIndex.value++;
    const entry = history.value[currentIndex.value];
    entry.redo();
    updateCanUndoRedo();
  }

  function updateCanUndoRedo() {
    canUndo.value = currentIndex.value >= 0;
    canRedo.value = currentIndex.value < history.value.length - 1;
  }

  return {
    addHistoryEntry,
    undo,
    redo,
    canUndo,
    canRedo
  };
}
