import { ref } from 'vue';

export function usePanning() {
  const isPanning = ref(false);
  const panStartX = ref(0);
  const panStartY = ref(0);
  const canvasOffset = ref({ x: 0, y: 0 });

  function startPan(event: MouseEvent) {
    if (event.button === 1 || (event.button === 0 && event.altKey)) {
      event.preventDefault();
      isPanning.value = true;
      panStartX.value = event.clientX - canvasOffset.value.x;
      panStartY.value = event.clientY - canvasOffset.value.y;
      document.body.style.cursor = 'grabbing';
    }
  }

  function updatePan(event: MouseEvent) {
    if (!isPanning.value) return;
    
    canvasOffset.value = {
      x: event.clientX - panStartX.value,
      y: event.clientY - panStartY.value
    };
  }

  function endPan() {
    isPanning.value = false;
    document.body.style.cursor = '';
  }

  return {
    isPanning,
    canvasOffset,
    startPan,
    updatePan,
    endPan
  };
}
