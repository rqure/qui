import { ref, reactive, computed } from 'vue';
import type { CanvasNode, Binding, Vector2 } from '../types';

export interface HistoryState {
  nodes: CanvasNode[];
  bindings: Binding[];
  viewport: Vector2;
  metadata: Record<string, unknown>;
}

export interface HistoryManager {
  stack: HistoryState[];
  index: number;
}

export function useHistoryManager() {
  const history = reactive<HistoryManager>({
    stack: [],
    index: -1,
  });
  const savedIndex = ref(-1);

  const canUndo = computed(() => history.index > 0);
  const canRedo = computed(() => history.index < history.stack.length - 1);
  const dirty = computed(() => history.index !== savedIndex.value);

  function cloneState(nodes: CanvasNode[], bindings: Binding[], viewport: Vector2, metadata: Record<string, unknown>): HistoryState {
    return {
      nodes: nodes.map((node) => ({
        ...node,
        position: { ...node.position },
        size: { ...node.size },
        props: { ...node.props },
        parentId: node.parentId || null,
        children: node.children ? [...node.children] : undefined,
        zIndex: node.zIndex,
      })),
      bindings: bindings.map((binding) => ({ ...binding })),
      viewport: { ...viewport },
      metadata: { ...metadata },
    };
  }

  function pushHistory(nodes: CanvasNode[], bindings: Binding[], viewport: Vector2, metadata: Record<string, unknown>) {
    history.stack.splice(history.index + 1);
    history.stack.push(cloneState(nodes, bindings, viewport, metadata));
    history.index = history.stack.length - 1;
  }

  function applyState(state: HistoryState, nodes: CanvasNode[], bindings: Binding[], viewport: Vector2, metadata: Record<string, unknown>) {
    nodes.splice(0, nodes.length, ...state.nodes.map((node) => ({
      ...node,
      position: { ...node.position },
      size: { ...node.size },
      props: { ...node.props },
      parentId: node.parentId || null,
      children: node.children ? [...node.children] : undefined,
      zIndex: node.zIndex,
    })));
    bindings.splice(0, bindings.length, ...state.bindings.map((binding) => ({ ...binding })));
    viewport.x = state.viewport.x;
    viewport.y = state.viewport.y;
    // Clear all existing properties first
    Object.keys(metadata).forEach(key => delete metadata[key]);
    // Then assign the historical state
    Object.assign(metadata, state.metadata);
  }

  function undo(nodes: CanvasNode[], bindings: Binding[], viewport: Vector2, metadata: Record<string, unknown>) {
    if (!canUndo.value) return;
    history.index -= 1;
    applyState(history.stack[history.index], nodes, bindings, viewport, metadata);
  }

  function redo(nodes: CanvasNode[], bindings: Binding[], viewport: Vector2, metadata: Record<string, unknown>) {
    if (!canRedo.value) return;
    history.index += 1;
    applyState(history.stack[history.index], nodes, bindings, viewport, metadata);
  }

  function markSaved() {
    savedIndex.value = history.index;
  }

  function reset() {
    history.stack.length = 0;
    history.index = -1;
    savedIndex.value = -1;
  }

  return {
    history,
    canUndo,
    canRedo,
    dirty,
    pushHistory,
    undo,
    redo,
    markSaved,
    reset,
  };
}