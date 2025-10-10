<script setup lang="ts">
import { computed, ref } from 'vue';
import type { CanvasNode } from '../types';

const props = defineProps<{
  nodes: CanvasNode[];
  selectedNodeIds: Set<string>;
}>();

const emit = defineEmits<{
  (event: 'select-node', nodeId: string, isMultiSelect: boolean): void;
  (event: 'toggle-visibility', payload: { nodeId: string }): void;
  (event: 'reorder', payload: { nodeId: string; newIndex: number; newParentId?: string | null }): void;
  (event: 'bring-to-front', nodeId: string): void;
  (event: 'send-to-back', nodeId: string): void;
}>();

// Track which nodes have their children expanded
const expandedNodes = ref<Set<string>>(new Set());

// Drag and drop state
const draggedNodeId = ref<string | null>(null);
const dropTargetId = ref<string | null>(null);
const dropPosition = ref<'before' | 'after' | 'inside' | null>(null);

// Build hierarchical tree structure
const nodeTree = computed(() => {
  const nodeMap = new Map<string, CanvasNode>();
  props.nodes.forEach(node => nodeMap.set(node.id, node));
  
  // Find root nodes (no parent)
  const rootNodes = props.nodes.filter(node => !node.parentId);
  
  // Sort by zIndex (lower first)
  return rootNodes.sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
});

// Get children of a node
function getChildren(nodeId: string): CanvasNode[] {
  const node = props.nodes.find(n => n.id === nodeId);
  if (!node?.children?.length) return [];
  
  return node.children
    .map(childId => props.nodes.find(n => n.id === childId))
    .filter((n): n is CanvasNode => n !== undefined)
    .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
}

// Check if node is expanded
function isExpanded(nodeId: string): boolean {
  return expandedNodes.value.has(nodeId);
}

// Toggle expansion
function toggleExpansion(nodeId: string) {
  if (expandedNodes.value.has(nodeId)) {
    expandedNodes.value.delete(nodeId);
  } else {
    expandedNodes.value.add(nodeId);
  }
}

// Check if node is selected
function isSelected(nodeId: string): boolean {
  return props.selectedNodeIds.has(nodeId);
}

// Check if node is visible (based on hidden property from node itself)
function isVisible(nodeId: string): boolean {
  const node = props.nodes.find(n => n.id === nodeId);
  return !node?.hidden;
}

// Toggle visibility
function handleVisibilityToggle(nodeId: string) {
  emit('toggle-visibility', { nodeId });
}

// Handle node selection
function handleNodeClick(nodeId: string, event: MouseEvent) {
  event.stopPropagation();
  const isMultiSelect = event.ctrlKey || event.metaKey || event.shiftKey;
  emit('select-node', nodeId, isMultiSelect);
}

// Drag and drop handlers
function handleDragStart(event: DragEvent, nodeId: string) {
  if (!event.dataTransfer) return;
  
  draggedNodeId.value = nodeId;
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', nodeId);
  
  // Add visual feedback
  const target = event.target as HTMLElement;
  target.style.opacity = '0.5';
}

function handleDragEnd(event: DragEvent) {
  const target = event.target as HTMLElement;
  target.style.opacity = '1';
  
  draggedNodeId.value = null;
  dropTargetId.value = null;
  dropPosition.value = null;
}

function handleDragOver(event: DragEvent, targetNodeId: string) {
  event.preventDefault();
  if (!event.dataTransfer || !draggedNodeId.value || draggedNodeId.value === targetNodeId) {
    return;
  }
  
  event.dataTransfer.dropEffect = 'move';
  
  // Determine drop position based on cursor position within element
  const target = event.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  const y = event.clientY - rect.top;
  const height = rect.height;
  
  const targetNode = props.nodes.find(n => n.id === targetNodeId);
  const isContainer = targetNode?.children !== undefined;
  
  if (isContainer && isExpanded(targetNodeId)) {
    // For expanded containers, allow dropping inside
    if (y < height * 0.25) {
      dropPosition.value = 'before';
    } else if (y > height * 0.75) {
      dropPosition.value = 'after';
    } else {
      dropPosition.value = 'inside';
    }
  } else {
    // For non-containers or collapsed containers, only before/after
    if (y < height * 0.5) {
      dropPosition.value = 'before';
    } else {
      dropPosition.value = 'after';
    }
  }
  
  dropTargetId.value = targetNodeId;
}

function handleDragLeave() {
  dropTargetId.value = null;
  dropPosition.value = null;
}

function handleDrop(event: DragEvent, targetNodeId: string) {
  event.preventDefault();
  if (!draggedNodeId.value || !dropPosition.value || draggedNodeId.value === targetNodeId) {
    return;
  }
  
  const draggedNode = props.nodes.find(n => n.id === draggedNodeId.value);
  const targetNode = props.nodes.find(n => n.id === targetNodeId);
  
  if (!draggedNode || !targetNode) return;
  
  // Prevent dropping a parent into its own descendant
  if (isDescendant(targetNodeId, draggedNodeId.value)) {
    return;
  }
  
  // Calculate new index and parent
  let newIndex = 0;
  let newParentId: string | null = null;
  
  if (dropPosition.value === 'inside') {
    // Drop as first child of target
    newParentId = targetNodeId;
    newIndex = 0;
  } else {
    // Drop before/after target (same parent as target)
    newParentId = targetNode.parentId ?? null;
    const siblings = newParentId 
      ? getChildren(newParentId)
      : nodeTree.value;
    
    const targetIndex = siblings.findIndex(n => n.id === targetNodeId);
    newIndex = dropPosition.value === 'before' ? targetIndex : targetIndex + 1;
  }
  
  emit('reorder', {
    nodeId: draggedNodeId.value,
    newIndex,
    newParentId,
  });
  
  // Reset drag state
  draggedNodeId.value = null;
  dropTargetId.value = null;
  dropPosition.value = null;
}

// Check if nodeId is a descendant of ancestorId
function isDescendant(nodeId: string, ancestorId: string): boolean {
  let current = props.nodes.find(n => n.id === nodeId);
  while (current?.parentId) {
    if (current.parentId === ancestorId) return true;
    current = props.nodes.find(n => n.id === current?.parentId);
  }
  return false;
}

// Get icon for component type
function getNodeIcon(node: CanvasNode): string {
  const type = node.componentId.toLowerCase();
  if (type.includes('text')) return '📝';
  if (type.includes('button')) return '🔘';
  if (type.includes('input')) return '📄';
  if (type.includes('toggle')) return '🔄';
  if (type.includes('rectangle')) return '▭';
  if (type.includes('circle')) return '⭕';
  if (type.includes('container')) return '📦';
  return '🔹';
}

// Check if node has children
function hasChildren(nodeId: string): boolean {
  const node = props.nodes.find(n => n.id === nodeId);
  return (node?.children?.length ?? 0) > 0;
}

// Get drop indicator class
function getDropIndicatorClass(nodeId: string): string {
  if (dropTargetId.value !== nodeId) return '';
  if (dropPosition.value === 'before') return 'layers-item--drop-before';
  if (dropPosition.value === 'after') return 'layers-item--drop-after';
  if (dropPosition.value === 'inside') return 'layers-item--drop-inside';
  return '';
}

// Expand all nodes
function expandAll() {
  props.nodes.forEach(node => {
    if (hasChildren(node.id)) {
      expandedNodes.value.add(node.id);
    }
  });
}

// Collapse all nodes
function collapseAll() {
  expandedNodes.value.clear();
}

// Show all nodes - emit toggle-visibility for all hidden nodes
function showAll() {
  const hiddenNodesList = props.nodes.filter(n => n.hidden);
  hiddenNodesList.forEach(node => {
    emit('toggle-visibility', { nodeId: node.id });
  });
}
</script>

<template>
  <aside class="layers-panel">
    <header class="layers-panel__header">
      <h2>Layers</h2>
      <div class="layers-panel__actions">
        <button 
          type="button" 
          class="layers-panel__action-btn"
          title="Expand All"
          @click="expandAll"
        >
          ▼
        </button>
        <button 
          type="button" 
          class="layers-panel__action-btn"
          title="Collapse All"
          @click="collapseAll"
        >
          ▶
        </button>
        <button 
          type="button" 
          class="layers-panel__action-btn"
          title="Show All"
          @click="showAll"
        >
          👁
        </button>
      </div>
    </header>

    <div class="layers-panel__list">
      <div v-if="nodes.length === 0" class="layers-panel__empty">
        <span class="layers-panel__empty-icon">📋</span>
        <p>No components yet</p>
        <small>Add components from the palette</small>
      </div>

      <!-- Recursive component for rendering tree -->
      <template v-for="node in nodeTree" :key="node.id">
        <div
          class="layers-item"
          :class="{
            'layers-item--selected': isSelected(node.id),
            'layers-item--hidden': !isVisible(node.id),
            'layers-item--locked': node.locked,
            'layers-item--dragging': draggedNodeId === node.id,
            [getDropIndicatorClass(node.id)]: true,
          }"
          draggable="true"
          @click="handleNodeClick(node.id, $event)"
          @dragstart="handleDragStart($event, node.id)"
          @dragend="handleDragEnd"
          @dragover="handleDragOver($event, node.id)"
          @dragleave="handleDragLeave"
          @drop="handleDrop($event, node.id)"
        >
          <div class="layers-item__content">
            <button
              v-if="hasChildren(node.id)"
              type="button"
              class="layers-item__expand"
              @click.stop="toggleExpansion(node.id)"
            >
              {{ isExpanded(node.id) ? '▼' : '▶' }}
            </button>
            <span v-else class="layers-item__expand layers-item__expand--spacer"></span>
            
            <span class="layers-item__icon">{{ getNodeIcon(node) }}</span>
            
            <span class="layers-item__name">
              {{ node.name }}
              <span v-if="node.locked" class="layers-item__lock-badge">🔒</span>
            </span>
            
            <button
              type="button"
              class="layers-item__visibility"
              :class="{ 'layers-item__visibility--hidden': !isVisible(node.id) }"
              @click.stop="handleVisibilityToggle(node.id)"
            >
              {{ isVisible(node.id) ? '👁' : '👁‍🗨' }}
            </button>
          </div>
        </div>

        <!-- Render children recursively if expanded -->
        <template v-if="isExpanded(node.id) && hasChildren(node.id)">
          <div class="layers-item__children">
            <template v-for="child in getChildren(node.id)" :key="child.id">
              <div
                class="layers-item layers-item--nested"
                :class="{
                  'layers-item--selected': isSelected(child.id),
                  'layers-item--hidden': !isVisible(child.id),
                  'layers-item--locked': child.locked,
                  'layers-item--dragging': draggedNodeId === child.id,
                  [getDropIndicatorClass(child.id)]: true,
                }"
                draggable="true"
                @click="handleNodeClick(child.id, $event)"
                @dragstart="handleDragStart($event, child.id)"
                @dragend="handleDragEnd"
                @dragover="handleDragOver($event, child.id)"
                @dragleave="handleDragLeave"
                @drop="handleDrop($event, child.id)"
              >
                <div class="layers-item__content">
                  <button
                    v-if="hasChildren(child.id)"
                    type="button"
                    class="layers-item__expand"
                    @click.stop="toggleExpansion(child.id)"
                  >
                    {{ isExpanded(child.id) ? '▼' : '▶' }}
                  </button>
                  <span v-else class="layers-item__expand layers-item__expand--spacer"></span>
                  
                  <span class="layers-item__icon">{{ getNodeIcon(child) }}</span>
                  
                  <span class="layers-item__name">
                    {{ child.name }}
                    <span v-if="child.locked" class="layers-item__lock-badge">🔒</span>
                  </span>
                  
                  <button
                    type="button"
                    class="layers-item__visibility"
                    :class="{ 'layers-item__visibility--hidden': !isVisible(child.id) }"
                    @click.stop="handleVisibilityToggle(child.id)"
                  >
                    {{ isVisible(child.id) ? '👁' : '👁‍🗨' }}
                  </button>
                </div>
              </div>

              <!-- Recursively render grandchildren -->
              <template v-if="isExpanded(child.id) && hasChildren(child.id)">
                <div class="layers-item__children layers-item__children--level-2">
                  <template v-for="grandchild in getChildren(child.id)" :key="grandchild.id">
                    <div
                      class="layers-item layers-item--nested-2"
                      :class="{
                        'layers-item--selected': isSelected(grandchild.id),
                        'layers-item--hidden': !isVisible(grandchild.id),
                        'layers-item--locked': grandchild.locked,
                        'layers-item--dragging': draggedNodeId === grandchild.id,
                        [getDropIndicatorClass(grandchild.id)]: true,
                      }"
                      draggable="true"
                      @click="handleNodeClick(grandchild.id, $event)"
                      @dragstart="handleDragStart($event, grandchild.id)"
                      @dragend="handleDragEnd"
                      @dragover="handleDragOver($event, grandchild.id)"
                      @dragleave="handleDragLeave"
                      @drop="handleDrop($event, grandchild.id)"
                    >
                      <div class="layers-item__content">
                        <span class="layers-item__expand layers-item__expand--spacer"></span>
                        <span class="layers-item__icon">{{ getNodeIcon(grandchild) }}</span>
                        
                        <span class="layers-item__name">
                          {{ grandchild.name }}
                          <span v-if="grandchild.locked" class="layers-item__lock-badge">🔒</span>
                        </span>
                        
                        <button
                          type="button"
                          class="layers-item__visibility"
                          :class="{ 'layers-item__visibility--hidden': !isVisible(grandchild.id) }"
                          @click.stop="handleVisibilityToggle(grandchild.id)"
                        >
                          {{ isVisible(grandchild.id) ? '👁' : '👁‍🗨' }}
                        </button>
                      </div>
                    </div>
                  </template>
                </div>
              </template>
            </template>
          </div>
        </template>
      </template>
    </div>
  </aside>
</template>

<style scoped>
.layers-panel {
  display: flex;
  flex-direction: column;
  background: rgba(4, 12, 18, 0.72);
  border-left: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(18px);
  min-width: 260px;
  max-width: 360px;
  height: 100%;
}

.layers-panel__header {
  padding: 14px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.layers-panel__header h2 {
  margin: 0;
  font-size: 15px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.layers-panel__actions {
  display: flex;
  gap: 4px;
}

.layers-panel__action-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: inherit;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.layers-panel__action-btn:hover {
  background: rgba(0, 255, 194, 0.12);
  border-color: rgba(0, 255, 194, 0.3);
}

.layers-panel__list {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px 0;
}

.layers-panel__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
  opacity: 0.6;
}

.layers-panel__empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.layers-panel__empty p {
  margin: 0 0 4px 0;
  font-size: 14px;
  font-weight: 500;
}

.layers-panel__empty small {
  font-size: 12px;
  opacity: 0.7;
}

.layers-item {
  position: relative;
  cursor: pointer;
  user-select: none;
  transition: background 0.15s ease;
}

.layers-item--nested {
  padding-left: 24px;
}

.layers-item--nested-2 {
  padding-left: 48px;
}

.layers-item__content {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  min-height: 40px;
}

.layers-item:hover .layers-item__content {
  background: rgba(0, 255, 194, 0.08);
}

.layers-item--selected .layers-item__content {
  background: rgba(0, 255, 194, 0.16);
  border-left: 3px solid rgba(0, 255, 194, 0.8);
  padding-left: 9px;
}

.layers-item--hidden {
  opacity: 0.4;
}

.layers-item--locked .layers-item__content {
  background: rgba(255, 150, 0, 0.08);
}

.layers-item--dragging {
  opacity: 0.5;
}

.layers-item--drop-before::before,
.layers-item--drop-after::after,
.layers-item--drop-inside .layers-item__content {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background: rgba(0, 255, 194, 0.8);
  z-index: 10;
}

.layers-item--drop-before::before {
  top: 0;
}

.layers-item--drop-after::after {
  bottom: 0;
}

.layers-item--drop-inside .layers-item__content {
  outline: 2px solid rgba(0, 255, 194, 0.6);
  outline-offset: -2px;
  background: rgba(0, 255, 194, 0.12);
}

.layers-item__expand {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: inherit;
  font-size: 10px;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.15s ease;
  flex-shrink: 0;
}

.layers-item__expand:hover {
  background: rgba(255, 255, 255, 0.1);
}

.layers-item__expand--spacer {
  cursor: default;
}

.layers-item__icon {
  font-size: 16px;
  flex-shrink: 0;
}

.layers-item__name {
  flex: 1;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;
  gap: 6px;
}

.layers-item__lock-badge {
  font-size: 10px;
  opacity: 0.7;
}

.layers-item__visibility {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: inherit;
  font-size: 14px;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.15s ease;
  flex-shrink: 0;
  opacity: 0.6;
}

.layers-item__visibility:hover {
  background: rgba(255, 255, 255, 0.1);
  opacity: 1;
}

.layers-item__visibility--hidden {
  opacity: 0.3;
}

.layers-item__children {
  position: relative;
}

.layers-item__children::before {
  content: '';
  position: absolute;
  left: 28px;
  top: 0;
  bottom: 0;
  width: 1px;
  background: rgba(255, 255, 255, 0.1);
}

.layers-item__children--level-2::before {
  left: 52px;
}

/* Custom scrollbar styling */
.layers-panel__list::-webkit-scrollbar {
  width: 8px;
}

.layers-panel__list::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
}

.layers-panel__list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
}

.layers-panel__list::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>
