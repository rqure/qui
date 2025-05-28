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
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      const delta = event.deltaY > 0 ? -1 : 1;
      updateZoom(delta);
    }
  }

  return {
    zoomLevel,
    updateZoom,
    resetZoom,
    handleWheel
  };
}
