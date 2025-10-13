import { ref, computed } from 'vue';
import type { EntityId } from '@/core/data/types';
import type { CanvasNode, Binding } from '../types';

/**
 * Composable for managing faceplate workspace state
 */
export function useWorkspaceState() {
  // Core state
  const nodes = ref<CanvasNode[]>([]);
  const bindings = ref<Binding[]>([]);
  const selectedNodeId = ref<string | null>(null);
  const selectedNodeIds = ref<Set<string>>(new Set());
  const currentFaceplateId = ref<EntityId | null>(null);
  const currentFaceplateName = ref<string>('');
  const currentTargetEntityType = ref<string>('');
  const viewportSize = ref({ x: 800, y: 600 });
  const faceplateMetadata = ref<Record<string, unknown>>({});

  // Computed properties
  const selectedNode = computed(() =>
    nodes.value.find(node => node.id === selectedNodeId.value) ?? null
  );

  const selectedNodes = computed(() =>
    nodes.value.filter(node => selectedNodeIds.value.has(node.id))
  );

  const hasFaceplateSelected = computed(() => currentFaceplateId.value !== null);

  // Actions
  function applySelection(ids: Iterable<string>, preferred?: string | null) {
    const next = new Set(ids);
    selectedNodeIds.value = next;

    if (!next.size) {
      selectedNodeId.value = null;
      return;
    }

    if (preferred && next.has(preferred)) {
      selectedNodeId.value = preferred;
      return;
    }

    const current = selectedNodeId.value;
    if (current && next.has(current)) {
      selectedNodeId.value = current;
      return;
    }

    selectedNodeId.value = next.values().next().value ?? null;
  }

  function clearSelection() {
    applySelection([], null);
  }

  function resetWorkspace() {
    nodes.value = [];
    bindings.value = [];
    currentFaceplateId.value = null;
    currentFaceplateName.value = '';
    currentTargetEntityType.value = '';
    viewportSize.value = { x: 800, y: 600 };
    faceplateMetadata.value = {};
    clearSelection();
  }

  function updateNodes(newNodes: CanvasNode[]) {
    nodes.value = newNodes;
  }

  function updateBindings(newBindings: Binding[]) {
    bindings.value = newBindings;
  }

  return {
    // State
    nodes,
    bindings,
    selectedNodeId,
    selectedNodeIds,
    currentFaceplateId,
    currentFaceplateName,
    currentTargetEntityType,
    viewportSize,
    faceplateMetadata,

    // Computed
    selectedNode,
    selectedNodes,
    hasFaceplateSelected,

    // Actions
    applySelection,
    clearSelection,
    resetWorkspace,
    updateNodes,
    updateBindings,
  };
}