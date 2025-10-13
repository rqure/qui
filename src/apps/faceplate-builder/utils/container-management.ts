import type { Vector2, CanvasNode } from '@/apps/faceplate-builder/types';
import { logger } from '@/apps/faceplate-builder/utils/logger';

export interface ContainerTemplate {
  id: string;
  primitiveId: string;
}

export class ContainerManagementService {
  private static readonly CONTAINER_PRIMITIVES = ['primitive.container', 'primitive.container.tabs'];

  /**
   * Check if a component type is a container
   */
  static isContainerType(componentId: string): boolean {
    return this.CONTAINER_PRIMITIVES.includes(componentId);
  }

  /**
   * Check if a node is a container based on its template
   */
  static isContainer(node: CanvasNode, templateMap: Map<string, ContainerTemplate>): boolean {
    const template = templateMap.get(node.componentId);
    if (!template) return false;
    return this.CONTAINER_PRIMITIVES.includes(template.primitiveId);
  }

  /**
   * Get all container nodes from a list of nodes
   */
  static getAllContainers(nodes: CanvasNode[], templateMap: Map<string, ContainerTemplate>): CanvasNode[] {
    return nodes.filter(node => this.isContainer(node, templateMap));
  }

  /**
   * Get direct children of a container
   */
  static getContainerChildren(containerId: string, nodes: CanvasNode[]): CanvasNode[] {
    return nodes.filter(node => node.parentId === containerId);
  }

  /**
   * Find container at a specific position, considering z-index and nesting
   */
  static findContainerAtPosition(
    x: number,
    y: number,
    nodes: CanvasNode[],
    templateMap: Map<string, ContainerTemplate>,
    excludedIds: string[] = []
  ): CanvasNode | null {
    // Find containers under the cursor, excluding selected nodes being dragged
    const containers = nodes.filter(node =>
      this.isContainer(node, templateMap) && !excludedIds.includes(node.id)
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
      const aIdx = nodes.indexOf(a);
      const bIdx = nodes.indexOf(b);
      return bIdx - aIdx;
    });

    // Return the topmost container
    return matchingContainers[0];
  }

  /**
   * Add nodes to a container, converting their positions to relative coordinates
   */
  static addToContainer(
    nodeIds: string[],
    containerId: string,
    nodes: CanvasNode[],
    templateMap: Map<string, ContainerTemplate>
  ): CanvasNode[] {
    if (!this.isContainerType(containerId) && !this.getAllContainers(nodes, templateMap).find(c => c.id === containerId)) {
      logger.warn(`Cannot add to container: ${containerId} is not a valid container`);
      return nodes;
    }

    const container = nodes.find(n => n.id === containerId);
    if (!container) {
      logger.warn(`Container ${containerId} not found`);
      return nodes;
    }

    // Check for circular dependencies
    for (const nodeId of nodeIds) {
      if (nodeId === containerId) {
        logger.warn(`Cannot add container ${containerId} to itself`);
        return nodes;
      }
      if (this.isAncestor(nodeId, containerId, nodes)) {
        logger.warn(`Cannot add ${nodeId} to ${containerId}: would create circular dependency`);
        return nodes;
      }
    }

    return nodes.map(node => {
      if (!nodeIds.includes(node.id)) return node;

      // Remove from old parent if any
      if (node.parentId) {
        this.removeFromParentChildren(node.id, node.parentId, nodes);
      }

      // Convert position to relative coordinates within container
      const relativePosition = {
        x: node.position.x - container.position.x,
        y: node.position.y - container.position.y
      };

      return {
        ...node,
        parentId: containerId,
        position: relativePosition
      };
    }).map(node => {
      // Update container's children array
      if (node.id === containerId) {
        const existingChildren = node.children || [];
        const newChildren = [...existingChildren, ...nodeIds.filter(id => !existingChildren.includes(id))];
        return {
          ...node,
          children: newChildren
        };
      }
      return node;
    });
  }

  /**
   * Remove nodes from their containers, converting back to absolute coordinates
   */
  static removeFromContainer(nodeIds: string[], nodes: CanvasNode[]): CanvasNode[] {
    return nodes.map(node => {
      if (!nodeIds.includes(node.id) || !node.parentId) return node;

      const parent = nodes.find(n => n.id === node.parentId);
      if (!parent) return node;

      // Convert position back to absolute coordinates
      const absolutePosition = {
        x: node.position.x + parent.position.x,
        y: node.position.y + parent.position.y
      };

      // Remove from parent's children array
      this.removeFromParentChildren(node.id, node.parentId, nodes);

      return {
        ...node,
        parentId: null,
        position: absolutePosition
      };
    });
  }

  /**
   * Remove a node from its parent's children array
   */
  private static removeFromParentChildren(nodeId: string, parentId: string, nodes: CanvasNode[]): void {
    // This modifies the nodes array in place for the parent
    const parentIndex = nodes.findIndex(n => n.id === parentId);
    if (parentIndex >= 0) {
      const parent = nodes[parentIndex];
      const children = parent.children || [];
      const updatedChildren = children.filter(id => id !== nodeId);
      nodes[parentIndex] = {
        ...parent,
        children: updatedChildren.length > 0 ? updatedChildren : undefined
      };
    }
  }

  /**
   * Check if potentialAncestorId is an ancestor of nodeId (prevents circular dependencies)
   */
  static isAncestor(potentialAncestorId: string, nodeId: string, nodes: CanvasNode[]): boolean {
    let current = nodes.find(n => n.id === nodeId);
    while (current && current.parentId) {
      if (current.parentId === potentialAncestorId) return true;
      current = nodes.find(n => n.id === current!.parentId);
    }
    return false;
  }

  /**
   * Clear all children from a container
   */
  static clearContainerChildren(containerId: string, nodes: CanvasNode[]): CanvasNode[] {
    const children = this.getContainerChildren(containerId, nodes);
    if (children.length > 0) {
      return this.removeFromContainer(children.map(c => c.id), nodes);
    }
    return nodes;
  }

  /**
   * Get absolute position of a node accounting for parent containers
   */
  static getAbsolutePosition(node: CanvasNode, nodes: CanvasNode[]): Vector2 {
    if (!node.parentId) {
      return { ...node.position };
    }

    const parent = nodes.find(n => n.id === node.parentId);
    if (!parent) {
      return { ...node.position };
    }

    const parentAbsPos = this.getAbsolutePosition(parent, nodes);
    return {
      x: parentAbsPos.x + node.position.x,
      y: parentAbsPos.y + node.position.y,
    };
  }

  /**
   * Group selected nodes into a new container
   */
  static groupSelectedNodes(
    selectedNodeIds: string[],
    nodes: CanvasNode[],
    templateMap: Map<string, ContainerTemplate>
  ): { nodes: CanvasNode[]; containerId: string } | null {
    if (selectedNodeIds.length < 2) {
      logger.warn('Need at least 2 nodes selected to group');
      return null;
    }

    const nodesToGroup = nodes.filter(node => selectedNodeIds.includes(node.id));

    // Calculate bounding box of selected nodes
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const node of nodesToGroup) {
      const absPos = this.getAbsolutePosition(node, nodes);
      minX = Math.min(minX, absPos.x);
      minY = Math.min(minY, absPos.y);
      maxX = Math.max(maxX, absPos.x + node.size.x);
      maxY = Math.max(maxY, absPos.y + node.size.y);
    }

    // Add padding around group
    const padding = 20;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;

    // Find container template
    const containerTemplate = Array.from(templateMap.values()).find(t => t.primitiveId === 'primitive.container');
    if (!containerTemplate) {
      logger.error('Container template not found');
      return null;
    }

    // Generate container ID
    const containerId = `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create container node
    const containerNode: CanvasNode = {
      id: containerId,
      componentId: containerTemplate.id,
      name: 'Group Container',
      position: { x: minX, y: minY },
      size: { x: maxX - minX, y: maxY - minY },
      props: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        cornerRadius: 8,
        padding: padding,
      },
      children: [],
      zIndex: Math.min(...nodesToGroup.map(n => n.zIndex ?? 0)) - 1, // Place container behind grouped nodes
    };

    // Add container to nodes
    const nodesWithContainer = [...nodes, containerNode];

    // Add selected nodes to container
    const finalNodes = this.addToContainer(selectedNodeIds, containerId, nodesWithContainer, templateMap);

    return { nodes: finalNodes, containerId };
  }

  /**
   * Ungroup a container - extract its children back to root level
   */
  static ungroupSelectedNode(
    containerId: string,
    nodes: CanvasNode[],
    templateMap: Map<string, ContainerTemplate>
  ): { nodes: CanvasNode[]; childIds: string[] } | null {
    const container = nodes.find(n => n.id === containerId);

    if (!container) {
      logger.warn('Container not found');
      return null;
    }

    if (!this.isContainer(container, templateMap)) {
      logger.warn('Selected node is not a container');
      return null;
    }

    const children = container.children || [];
    if (children.length === 0) {
      logger.warn('Container has no children to ungroup');
      return null;
    }

    // Remove children from container (converts to absolute positions)
    let updatedNodes = this.removeFromContainer(children, nodes);

    // Remove the container
    updatedNodes = updatedNodes.filter(n => n.id !== containerId);

    return { nodes: updatedNodes, childIds: children };
  }

  /**
   * Validate container operations
   */
  static validateContainerOperation(
    operation: 'add' | 'remove' | 'group' | 'ungroup',
    nodeIds: string[],
    containerId: string | null,
    nodes: CanvasNode[],
    templateMap: Map<string, ContainerTemplate>
  ): { valid: boolean; error?: string } {
    switch (operation) {
      case 'add':
        if (!containerId) return { valid: false, error: 'No container specified' };
        if (!this.getAllContainers(nodes, templateMap).find(c => c.id === containerId)) {
          return { valid: false, error: 'Invalid container' };
        }
        for (const nodeId of nodeIds) {
          if (this.isAncestor(nodeId, containerId, nodes)) {
            return { valid: false, error: 'Circular dependency would be created' };
          }
        }
        break;

      case 'group':
        if (nodeIds.length < 2) {
          return { valid: false, error: 'Need at least 2 nodes to group' };
        }
        break;

      case 'ungroup':
        if (!containerId) return { valid: false, error: 'No container specified' };
        const container = nodes.find(n => n.id === containerId);
        if (!container || !this.isContainer(container, templateMap)) {
          return { valid: false, error: 'Not a valid container' };
        }
        if (!container.children?.length) {
          return { valid: false, error: 'Container has no children' };
        }
        break;
    }

    return { valid: true };
  }
}