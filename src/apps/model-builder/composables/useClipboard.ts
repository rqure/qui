import { ref } from 'vue';
import type { ModelComponent } from '../types';
import { v4 as uuidv4 } from 'uuid';

export function useClipboard() {
  const clipboardData = ref<ModelComponent[]>([]);

  function copyComponents(components: ModelComponent[]) {
    clipboardData.value = JSON.parse(JSON.stringify(components));
  }

  function pasteComponents(position: { x: number, y: number }): ModelComponent[] {
    if (clipboardData.value.length === 0) return [];

    const offsetX = 20;
    const offsetY = 20;
    
    return clipboardData.value.map(component => ({
      ...component,
      id: uuidv4(),
      x: position.x + offsetX,
      y: position.y + offsetY,
      z: component.z + 1
    }));
  }

  const canPaste = ref(false);
  
  function updateCanPaste() {
    canPaste.value = clipboardData.value.length > 0;
  }

  return {
    clipboardData,
    copyComponents,
    pasteComponents,
    canPaste,
    updateCanPaste
  };
}
