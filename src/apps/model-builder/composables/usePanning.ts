import { ref } from 'vue';

export function usePanning() {
  const isPanning = ref(false);
  const panStartX = ref(0);
  const panStartY = ref(0);
  const canvasOffset = ref({ x: 0, y: 0 });

  function startPan(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation(); // Prevent other handlers from processing this event
    
    isPanning.value = true;
    panStartX.value = event.clientX - canvasOffset.value.x;
    panStartY.value = event.clientY - canvasOffset.value.y;
    
    // Change cursor to indicate panning
    document.body.style.cursor = 'grabbing';
    
    // Add global event listeners to handle mouse movement outside the canvas
    window.addEventListener('mousemove', updatePan);
    window.addEventListener('mouseup', endPan);
  }

  function updatePan(event: MouseEvent) {
    if (!isPanning.value) return;
    
    // Update canvas position based on mouse movement
    canvasOffset.value = {
      x: event.clientX - panStartX.value,
      y: event.clientY - panStartY.value
    };
  }

  function endPan() {
    if (!isPanning.value) return;
    
    isPanning.value = false;
    document.body.style.cursor = '';
    
    // Remove global event listeners
    window.removeEventListener('mousemove', updatePan);
    window.removeEventListener('mouseup', endPan);
  }

  return {
    isPanning,
    canvasOffset,
    startPan,
    updatePan,
    endPan
  };
}
