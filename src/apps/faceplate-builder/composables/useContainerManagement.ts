import { ContainerManagementService } from '../utils/container-management';
import { createNodeMap } from '../utils/helpers';
import type { CanvasNode } from '../types';

export function useContainerManagement() {
  function convertTemplateMap(templates: Record<string, any>): Map<string, { id: string; primitiveId: string }> {
    return new Map(Object.entries(templates).map(([id, template]) => [id, { id, primitiveId: template.primitiveId }]));
  }

  function isContainer(nodeId: string, nodes: CanvasNode[], templates: Record<string, any>): boolean {
    const node = createNodeMap(nodes).get(nodeId);
    if (!node) return false;
    return ContainerManagementService.isContainer(node, convertTemplateMap(templates));
  }

  function getAllContainers(nodes: CanvasNode[], templates: Record<string, any>): CanvasNode[] {
    return ContainerManagementService.getAllContainers(nodes, convertTemplateMap(templates));
  }

  function getContainerChildren(containerId: string, nodes: CanvasNode[]): CanvasNode[] {
    return ContainerManagementService.getContainerChildren(containerId, nodes);
  }

  function addToContainer(
    nodeIds: string[],
    containerId: string,
    nodes: CanvasNode[],
    templates: Record<string, any>,
    onHistoryPush: () => void
  ) {
    nodes.splice(0, nodes.length, ...ContainerManagementService.addToContainer(nodeIds, containerId, nodes, convertTemplateMap(templates)));
    onHistoryPush();
  }

  function removeFromContainer(nodeIds: string[], nodes: CanvasNode[], onHistoryPush: () => void) {
    nodes.splice(0, nodes.length, ...ContainerManagementService.removeFromContainer(nodeIds, nodes));
    onHistoryPush();
  }

  function clearContainerChildren(containerId: string, nodes: CanvasNode[], onHistoryPush: () => void) {
    nodes.splice(0, nodes.length, ...ContainerManagementService.clearContainerChildren(containerId, nodes));
    onHistoryPush();
  }

  function groupSelectedNodes(
    selectedNodeIds: Set<string>,
    nodes: CanvasNode[],
    templates: Record<string, any>,
    onSelectionChange: (ids: string[], primaryId?: string) => void,
    onHistoryPush: () => void
  ) {
    const result = ContainerManagementService.groupSelectedNodes(Array.from(selectedNodeIds), nodes, convertTemplateMap(templates));
    if (!result) return;

    nodes.splice(0, nodes.length, ...result.nodes);

    // Select the new container
    onSelectionChange([result.containerId], result.containerId);
    onHistoryPush();
  }

  function ungroupSelectedNode(
    selectedNodeIds: Set<string>,
    nodes: CanvasNode[],
    bindings: any[],
    templates: Record<string, any>,
    onSelectionChange: (ids: string[], primaryId?: string) => void,
    onHistoryPush: () => void
  ) {
    if (selectedNodeIds.size !== 1) return;

    const containerId = Array.from(selectedNodeIds)[0];
    const result = ContainerManagementService.ungroupSelectedNode(containerId, nodes, convertTemplateMap(templates));
    if (!result) return;

    nodes.splice(0, nodes.length, ...result.nodes);

    // Select the ungrouped children
    onSelectionChange(result.childIds, result.childIds[0]);

    // Remove any bindings associated with the container
    const filteredBindings = bindings.filter(b => b.componentId !== containerId);
    bindings.splice(0, bindings.length, ...filteredBindings);

    onHistoryPush();
  }

  function getAbsolutePosition(node: CanvasNode, nodes: CanvasNode[]): { x: number; y: number } {
    return ContainerManagementService.getAbsolutePosition(node, nodes);
  }

  function isAncestor(potentialAncestorId: string, nodeId: string, nodes: CanvasNode[]): boolean {
    return ContainerManagementService.isAncestor(potentialAncestorId, nodeId, nodes);
  }

  return {
    isContainer,
    getAllContainers,
    getContainerChildren,
    addToContainer,
    removeFromContainer,
    clearContainerChildren,
    groupSelectedNodes,
    ungroupSelectedNode,
    getAbsolutePosition,
    isAncestor,
  };
}