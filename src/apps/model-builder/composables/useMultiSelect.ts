import { ref, computed } from 'vue';
import type { ModelComponent } from '../types';

export interface SelectionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function useMultiSelect() {
  const selectedComponents = ref(new Set<string>());
  const selectionRect = ref<SelectionRect | null>(null);
  const isSelecting = ref(false);
  const selectionStart = ref({ x: 0, y: 0 });

  const hasSelection = computed(() => selectedComponents.value.size > 0);

  function startSelection(event: MouseEvent) {
    if (!event.shiftKey) return;
    
    isSelecting.value = true;
    selectionStart.value = { x: event.clientX, y: event.clientY };
    selectionRect.value = {
      x: event.clientX,
      y: event.clientY,
      width: 0,
      height: 0
    };
  }

  function updateSelection(event: MouseEvent) {
    if (!isSelecting.value) return;

    const x = Math.min(event.clientX, selectionStart.value.x);
    const y = Math.min(event.clientY, selectionStart.value.y);
    const width = Math.abs(event.clientX - selectionStart.value.x);
    const height = Math.abs(event.clientY - selectionStart.value.y);

    selectionRect.value = { x, y, width, height };
  }

  function endSelection(components: ModelComponent[]) {
    if (!isSelecting.value || !selectionRect.value) return;

    // Find components that intersect with selection rectangle
    const selected = components.filter(component => 
      isComponentInSelection(component, selectionRect.value!)
    );

    // Add to selection
    selected.forEach(component => {
      selectedComponents.value.add(component.id);
    });

    isSelecting.value = false;
    selectionRect.value = null;
  }

  function isComponentInSelection(component: ModelComponent, rect: SelectionRect): boolean {
    return (
      component.x < rect.x + rect.width &&
      component.x + component.width > rect.x &&
      component.y < rect.y + rect.height &&
      component.y + component.height > rect.y
    );
  }

  function clearSelection() {
    selectedComponents.value.clear();
    selectionRect.value = null;
    isSelecting.value = false;
  }

  return {
    selectedComponents,
    selectionRect,
    isSelecting,
    hasSelection,
    startSelection,
    updateSelection,
    endSelection,
    clearSelection
  };
}
