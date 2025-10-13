import { ref } from 'vue';
import { generateId } from '../utils/helpers';
import type { CanvasNode, Binding } from '../types';

export interface ClipboardData {
  nodes: CanvasNode[];
  bindings: Binding[];
}

export function useClipboard() {
  const clipboard = ref<ClipboardData | null>(null);

  function copySelectedNodes(selectedNodeIds: Set<string>, nodes: CanvasNode[], bindings: Binding[]) {
    if (!selectedNodeIds.size) return;

    const nodesToCopy = nodes.filter(node => selectedNodeIds.has(node.id));
    const bindingsToCopy = bindings.filter(b => selectedNodeIds.has(b.componentId));

    clipboard.value = {
      nodes: nodesToCopy.map(node => ({ ...node })),
      bindings: bindingsToCopy.map(b => ({ ...b })),
    };
  }

  function pasteNodes(
    nodes: CanvasNode[],
    bindings: Binding[],
    position: { x: number; y: number },
    onSelectionChange: (ids: string[], primaryId?: string) => void,
    onHistoryPush: () => void
  ) {
    if (!clipboard.value) return;

    const idMapping = new Map<string, string>();
    const newNodes: CanvasNode[] = [];
    const newBindings: Binding[] = [];

    // Create new nodes with offset position
    for (const node of clipboard.value.nodes) {
      const newId = generateId('node');
      idMapping.set(node.id, newId);

      const newNode: CanvasNode = {
        ...node,
        id: newId,
        name: `${node.name} (Paste)`,
        position: { x: node.position.x + position.x, y: node.position.y + position.y },
        selected: false,
        parentId: node.parentId, // Preserve parent if any
        children: undefined,
      };
      newNodes.push(newNode);
    }

    // Create new bindings
    for (const binding of clipboard.value.bindings) {
      const newComponentId = idMapping.get(binding.componentId);
      if (!newComponentId) continue;

      const newBinding: Binding = {
        ...binding,
        id: generateId('binding'),
        componentId: newComponentId,
        componentName: newNodes.find(n => n.id === newComponentId)?.name || binding.componentName,
      };
      newBindings.push(newBinding);
    }

    nodes.push(...newNodes);
    bindings.push(...newBindings);

    // Select the newly pasted nodes
    const newIds = newNodes.map(n => n.id);
    onSelectionChange(newIds, newIds[0]);
    onHistoryPush();
  }

  function duplicateSelectedNodes(
    selectedNodeIds: Set<string>,
    nodes: CanvasNode[],
    bindings: Binding[],
    onSelectionChange: (ids: string[], primaryId?: string) => void,
    onHistoryPush: () => void
  ) {
    if (!selectedNodeIds.size) return;

    const nodesToDuplicate = nodes.filter(node => selectedNodeIds.has(node.id));
    const bindingsToDuplicate = bindings.filter(b => selectedNodeIds.has(b.componentId));

    const idMapping = new Map<string, string>();
    const newNodes: CanvasNode[] = [];
    const newBindings: Binding[] = [];

    // Create new nodes with offset position
    for (const node of nodesToDuplicate) {
      const newId = generateId('node');
      idMapping.set(node.id, newId);

      const newNode: CanvasNode = {
        ...node,
        id: newId,
        name: `${node.name} (Copy)`,
        position: { x: node.position.x + 20, y: node.position.y + 20 },
        selected: false,
        // If node has a parent, keep the parent reference
        parentId: node.parentId,
        children: undefined, // Will be recalculated
      };
      newNodes.push(newNode);
    }

    // Duplicate bindings
    for (const binding of bindingsToDuplicate) {
      const newComponentId = idMapping.get(binding.componentId);
      if (!newComponentId) continue;

      const newBinding: Binding = {
        ...binding,
        id: generateId('binding'),
        componentId: newComponentId,
        componentName: nodes.find(n => n.id === newComponentId)?.name || binding.componentName,
      };
      newBindings.push(newBinding);
    }

    nodes.push(...newNodes);
    bindings.push(...newBindings);

    // Select the newly created nodes
    const newIds = newNodes.map(n => n.id);
    onSelectionChange(newIds, newIds[0]);
    onHistoryPush();
  }

  return {
    clipboard,
    copySelectedNodes,
    pasteNodes,
    duplicateSelectedNodes,
  };
}