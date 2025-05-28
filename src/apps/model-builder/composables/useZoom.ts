import { ref } from 'vue';

export function useZoom(minZoom = 0.1, maxZoom = 2, defaultZoom = 1) {
  const zoomLevel = ref(defaultZoom);

  function updateZoom(delta: number) {
    zoomLevel.value = Math.max(minZoom, Math.min(maxZoom, zoomLevel.value + delta * 0.1));
  }

  function resetZoom() {
    zoomLevel.value = defaultZoom;
  }

  function handleWheel(event: WheelEvent) {
    event.preventDefault();
    
    // Normalize wheel delta for consistent zooming across browsers
    const delta = normalizeWheelDelta(event);
    updateZoom(delta);
    return true;
  }
  
  // Helper function to normalize wheel delta values across different browsers
  function normalizeWheelDelta(event: WheelEvent): number {
    // Most browsers
    if (event.deltaY) {
      // Note: deltaY is opposite direction from desired zoom
      // negative deltaY = scroll up = zoom in
      const direction = event.deltaY < 0 ? 1 : -1;
      return direction * 0.5;
    }
    
    // Fallback if deltaY is not available
    return 0;
  }

  return {
    zoomLevel,
    updateZoom,
    resetZoom,
    handleWheel
  };
}
