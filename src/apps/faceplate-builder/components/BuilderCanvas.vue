<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import FaceplateCanvas, { type CanvasComponent } from './FaceplateCanvas.vue';
import type { CanvasNode, PaletteTemplate, Vector2 } from '../types';
import { GRID_SIZE_FINE, ZOOM_MIN, ZOOM_MAX, ZOOM_STEP } from '../constants';

type CanvasDropPayload = {
  componentId: string;
  position: Vector2;
};

const props = defineProps<{
  nodes: CanvasNode[];
  selectedNodeId: string | null;
  selectedNodeIds?: Set<string>;
  templates: Record<string, PaletteTemplate>;
  viewport?: Vector2;
}>();

const emit = defineEmits<{
  (event: 'node-selected', payload: { nodeId: string; isMultiSelect: boolean }): void;
  (event: 'node-requested', payload: CanvasDropPayload): void;
  (event: 'nodes-updated', updates: Array<{ nodeId: string; position: Vector2 }>): void;
  (event: 'nodes-move-end', updates: Array<{ nodeId: string; position: Vector2 }>): void;
  (event: 'node-resized', payload: { nodeId: string; size: Vector2 }): void;
  (event: 'node-resize-end', payload: { nodeId: string; size: Vector2 }): void;
  (event: 'canvas-clicked'): void;
  (event: 'drag-select-complete', selectedIds: string[]): void;
  (event: 'add-to-container', payload: { nodeIds: string[]; containerId: string }): void;
}>();

type DragState = {
  pointerStart: Vector2;
  element: HTMLElement;
  selection: string[];
  origins: Map<string, Vector2>;
};

type ResizeState = {
  nodeId: string;
  handle: string; // 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'
  pointerStart: Vector2;
  originalPosition: Vector2;
  originalSize: Vector2;
};

type SelectBoxState = {
  start: Vector2;
  current: Vector2;
  isActive: boolean;
};

const dragState = reactive<{ current: DragState | null }>({ current: null });
const resizeState = reactive<{ current: ResizeState | null }>({ current: null });
const selectBoxState = reactive<SelectBoxState>({ start: { x: 0, y: 0 }, current: { x: 0, y: 0 }, isActive: false });
const canvasRef = ref<InstanceType<typeof FaceplateCanvas> | null>(null);
const wrapperRef = ref<HTMLElement | null>(null);
const dropTargetContainerId = ref<string | null>(null);

// Zoom and pan state
const zoom = ref(1);
const pan = ref({ x: 0, y: 0 });
const isPanning = ref(false);
const panStart = ref({ x: 0, y: 0 });
const panOrigin = ref({ x: 0, y: 0 });

// Snapping state
const snapToGridEnabled = ref(true);

// Alignment guides state
const alignmentGuides = ref<Array<{
  type: 'vertical' | 'horizontal';
  position: number;
  label: string;
}>>([]);
const ALIGNMENT_THRESHOLD = 5; // pixels

// Computed for multi-select check
const hasMultipleSelected = computed(() => (props.selectedNodeIds?.size ?? 0) > 1);

// Convert CanvasNode to CanvasComponent format (preserving parent-child relationships)
// Filter out hidden nodes (they won't render in builder but will at runtime)
const canvasComponents = computed<CanvasComponent[]>(() => {
  return props.nodes
    .filter(node => !node.hidden) // Hide components marked as hidden
    .map(node => ({
      id: node.id,
      type: node.componentId,
      position: node.position,
      size: node.size,
      config: node.props,
      parentId: node.parentId,
      // Children will be assembled by FaceplateCanvas
    }));
});

// Helper to check if a component is a container
function isContainerType(componentId: string): boolean {
  return componentId === 'primitive.container' || componentId === 'primitive.container.tabs';
}

// Find container at given position during drag
// Considers nested containers and z-index to find the topmost container
function findContainerAtPosition(x: number, y: number): CanvasNode | null {
  // Find containers under the cursor, excluding selected nodes being dragged
  const selectedIds = props.selectedNodeIds ? Array.from(props.selectedNodeIds) : [];
  const containers = props.nodes.filter(node => 
    isContainerType(node.componentId) && !selectedIds.includes(node.id)
  );
  
  // Find all containers that contain this point
  const matchingContainers = containers.filter(container => {
    const inBounds = x >= container.position.x && 
                     x <= container.position.x + container.size.x &&
                     y >= container.position.y && 
                     y <= container.position.y + container.size.y;
    return inBounds;
  });
  
  if (!matchingContainers.length) return null;
  
  // Sort by z-index (higher first) and then by order in array (later = on top)
  matchingContainers.sort((a, b) => {
    const aZ = a.zIndex ?? 0;
    const bZ = b.zIndex ?? 0;
    if (aZ !== bZ) return bZ - aZ; // Higher z-index first
    
    // If same z-index, prefer the one that appears later in the nodes array
    const aIdx = props.nodes.indexOf(a);
    const bIdx = props.nodes.indexOf(b);
    return bIdx - aIdx;
  });
  
  // Return the topmost container
  return matchingContainers[0];
}

function handleDragOver(event: DragEvent) {
  event.preventDefault();
  event.dataTransfer && (event.dataTransfer.dropEffect = 'copy');
}

function handleDrop(event: DragEvent) {
  event.preventDefault();
  const componentId = event.dataTransfer?.getData('application/x-faceplate-component') || event.dataTransfer?.getData('text/plain');
  if (!componentId || !canvasRef.value?.canvasRef) return;

  const canvasEl = canvasRef.value.canvasRef;
  const rect = canvasEl.getBoundingClientRect();
  const localX = (event.clientX - rect.left - pan.value.x) / zoom.value + canvasEl.scrollLeft;
  const localY = (event.clientY - rect.top - pan.value.y) / zoom.value + canvasEl.scrollTop;

  const snapped = snapToGrid({ x: localX, y: localY });
  emit('node-requested', {
    componentId,
    position: snapped,
  });
}

function snapToGrid(point: Vector2): Vector2 {
  if (!snapToGridEnabled.value) {
    return {
      x: Math.max(0, point.x),
      y: Math.max(0, point.y),
    };
  }
  return {
    x: Math.max(0, Math.round(point.x / GRID_SIZE_FINE) * GRID_SIZE_FINE),
    y: Math.max(0, Math.round(point.y / GRID_SIZE_FINE) * GRID_SIZE_FINE),
  };
}

// Detect alignment guides when dragging
function detectAlignmentGuides(
  draggedNodes: Array<{ nodeId: string; position: Vector2; size: Vector2 }>,
): Array<{ type: 'vertical' | 'horizontal'; position: number; label: string }> {
  const guides: Array<{ type: 'vertical' | 'horizontal'; position: number; label: string }> = [];
  
  // Get all other nodes (not being dragged)
  const draggedIds = new Set(draggedNodes.map(n => n.nodeId));
  const staticNodes = props.nodes.filter(n => !draggedIds.has(n.id));
  
  // For each dragged node, check alignment with static nodes
  draggedNodes.forEach(draggedNode => {
    const draggedLeft = draggedNode.position.x;
    const draggedRight = draggedNode.position.x + draggedNode.size.x;
    const draggedCenterX = draggedNode.position.x + draggedNode.size.x / 2;
    const draggedTop = draggedNode.position.y;
    const draggedBottom = draggedNode.position.y + draggedNode.size.y;
    const draggedCenterY = draggedNode.position.y + draggedNode.size.y / 2;
    
    staticNodes.forEach(staticNode => {
      const staticLeft = staticNode.position.x;
      const staticRight = staticNode.position.x + staticNode.size.x;
      const staticCenterX = staticNode.position.x + staticNode.size.x / 2;
      const staticTop = staticNode.position.y;
      const staticBottom = staticNode.position.y + staticNode.size.y;
      const staticCenterY = staticNode.position.y + staticNode.size.y / 2;
      
      // Check vertical alignments (X-axis)
      if (Math.abs(draggedLeft - staticLeft) < ALIGNMENT_THRESHOLD) {
        guides.push({ type: 'vertical', position: staticLeft, label: 'Left' });
      }
      if (Math.abs(draggedRight - staticRight) < ALIGNMENT_THRESHOLD) {
        guides.push({ type: 'vertical', position: staticRight, label: 'Right' });
      }
      if (Math.abs(draggedCenterX - staticCenterX) < ALIGNMENT_THRESHOLD) {
        guides.push({ type: 'vertical', position: staticCenterX, label: 'Center' });
      }
      if (Math.abs(draggedLeft - staticRight) < ALIGNMENT_THRESHOLD) {
        guides.push({ type: 'vertical', position: staticRight, label: 'Edge' });
      }
      if (Math.abs(draggedRight - staticLeft) < ALIGNMENT_THRESHOLD) {
        guides.push({ type: 'vertical', position: staticLeft, label: 'Edge' });
      }
      
      // Check horizontal alignments (Y-axis)
      if (Math.abs(draggedTop - staticTop) < ALIGNMENT_THRESHOLD) {
        guides.push({ type: 'horizontal', position: staticTop, label: 'Top' });
      }
      if (Math.abs(draggedBottom - staticBottom) < ALIGNMENT_THRESHOLD) {
        guides.push({ type: 'horizontal', position: staticBottom, label: 'Bottom' });
      }
      if (Math.abs(draggedCenterY - staticCenterY) < ALIGNMENT_THRESHOLD) {
        guides.push({ type: 'horizontal', position: staticCenterY, label: 'Center' });
      }
      if (Math.abs(draggedTop - staticBottom) < ALIGNMENT_THRESHOLD) {
        guides.push({ type: 'horizontal', position: staticBottom, label: 'Edge' });
      }
      if (Math.abs(draggedBottom - staticTop) < ALIGNMENT_THRESHOLD) {
        guides.push({ type: 'horizontal', position: staticTop, label: 'Edge' });
      }
    });
  });
  
  // Remove duplicate guides at the same position
  const uniqueGuides = guides.filter((guide, index, self) => 
    index === self.findIndex(g => 
      g.type === guide.type && Math.abs(g.position - guide.position) < 1
    )
  );
  
  return uniqueGuides;
}

// Snap to alignment guides if close enough
function snapToAlignmentGuides(
  position: Vector2,
  size: Vector2,
  guides: Array<{ type: 'vertical' | 'horizontal'; position: number; label: string }>,
): Vector2 {
  let snappedX = position.x;
  let snappedY = position.y;
  
  const left = position.x;
  const right = position.x + size.x;
  const centerX = position.x + size.x / 2;
  const top = position.y;
  const bottom = position.y + size.y;
  const centerY = position.y + size.y / 2;
  
  guides.forEach(guide => {
    if (guide.type === 'vertical') {
      // Try to snap left, right, or center to the guide
      if (Math.abs(left - guide.position) < ALIGNMENT_THRESHOLD) {
        snappedX = guide.position;
      } else if (Math.abs(right - guide.position) < ALIGNMENT_THRESHOLD) {
        snappedX = guide.position - size.x;
      } else if (Math.abs(centerX - guide.position) < ALIGNMENT_THRESHOLD) {
        snappedX = guide.position - size.x / 2;
      }
    } else {
      // Try to snap top, bottom, or center to the guide
      if (Math.abs(top - guide.position) < ALIGNMENT_THRESHOLD) {
        snappedY = guide.position;
      } else if (Math.abs(bottom - guide.position) < ALIGNMENT_THRESHOLD) {
        snappedY = guide.position - size.y;
      } else if (Math.abs(centerY - guide.position) < ALIGNMENT_THRESHOLD) {
        snappedY = guide.position - size.y / 2;
      }
    }
  });
  
  return { x: snappedX, y: snappedY };
}

function toggleSnap() {
  snapToGridEnabled.value = !snapToGridEnabled.value;
}

function handleZoomIn() {
  zoom.value = Math.min(ZOOM_MAX, zoom.value + ZOOM_STEP);
}

function handleZoomOut() {
  zoom.value = Math.max(ZOOM_MIN, zoom.value - ZOOM_STEP);
}

function handleZoomReset() {
  zoom.value = 1;
  pan.value = { x: 0, y: 0 };
}

function handleZoomFit() {
  if (!props.viewport || !canvasRef.value?.canvasRef) return;
  const canvasEl = canvasRef.value.canvasRef;
  const containerWidth = canvasEl.clientWidth;
  const containerHeight = canvasEl.clientHeight;
  const contentWidth = props.viewport.x;
  const contentHeight = props.viewport.y;
  
  const scaleX = containerWidth / contentWidth;
  const scaleY = containerHeight / contentHeight;
  zoom.value = Math.min(scaleX, scaleY, 1) * 0.9; // 90% to add padding
  pan.value = { x: 0, y: 0 };
}

function handleWheel(event: WheelEvent) {
  if (!event.ctrlKey && !event.metaKey) return;
  event.preventDefault();
  
  const delta = -event.deltaY * 0.001;
  const newZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoom.value + delta));
  
  // Zoom towards cursor position
  if (canvasRef.value?.canvasRef) {
    const rect = canvasRef.value.canvasRef.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    const zoomRatio = newZoom / zoom.value;
    pan.value = {
      x: mouseX - (mouseX - pan.value.x) * zoomRatio,
      y: mouseY - (mouseY - pan.value.y) * zoomRatio,
    };
  }
  
  zoom.value = newZoom;
}

function handleResizeHandlePointerDown(event: PointerEvent, nodeId: string, handle: string) {
  event.stopPropagation();
  event.preventDefault();
  
  const node = props.nodes.find(n => n.id === nodeId);
  if (!node) return;
  
  // Don't allow resizing locked nodes
  if (node.locked) return;
  
  resizeState.current = {
    nodeId,
    handle,
    pointerStart: { x: event.clientX, y: event.clientY },
    originalPosition: { ...node.position },
    originalSize: { ...node.size },
  };
  
  (event.target as HTMLElement).setPointerCapture(event.pointerId);
}

function handleComponentClick(payload: { id: string | number; event: PointerEvent; isMultiSelect: boolean }) {
  const nodeId = String(payload.id);
  const isMultiSelect = payload.isMultiSelect;
  
  // Check if node is locked
  const clickedNode = props.nodes.find((candidate) => candidate.id === nodeId);
  if (clickedNode?.locked) {
    // Still select locked nodes, but don't allow dragging
    emit('node-selected', { nodeId: nodeId, isMultiSelect: false });
    return;
  }
  
  emit('node-selected', { nodeId, isMultiSelect });

  const selection = new Set(props.selectedNodeIds ? Array.from(props.selectedNodeIds) : []);
  if (isMultiSelect) {
    if (selection.has(nodeId)) {
      selection.delete(nodeId);
    } else {
      selection.add(nodeId);
    }
    if (!selection.size) {
      selection.add(nodeId);
    }
  } else {
    selection.clear();
    selection.add(nodeId);
  }

  // Filter out locked nodes from drag selection
  const unlockedSelection = Array.from(selection).filter(id => {
    const node = props.nodes.find((candidate) => candidate.id === id);
    return node && !node.locked;
  });
  
  if (unlockedSelection.length === 0) {
    return; // All selected nodes are locked, don't start drag
  }

  const originMap = new Map<string, Vector2>();
  unlockedSelection.forEach((id) => {
    const node = props.nodes.find((candidate) => candidate.id === id);
    if (node) {
      originMap.set(id, { ...node.position });
    }
  });

  const target = payload.event.currentTarget as HTMLElement | null;
  if (!target) return;

  dragState.current = {
    pointerStart: { x: payload.event.clientX, y: payload.event.clientY },
    element: target,
    selection: unlockedSelection,
    origins: originMap,
  };

  target.setPointerCapture(payload.event.pointerId);
}

function handleCanvasClick(pointerEvent: PointerEvent) {
  emit('canvas-clicked');
}

function handleCanvasPointerDown(event: PointerEvent) {
  if (!canvasRef.value?.canvasRef) return;
  
  // Check for space bar pan mode
  if (event.button === 1 || (event.button === 0 && event.shiftKey && event.altKey)) {
    isPanning.value = true;
    panStart.value = { x: event.clientX, y: event.clientY };
    panOrigin.value = { ...pan.value };
    return;
  }
  
  // Only handle canvas background clicks, not component clicks
  const target = event.target as HTMLElement;
  if (target.closest('.faceplate-canvas__component') || target.classList.contains('faceplate-canvas__component')) {
    return;
  }

  const canvasEl = canvasRef.value.canvasRef;
  const rect = canvasEl.getBoundingClientRect();
  // Properly transform screen coordinates to canvas coordinates accounting for zoom and pan
  const point = {
    x: (event.clientX - rect.left - pan.value.x) / zoom.value,
    y: (event.clientY - rect.top - pan.value.y) / zoom.value,
  };
  
  selectBoxState.start = point;
  selectBoxState.current = point;
  selectBoxState.isActive = true;
}



function handlePointerMove(event: PointerEvent) {
  // Handle panning
  if (isPanning.value) {
    pan.value = {
      x: panOrigin.value.x + (event.clientX - panStart.value.x),
      y: panOrigin.value.y + (event.clientY - panStart.value.y),
    };
    return;
  }
  
  // Handle resize
  if (resizeState.current) {
    const { nodeId, handle, pointerStart, originalPosition, originalSize } = resizeState.current;
    const deltaX = (event.clientX - pointerStart.x) / zoom.value;
    const deltaY = (event.clientY - pointerStart.y) / zoom.value;
    
    let newPos = { ...originalPosition };
    let newSize = { ...originalSize };
    
    // Calculate new size and position based on handle
    if (handle.includes('w')) {
      newPos.x = originalPosition.x + deltaX;
      newSize.x = Math.max(80, originalSize.x - deltaX);
    }
    if (handle.includes('e')) {
      newSize.x = Math.max(80, originalSize.x + deltaX);
    }
    if (handle.includes('n')) {
      newPos.y = originalPosition.y + deltaY;
      newSize.y = Math.max(60, originalSize.y - deltaY);
    }
    if (handle.includes('s')) {
      newSize.y = Math.max(60, originalSize.y + deltaY);
    }
    
    // Apply snapping
    const snappedPos = snapToGrid(newPos);
    const snappedSize = snapToGrid(newSize);
    
    emit('nodes-updated', [{
      nodeId,
      position: snappedPos,
    }]);
    
    // Also emit size update
    emit('node-resized', { nodeId, size: snappedSize });
    return;
  }
  
  // Handle drag-select box
  if (selectBoxState.isActive && canvasRef.value?.canvasRef) {
    const canvasEl = canvasRef.value.canvasRef;
    const rect = canvasEl.getBoundingClientRect();
    selectBoxState.current = {
      x: (event.clientX - rect.left - pan.value.x) / zoom.value + canvasEl.scrollLeft,
      y: (event.clientY - rect.top - pan.value.y) / zoom.value + canvasEl.scrollTop,
    };
    return;
  }
  
  // Handle node dragging
  if (!dragState.current) return;

  const { origins, selection, pointerStart } = dragState.current;
  const primaryOrigin = origins.get(selection[0]);
  if (!primaryOrigin) {
    return;
  }

  const deltaX = event.clientX - pointerStart.x;
  const deltaY = event.clientY - pointerStart.y;
  let snappedPrimary = snapToGrid({
    x: primaryOrigin.x + deltaX,
    y: primaryOrigin.y + deltaY,
  });

  // Get primary node size for alignment detection
  const primaryNode = props.nodes.find(n => n.id === selection[0]);
  if (primaryNode) {
    // Detect alignment guides
    const draggedNodesInfo = [{
      nodeId: primaryNode.id,
      position: snappedPrimary,
      size: primaryNode.size,
    }];
    const guides = detectAlignmentGuides(draggedNodesInfo);
    alignmentGuides.value = guides;
    
    // Snap to alignment guides if detected
    if (guides.length > 0) {
      snappedPrimary = snapToAlignmentGuides(snappedPrimary, primaryNode.size, guides);
    }
  }

  const shift = {
    x: snappedPrimary.x - primaryOrigin.x,
    y: snappedPrimary.y - primaryOrigin.y,
  };

  const updates = selection.map((id) => {
    const origin = origins.get(id);
    if (!origin) {
      return null;
    }
    return {
      nodeId: id,
      position: {
        x: Math.max(0, origin.x + shift.x),
        y: Math.max(0, origin.y + shift.y),
      },
    };
  }).filter((update): update is { nodeId: string; position: Vector2 } => Boolean(update));

  if (updates.length) {
    emit('nodes-updated', updates);
  }

  // Check if hovering over a container for drag-to-contain
  if (canvasRef.value?.canvasRef) {
    const canvasEl = canvasRef.value.canvasRef;
    const rect = canvasEl.getBoundingClientRect();
    const canvasX = (event.clientX - rect.left - pan.value.x) / zoom.value + canvasEl.scrollLeft;
    const canvasY = (event.clientY - rect.top - pan.value.y) / zoom.value + canvasEl.scrollTop;
    
    const container = findContainerAtPosition(canvasX, canvasY);
    dropTargetContainerId.value = container ? container.id : null;
  }
}

function handlePointerUp(event: PointerEvent) {
  // Handle pan end
  if (isPanning.value) {
    isPanning.value = false;
    return;
  }
  
  // Handle resize end
  if (resizeState.current) {
    const { nodeId } = resizeState.current;
    const node = props.nodes.find(n => n.id === nodeId);
    if (node) {
      emit('node-resize-end', { nodeId, size: node.size });
    }
    resizeState.current = null;
    return;
  }
  
  // Handle drag-select completion
  if (selectBoxState.isActive) {
    const box = getSelectBox();
    const selectedIds: string[] = [];
    
    // Check which nodes intersect with the selection box
    for (const node of props.nodes) {
      const nodeBox = {
        x: node.position.x,
        y: node.position.y,
        width: node.size.x,
        height: node.size.y,
      };
      
      if (boxesIntersect(box, nodeBox)) {
        selectedIds.push(node.id);
      }
    }
    
    // Emit selection event with multiple nodes
    if (selectedIds.length > 0) {
      emit('drag-select-complete', selectedIds);
    }
    
    selectBoxState.isActive = false;
    return;
  }
  
  // Handle node drag completion
  if (!dragState.current) return;
  const { element, selection, origins, pointerStart } = dragState.current;
  element.releasePointerCapture(event.pointerId);

  const primaryOrigin = origins.get(selection[0]);
  if (primaryOrigin) {
    const snappedPrimary = snapToGrid({
      x: primaryOrigin.x + (event.clientX - pointerStart.x),
      y: primaryOrigin.y + (event.clientY - pointerStart.y),
    });
    const shift = {
      x: snappedPrimary.x - primaryOrigin.x,
      y: snappedPrimary.y - primaryOrigin.y,
    };

    const updates = selection.map((id) => {
      const origin = origins.get(id);
      if (!origin) {
        return null;
      }
      return {
        nodeId: id,
        position: {
          x: Math.max(0, origin.x + shift.x),
          y: Math.max(0, origin.y + shift.y),
        },
      };
    }).filter((update): update is { nodeId: string; position: Vector2 } => Boolean(update));

    if (updates.length) {
      emit('nodes-move-end', updates);
    }

    // Handle drag-to-contain if hovering over a container
    if (dropTargetContainerId.value) {
      emit('add-to-container', {
        nodeIds: selection,
        containerId: dropTargetContainerId.value
      });
    }
  }

  dropTargetContainerId.value = null;
  dragState.current = null;
  alignmentGuides.value = []; // Clear alignment guides
}

function getSelectBox() {
  const minX = Math.min(selectBoxState.start.x, selectBoxState.current.x);
  const minY = Math.min(selectBoxState.start.y, selectBoxState.current.y);
  const maxX = Math.max(selectBoxState.start.x, selectBoxState.current.x);
  const maxY = Math.max(selectBoxState.start.y, selectBoxState.current.y);
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function boxesIntersect(
  box1: { x: number; y: number; width: number; height: number },
  box2: { x: number; y: number; width: number; height: number }
): boolean {
  return !(
    box1.x + box1.width < box2.x ||
    box2.x + box2.width < box1.x ||
    box1.y + box1.height < box2.y ||
    box2.y + box2.height < box1.y
  );
}

function handleCanvasKeyDown(event: KeyboardEvent) {
  const isMod = event.metaKey || event.ctrlKey;
  
  // Zoom shortcuts: Cmd/Ctrl + Plus/Minus
  if (isMod && (event.key === '=' || event.key === '+')) {
    event.preventDefault();
    handleZoomIn();
    return;
  }
  
  if (isMod && (event.key === '-' || event.key === '_')) {
    event.preventDefault();
    handleZoomOut();
    return;
  }
  
  // Reset zoom: Cmd/Ctrl + 0
  if (isMod && event.key === '0') {
    event.preventDefault();
    handleZoomReset();
    return;
  }
}

function setupListeners() {
  document.addEventListener('pointermove', handlePointerMove);
  document.addEventListener('pointerup', handlePointerUp);
  document.addEventListener('keydown', handleCanvasKeyDown);
}

function teardownListeners() {
  document.removeEventListener('pointermove', handlePointerMove);
  document.removeEventListener('pointerup', handlePointerUp);
  document.removeEventListener('keydown', handleCanvasKeyDown);
}

onMounted(setupListeners);
onBeforeUnmount(teardownListeners);
</script>

<template>
  <section 
    ref="wrapperRef"
    class="builder-canvas-wrapper"
    @dragover="handleDragOver"
    @drop="handleDrop"
  >
    <!-- Zoom controls -->
    <div class="zoom-controls">
      <button type="button" class="zoom-btn" @click="handleZoomOut" title="Zoom Out (Ctrl + Scroll)">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M2 8h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
      <span class="zoom-level">{{ Math.round(zoom * 100) }}%</span>
      <button type="button" class="zoom-btn" @click="handleZoomIn" title="Zoom In (Ctrl + Scroll)">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 2v12M2 8h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
      <button type="button" class="zoom-btn" @click="handleZoomReset" title="Reset Zoom (100%)">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="2" fill="none"/>
          <path d="M8 5v6M5 8h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </button>
      <button type="button" class="zoom-btn" @click="handleZoomFit" title="Fit to Viewport" v-if="viewport">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <rect x="2" y="2" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none" rx="1"/>
          <path d="M5 8h6M8 5v6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </button>
      <div class="zoom-divider"></div>
      <button 
        type="button" 
        class="zoom-btn snap-btn" 
        :class="{ 'snap-active': snapToGridEnabled }"
        @click="toggleSnap" 
        :title="snapToGridEnabled ? 'Snap to Grid: ON (10px)' : 'Snap to Grid: OFF'"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <rect x="2" y="2" width="4" height="4" fill="currentColor" opacity="0.5"/>
          <rect x="10" y="2" width="4" height="4" fill="currentColor" opacity="0.5"/>
          <rect x="2" y="10" width="4" height="4" fill="currentColor" opacity="0.5"/>
          <rect x="10" y="10" width="4" height="4" fill="currentColor" opacity="0.5"/>
          <rect x="6" y="6" width="4" height="4" fill="currentColor"/>
        </svg>
      </button>
      <span class="zoom-hint">Ctrl+Scroll to zoom • Middle-click to pan</span>
    </div>
    
    <FaceplateCanvas
      ref="canvasRef"
      :components="canvasComponents"
      :viewport="viewport"
      :edit-mode="true"
      :selected-component-id="selectedNodeId"
      :selected-component-ids="selectedNodeIds"
      :drop-target-container-id="dropTargetContainerId"
      :show-grid="true"
      :show-viewport-boundary="!!viewport"
      :zoom="zoom"
      :pan="pan"
      @component-click="handleComponentClick"
      @canvas-click="handleCanvasClick"
      @pointerdown.capture="handleCanvasPointerDown"
      @wheel.prevent="handleWheel"
    />
    
    <!-- Drag-select box overlay (positioned absolutely over canvas) -->
    <div 
      v-if="selectBoxState.isActive"
      class="builder-canvas-wrapper__select-box"
      :style="{
        left: `${Math.min(selectBoxState.start.x, selectBoxState.current.x) * zoom + pan.x}px`,
        top: `${Math.min(selectBoxState.start.y, selectBoxState.current.y) * zoom + pan.y}px`,
        width: `${Math.abs(selectBoxState.current.x - selectBoxState.start.x) * zoom}px`,
        height: `${Math.abs(selectBoxState.current.y - selectBoxState.start.y) * zoom}px`,
      }"
    ></div>
    
    <!-- Resize handles for single selected node -->
    <template v-if="selectedNodeId && !hasMultipleSelected">
      <template v-for="node in nodes" :key="`resize-${node.id}`">
        <div 
          v-if="node.id === selectedNodeId"
          class="resize-handles"
          :style="{
            left: `${node.position.x * zoom + pan.x}px`,
            top: `${node.position.y * zoom + pan.y}px`,
            width: `${node.size.x * zoom}px`,
            height: `${node.size.y * zoom}px`,
            pointerEvents: 'none',
          }"
        >
          <div 
            v-for="handle in ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']" 
            :key="handle"
            :class="['resize-handle', `resize-handle-${handle}`]"
            :style="{ pointerEvents: 'auto' }"
            @pointerdown.stop="handleResizeHandlePointerDown($event, node.id, handle)"
          ></div>
        </div>
      </template>
    </template>
    
    <!-- Alignment guides -->
    <div 
      v-for="(guide, index) in alignmentGuides" 
      :key="`guide-${index}`"
      class="alignment-guide"
      :class="{
        'alignment-guide--vertical': guide.type === 'vertical',
        'alignment-guide--horizontal': guide.type === 'horizontal',
      }"
      :style="{
        [guide.type === 'vertical' ? 'left' : 'top']: `${guide.position * zoom + (guide.type === 'vertical' ? pan.x : pan.y)}px`,
      }"
    >
      <div class="alignment-guide__label">{{ guide.label }}</div>
    </div>
  </section>
</template>

<style scoped>
.builder-canvas-wrapper {
  position: relative;
  flex: 1;
  overflow: hidden;
}

.zoom-controls {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  backdrop-filter: blur(8px);
}

.zoom-btn {
  padding: 6px 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  color: var(--qui-text-primary);
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.zoom-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(0, 255, 194, 0.4);
}

.zoom-btn:active {
  transform: scale(0.95);
}

.zoom-level {
  min-width: 50px;
  text-align: center;
  font-size: 13px;
  font-weight: 600;
  color: var(--qui-text-primary);
}

.zoom-divider {
  width: 1px;
  height: 20px;
  background: rgba(255, 255, 255, 0.1);
  margin: 0 4px;
}

.snap-btn {
  position: relative;
}

.snap-btn.snap-active {
  background: rgba(0, 255, 194, 0.15);
  border-color: rgba(0, 255, 194, 0.4);
}

.snap-btn.snap-active::after {
  content: '';
  position: absolute;
  top: 2px;
  right: 2px;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: rgba(0, 255, 194, 1);
  box-shadow: 0 0 4px rgba(0, 255, 194, 0.8);
}

.zoom-hint {
  margin-left: 4px;
  padding-left: 12px;
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 11px;
  color: var(--qui-text-secondary);
  opacity: 0.7;
}

/* Resize handles */
.resize-handles {
  position: absolute;
  pointer-events: none;
  z-index: 1000;
}

.resize-handle {
  position: absolute;
  width: 10px;
  height: 10px;
  background: rgba(0, 255, 194, 0.9);
  border: 2px solid rgba(255, 255, 255, 0.9);
  border-radius: 2px;
  pointer-events: auto;
  transition: all 0.2s;
}

.resize-handle:hover {
  background: rgba(0, 255, 255, 1);
  transform: scale(1.3);
  box-shadow: 0 0 8px rgba(0, 255, 194, 0.8);
}

.resize-handle-nw {
  top: -5px;
  left: -5px;
  cursor: nw-resize;
}

.resize-handle-n {
  top: -5px;
  left: 50%;
  transform: translateX(-50%);
  cursor: n-resize;
}

.resize-handle-ne {
  top: -5px;
  right: -5px;
  cursor: ne-resize;
}

.resize-handle-e {
  top: 50%;
  right: -5px;
  transform: translateY(-50%);
  cursor: e-resize;
}

.resize-handle-se {
  bottom: -5px;
  right: -5px;
  cursor: se-resize;
}

.resize-handle-s {
  bottom: -5px;
  left: 50%;
  transform: translateX(-50%);
  cursor: s-resize;
}

.resize-handle-sw {
  bottom: -5px;
  left: -5px;
  cursor: sw-resize;
}

.resize-handle-w {
  top: 50%;
  left: -5px;
  transform: translateY(-50%);
  cursor: w-resize;
}

.builder-canvas-wrapper__select-box {
  position: absolute;
  border: 2px dashed rgba(100, 150, 255, 0.8);
  background: rgba(100, 150, 255, 0.15);
  pointer-events: none;
  z-index: 1000;
}

/* Alignment guides */
.alignment-guide {
  position: absolute;
  pointer-events: none;
  z-index: 999;
}

.alignment-guide--vertical {
  top: 0;
  bottom: 0;
  width: 1px;
  background: linear-gradient(
    to bottom,
    transparent 0%,
    rgba(255, 100, 255, 0.8) 10%,
    rgba(255, 100, 255, 0.8) 90%,
    transparent 100%
  );
  box-shadow: 0 0 8px rgba(255, 100, 255, 0.6);
  animation: guide-pulse 1.5s ease-in-out infinite;
}

.alignment-guide--horizontal {
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(
    to right,
    transparent 0%,
    rgba(255, 100, 255, 0.8) 10%,
    rgba(255, 100, 255, 0.8) 90%,
    transparent 100%
  );
  box-shadow: 0 0 8px rgba(255, 100, 255, 0.6);
  animation: guide-pulse 1.5s ease-in-out infinite;
}

@keyframes guide-pulse {
  0%, 100% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
}

.alignment-guide__label {
  position: absolute;
  padding: 4px 8px;
  background: rgba(255, 100, 255, 0.9);
  color: white;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  white-space: nowrap;
}

.alignment-guide--vertical .alignment-guide__label {
  top: 50%;
  left: 4px;
  transform: translateY(-50%);
}

.alignment-guide--horizontal .alignment-guide__label {
  left: 50%;
  top: 4px;
  transform: translateX(-50%);
}
</style>
