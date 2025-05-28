import { ref, computed } from 'vue';
import type { ModelComponent } from '../types';

export function useComponentSelection() {
  const selectedComponents = ref(new Set<string>());
  const lastSelectedComponent = ref<ModelComponent | null>(null);
  const selectionRect = ref<{ x: number, y: number, width: number, height: number } | null>(null);
  
  const hasSelection = computed(() => selectedComponents.value.size > 0);

  function selectComponent(component: ModelComponent, additive = false) {
    if (!additive) {
      selectedComponents.value.clear();
    }
    selectedComponents.value.add(component.id);
    lastSelectedComponent.value = component;
  }

  function deselectComponent(component: ModelComponent) {
    selectedComponents.value.delete(component.id);
    if (lastSelectedComponent.value?.id === component.id) {
      lastSelectedComponent.value = null;
    }
  }

  function clearSelection() {
    selectedComponents.value.clear();
    lastSelectedComponent.value = null;
    selectionRect.value = null;
  }

  function isSelected(componentId: string): boolean {
    return selectedComponents.value.has(componentId);
  }

  function getSelectedComponents(): string[] {
    return Array.from(selectedComponents.value);
  }

  return {
    selectedComponents,
    lastSelectedComponent,
    selectionRect,
    hasSelection,
    selectComponent,
    deselectComponent,
    clearSelection,
    isSelected,
    getSelectedComponents
  };
}
