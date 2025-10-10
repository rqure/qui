<script setup lang="ts">
import { computed, reactive, ref, onMounted, onBeforeUnmount } from 'vue';
import BuilderCanvas from './components/BuilderCanvas.vue';
import ComponentPalette from './components/ComponentPalette.vue';
import InspectorPanel from './components/InspectorPanel.vue';
import BuilderToolbar from './components/BuilderToolbar.vue';
import FaceplateSelector from './components/FaceplateSelector.vue';
import LayersPanel from './components/LayersPanel.vue';
import { useDataStore } from '@/stores/data';
import { FaceplateDataService } from './utils/faceplate-data';
import {
  DEFAULT_VIEWPORT_WIDTH,
  DEFAULT_VIEWPORT_HEIGHT,
  MIN_VIEWPORT_WIDTH,
  MIN_VIEWPORT_HEIGHT,
} from './constants';
import { logger } from './utils/logger';
import { PRIMITIVE_REGISTRY } from './utils/primitive-registry';
import type { FaceplateNotificationChannel, FaceplateScriptModule } from './utils/faceplate-data';
import type { EntityId } from '@/core/data/types';
import type {
  Binding,
  BindingMode,
  CanvasNode,
  PaletteTemplate,
  PrimitiveDefinition,
  PrimitivePropertyDefinition,
  Vector2,
  EventHandler,
} from './types';

type InspectorBindingPayload = {
  nodeId: string;
  property: string;
  mode: BindingMode;
  expression: string;
  transform: string | null;
  dependencies: string[];
  description?: string;
};

// Props for optional pre-loaded faceplate
const props = defineProps<{
  faceplateId?: EntityId | null;
  entityId?: EntityId | null;
}>();

const dataStore = useDataStore();
const faceplateService = new FaceplateDataService(dataStore);

const DEFAULT_VIEWPORT: Vector2 = { x: DEFAULT_VIEWPORT_WIDTH, y: DEFAULT_VIEWPORT_HEIGHT };

const primitiveMap = Object.fromEntries(
  PRIMITIVE_REGISTRY.map((primitive) => [primitive.id, primitive]),
) as Record<string, PrimitiveDefinition>;

function cloneSchema(schema: PrimitivePropertyDefinition[]): PrimitivePropertyDefinition[] {
  return schema.map((field) => ({
    ...field,
    options: field.options ? field.options.map((option) => ({ ...option })) : undefined,
  }));
}

function buildTemplate(options: {
  id: string;
  primitiveId: string;
  label: string;
  description: string;
  icon: string;
  props?: Record<string, unknown>;
  size?: Vector2;
  source: 'built-in' | 'custom';
}): PaletteTemplate {
  const primitive = primitiveMap[options.primitiveId];
  if (!primitive) {
    throw new Error(`Unknown primitive: ${options.primitiveId}`);
  }

  return {
    id: options.id,
    label: options.label,
    description: options.description,
    icon: options.icon,
    primitiveId: primitive.id,
    defaults: {
      size: {
        x: options.size?.x ?? primitive.defaultSize.x,
        y: options.size?.y ?? primitive.defaultSize.y,
      },
      props: {
        ...primitive.defaultProps,
        ...(options.props ?? {}),
      },
    },
    propertySchema: cloneSchema(primitive.propertySchema),
    previewProps: primitive.previewProps,
    source: options.source,
  };
}

const componentLibrary = ref<PaletteTemplate[]>(
  PRIMITIVE_REGISTRY.map((primitive) =>
    buildTemplate({
      id: primitive.id,
      primitiveId: primitive.id,
      label: primitive.label,
      description: primitive.description,
      icon: primitive.icon,
      props: primitive.defaultProps,
      size: primitive.defaultSize,
      source: 'built-in',
    }),
  ),
);

const templateMap = computed(() => {
  const map: Record<string, PaletteTemplate> = {};
  for (const template of componentLibrary.value) {
    map[template.id] = template;
  }
  return map;
});

const paletteItems = computed(() =>
  componentLibrary.value.map((template) => {
    const primitive = primitiveMap[template.primitiveId];
    const detail = primitive ? `${template.description} · ${primitive.label}` : template.description;
    return {
      id: template.id,
      label: template.label,
      description: detail,
      icon: template.icon,
      badge: template.source === 'custom' ? 'Custom' : undefined,
    };
  }),
);

const nodes = ref<CanvasNode[]>([]);
const bindings = ref<Binding[]>([]);
const selectedNodeId = ref<string | null>(null);
const selectedNodeIds = ref<Set<string>>(new Set()); // Multi-selection support
const currentFaceplateId = ref<EntityId | null>(props.faceplateId ?? null);
const currentFaceplateName = ref<string>('');
const currentTargetEntityType = ref<string>('');
const isSaving = ref(false);
const viewportSize = ref<Vector2>({ ...DEFAULT_VIEWPORT });
const faceplateMetadata = ref<Record<string, unknown>>({});
const showFaceplateSelector = ref(false);
const selectorStartInNewMode = ref(false);
const currentScriptModules = ref<FaceplateScriptModule[]>([]);
const currentNotificationChannels = ref<FaceplateNotificationChannel[]>([]);

const history = reactive<{
  stack: Array<{ nodes: CanvasNode[]; bindings: Binding[]; viewport: Vector2; metadata: Record<string, unknown> }>;
  index: number;
}>({
  stack: [],
  index: -1,
});
const savedIndex = ref(-1);

const selectedNode = computed(() => nodes.value.find((node) => node.id === selectedNodeId.value) ?? null);
const selectedTemplate = computed(() =>
  selectedNode.value ? templateMap.value[selectedNode.value.componentId] ?? null : null,
);
const selectedNodes = computed(() => nodes.value.filter((node) => selectedNodeIds.value.has(node.id)));
const selectedNodeBindings = computed(() =>
  selectedNodeId.value
    ? bindings.value.filter((binding) => binding.componentId === selectedNodeId.value)
    : [],
);
const hasMultipleSelected = computed(() => selectedNodeIds.value.size > 1);
const canUndo = computed(() => history.index > 0);
const canRedo = computed(() => history.index < history.stack.length - 1);
const dirty = computed(() => history.index !== savedIndex.value);
const hasFaceplateSelected = computed(() => currentFaceplateId.value !== null);

function generateId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

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

  const first = next.values().next().value ?? null;
  selectedNodeId.value = first ?? null;
}

function getComponentName(componentId: string): string {
  return nodes.value.find((node) => node.id === componentId)?.name ?? componentId;
}

function cloneState(): { nodes: CanvasNode[]; bindings: Binding[]; viewport: Vector2; metadata: Record<string, unknown> } {
  return {
    nodes: nodes.value.map((node) => ({
      ...node,
      position: { ...node.position },
      size: { ...node.size },
      props: { ...node.props },
      parentId: node.parentId || null,
      children: node.children ? [...node.children] : undefined,
      zIndex: node.zIndex,
    })),
    bindings: bindings.value.map((binding) => ({ ...binding })),
    viewport: { ...viewportSize.value },
    metadata: { ...faceplateMetadata.value },
  };
}

function normalizeViewport(value: unknown): Vector2 | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const widthRaw = candidate.width ?? candidate.x;
  const heightRaw = candidate.height ?? candidate.y;
  const width = Number(widthRaw);
  const height = Number(heightRaw);

  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    return null;
  }

  return {
    x: Math.max(MIN_VIEWPORT_WIDTH, Math.round(width)),
    y: Math.max(MIN_VIEWPORT_HEIGHT, Math.round(height)),
  };
}

function applyViewportMetadata(metadata: Record<string, unknown> | undefined) {
  const viewport = metadata ? normalizeViewport((metadata as Record<string, unknown>).viewport) : null;
  faceplateMetadata.value = metadata
    ? {
        ...metadata,
        ...(viewport
          ? {
              viewport: {
                width: viewport.x,
                height: viewport.y,
              },
            }
          : {}),
      }
    : {};
  viewportSize.value = viewport ?? { ...DEFAULT_VIEWPORT };
}

function pushHistory() {
  history.stack.splice(history.index + 1);
  history.stack.push(cloneState());
  history.index = history.stack.length - 1;
  // Schedule auto-save after change
  scheduleAutoSave();
}

function applyState(snapshot: {
  nodes: CanvasNode[];
  bindings: Binding[];
  viewport: Vector2;
  metadata: Record<string, unknown>;
}) {
  nodes.value = snapshot.nodes.map((node) => ({
    ...node,
    position: { ...node.position },
    size: { ...node.size },
    props: { ...node.props },
    parentId: node.parentId || null,
    children: node.children ? [...node.children] : undefined,
    zIndex: node.zIndex,
  }));
  bindings.value = snapshot.bindings.map((binding) => ({ ...binding }));
  viewportSize.value = snapshot.viewport ? { ...snapshot.viewport } : { ...DEFAULT_VIEWPORT };
  faceplateMetadata.value = snapshot.metadata ? { ...snapshot.metadata } : {};
  if (selectedNodeId.value && !nodes.value.some((node) => node.id === selectedNodeId.value)) {
    selectedNodeId.value = null;
  }
}

async function handleNodeRequest(payload: { componentId: string; position: Vector2 }) {
  const template = templateMap.value[payload.componentId];
  if (!template) return;

  const nodeId = generateId('node');
  const defaultProps = { ...template.defaults.props };
  if ('label' in defaultProps && typeof defaultProps.label === 'string') {
    defaultProps.label = defaultProps.label || template.label;
  }

  nodes.value = [
    ...nodes.value,
    {
      id: nodeId,
      componentId: template.id,
      name: template.label,
      position: { ...payload.position },
      size: { ...template.defaults.size },
      props: defaultProps,
    },
  ];
  applySelection([nodeId], nodeId);
  pushHistory();
}

function applyNodePositionUpdates(updates: Array<{ nodeId: string; position: Vector2 }>) {
  if (!updates.length) {
    return;
  }

  const positionMap = new Map<string, Vector2>();
  updates.forEach((update) => {
    positionMap.set(update.nodeId, { ...update.position });
  });

  nodes.value = nodes.value.map((node) => {
    const nextPosition = positionMap.get(node.id);
    if (!nextPosition) {
      return node;
    }
    return {
      ...node,
      position: {
        x: nextPosition.x,
        y: nextPosition.y,
      },
    };
  });
}

function handleNodesUpdated(updates: Array<{ nodeId: string; position: Vector2 }>) {
  applyNodePositionUpdates(updates);
}

function handleNodesMoveEnd(updates: Array<{ nodeId: string; position: Vector2 }>) {
  if (!updates.length) {
    return;
  }
  applyNodePositionUpdates(updates);
  pushHistory();
}

function handleNodeResized(payload: { nodeId: string; size: Vector2 }) {
  nodes.value = nodes.value.map((node) =>
    node.id === payload.nodeId
      ? { ...node, size: { ...payload.size } }
      : node,
  );
}

function handleNodeResizeEnd(payload: { nodeId: string; size: Vector2 }) {
  handleNodeResized(payload);
  pushHistory();
}

function handleNodeSelected(payload: { nodeId: string; isMultiSelect: boolean }) {
  const current = selectedNodeIds.value;
  const next = new Set(current);

  if (payload.isMultiSelect) {
    if (next.has(payload.nodeId)) {
      next.delete(payload.nodeId);
    } else {
      next.add(payload.nodeId);
    }
    if (!next.size) {
      applySelection([payload.nodeId], payload.nodeId);
      return;
    }
    applySelection(next, payload.nodeId);
    return;
  }

  applySelection([payload.nodeId], payload.nodeId);
}

function handleCanvasClick() {
  // Clear all selections when clicking on empty canvas
  applySelection([], null);
}

function handleDragSelectComplete(selectedIds: string[]) {
  // Replace current selection with drag-selected nodes
  applySelection(selectedIds, selectedIds[0] ?? null);
}

function handleResize(payload: { nodeId: string; size: Vector2 }) {
  nodes.value = nodes.value.map((node) =>
    node.id === payload.nodeId
      ? {
          ...node,
          size: {
            x: Math.max(80, payload.size.x),
            y: Math.max(80, payload.size.y),
          },
        }
      : node,
  );
  pushHistory();
}

function handleViewportUpdate(payload: { width: number; height: number }) {
  const width = Math.max(320, Math.round(payload.width));
  const height = Math.max(240, Math.round(payload.height));

  if (viewportSize.value.x === width && viewportSize.value.y === height) {
    return;
  }

  viewportSize.value = { x: width, y: height };
  faceplateMetadata.value = {
    ...faceplateMetadata.value,
    viewport: { width, height },
  };
  pushHistory();
}

function handleViewportInput(axis: 'x' | 'y', event: Event) {
  const value = Number((event.target as HTMLInputElement | null)?.value ?? 0);
  if (!Number.isFinite(value)) {
    return;
  }
  const width = axis === 'x' ? value : viewportSize.value.x;
  const height = axis === 'y' ? value : viewportSize.value.y;
  handleViewportUpdate({ width, height });
}

function resetViewportDimensions() {
  handleViewportUpdate({ width: DEFAULT_VIEWPORT.x, height: DEFAULT_VIEWPORT.y });
}

function handlePropUpdated(payload: { nodeId: string; key: string; value: unknown }) {
  nodes.value = nodes.value.map((node) =>
    node.id === payload.nodeId
      ? {
          ...node,
          props: {
            ...node.props,
            [payload.key]: payload.value,
          },
        }
      : node,
  );
  pushHistory();
}

function deleteNodesByIds(ids: string[]) {
  if (!ids.length) {
    return;
  }

  const idSet = new Set(ids);
  
  // Also delete all descendants
  const getAllDescendants = (nodeId: string): string[] => {
    const children = getContainerChildren(nodeId);
    const descendants: string[] = [];
    for (const child of children) {
      descendants.push(child.id);
      descendants.push(...getAllDescendants(child.id));
    }
    return descendants;
  };
  
  // Collect all nodes to delete (original + descendants)
  const allIdsToDelete = new Set(ids);
  for (const id of ids) {
    getAllDescendants(id).forEach(descId => allIdsToDelete.add(descId));
  }
  
  // Remove from parent containers
  for (const id of allIdsToDelete) {
    const node = nodes.value.find(n => n.id === id);
    if (node && node.parentId) {
      removeFromParentChildren(id, node.parentId);
    }
  }
  
  const beforeNodeCount = nodes.value.length;
  nodes.value = nodes.value.filter((node) => !allIdsToDelete.has(node.id));

  const beforeBindingCount = bindings.value.length;
  bindings.value = bindings.value.filter((binding) => !allIdsToDelete.has(binding.componentId));

  const nextSelection = new Set(selectedNodeIds.value);
  allIdsToDelete.forEach((id) => nextSelection.delete(id));
  applySelection(nextSelection, selectedNodeId.value);

  if (beforeNodeCount !== nodes.value.length || beforeBindingCount !== bindings.value.length) {
    pushHistory();
  }
}

function handleDeleteSelectedNodes() {
  if (!selectedNodeIds.value.size) {
    return;
  }
  deleteNodesByIds(Array.from(selectedNodeIds.value.values()));
}

function handleInspectorBindingCreate(payload: InspectorBindingPayload) {
  const node = nodes.value.find((item) => item.id === payload.nodeId);
  if (!node) return;

  const existing = bindings.value.find(
    (binding) => binding.componentId === payload.nodeId && binding.property === payload.property,
  );
  if (existing) {
    handleInspectorBindingUpdate(payload);
    return;
  }

  const dependencies = payload.dependencies.filter(Boolean);
  const description = payload.description?.trim() ? payload.description.trim() : undefined;
  const transform = payload.transform ?? null;

  const binding: Binding = {
    id: generateId('binding'),
    componentId: payload.nodeId,
    componentName: node.name,
    property: payload.property,
    expression: payload.expression,
    mode: payload.mode ?? 'field',
    transform,
    dependencies: dependencies.length ? dependencies : undefined,
    description,
  };

  bindings.value = [...bindings.value, binding];
  pushHistory();
}

function handleInspectorBindingUpdate(payload: InspectorBindingPayload) {
  const dependencies = payload.dependencies.filter(Boolean);
  const normalizedDependencies = dependencies.length ? dependencies : undefined;
  const normalizedDescription = payload.description?.trim() ? payload.description.trim() : undefined;
  const transform = payload.transform ?? null;
  const componentName = getComponentName(payload.nodeId);

  let updated = false;
  bindings.value = bindings.value.map((binding) => {
    if (binding.componentId !== payload.nodeId || binding.property !== payload.property) {
      return binding;
    }

    const mode = payload.mode ?? 'field';
    const next: Binding = {
      ...binding,
      componentName,
      mode,
      expression: payload.expression,
      transform,
      dependencies: normalizedDependencies,
      description: normalizedDescription,
    };

    if (
      (binding.mode ?? 'field') !== (next.mode ?? 'field') ||
      binding.expression !== next.expression ||
      (binding.transform ?? null) !== (next.transform ?? null) ||
      JSON.stringify(binding.dependencies ?? []) !== JSON.stringify(next.dependencies ?? []) ||
      binding.description !== next.description ||
      binding.componentName !== next.componentName
    ) {
      updated = true;
    }

    return next;
  });

  if (updated) {
    pushHistory();
  }
}

function handleInspectorBindingRemove(payload: { nodeId: string; property: string }) {
  const before = bindings.value.length;
  bindings.value = bindings.value.filter(
    (binding) => !(binding.componentId === payload.nodeId && binding.property === payload.property),
  );
  if (bindings.value.length !== before) {
    pushHistory();
  }
}

// Event Handler Management
function handleEventHandlerCreate(payload: { nodeId: string; handler: EventHandler }) {
  const node = nodes.value.find((item) => item.id === payload.nodeId);
  if (!node) return;

  const eventHandlers = node.eventHandlers || [];
  const updatedHandlers = [...eventHandlers, payload.handler];

  nodes.value = nodes.value.map((n) =>
    n.id === payload.nodeId ? { ...n, eventHandlers: updatedHandlers } : n
  );
  pushHistory();
}

function handleEventHandlerUpdate(payload: { nodeId: string; handler: EventHandler }) {
  const node = nodes.value.find((item) => item.id === payload.nodeId);
  if (!node || !node.eventHandlers) return;

  const updatedHandlers = node.eventHandlers.map((h) =>
    h.id === payload.handler.id ? payload.handler : h
  );

  nodes.value = nodes.value.map((n) =>
    n.id === payload.nodeId ? { ...n, eventHandlers: updatedHandlers } : n
  );
  pushHistory();
}

function handleEventHandlerRemove(payload: { nodeId: string; handlerId: string }) {
  const node = nodes.value.find((item) => item.id === payload.nodeId);
  if (!node || !node.eventHandlers) return;

  const updatedHandlers = node.eventHandlers.filter((h) => h.id !== payload.handlerId);

  nodes.value = nodes.value.map((n) =>
    n.id === payload.nodeId
      ? { ...n, eventHandlers: updatedHandlers.length > 0 ? updatedHandlers : undefined }
      : n
  );
  pushHistory();
}

function handleInspectorNodeDelete(payload: { nodeId: string }) {
  deleteNodesByIds([payload.nodeId]);
}

function handleBringForward(payload: { nodeId: string }) {
  const index = nodes.value.findIndex((node) => node.id === payload.nodeId);
  if (index < 0 || index >= nodes.value.length - 1) return;
  
  const updated = [...nodes.value];
  const [node] = updated.splice(index, 1);
  updated.splice(index + 1, 0, node);
  nodes.value = updated;
  pushHistory();
}

function handleSendBackward(payload: { nodeId: string }) {
  const index = nodes.value.findIndex((node) => node.id === payload.nodeId);
  if (index <= 0) return;
  
  const updated = [...nodes.value];
  const [node] = updated.splice(index, 1);
  updated.splice(index - 1, 0, node);
  nodes.value = updated;
  pushHistory();
}

function handleToggleLock(payload: { nodeId: string }) {
  const node = nodes.value.find(n => n.id === payload.nodeId);
  if (!node) return;
  
  nodes.value = nodes.value.map(n => 
    n.id === payload.nodeId ? { ...n, locked: !n.locked } : n
  );
  pushHistory();
}

function handleToggleVisibility(payload: { nodeId: string }) {
  const node = nodes.value.find(n => n.id === payload.nodeId);
  if (!node) return;
  
  nodes.value = nodes.value.map(n => 
    n.id === payload.nodeId ? { ...n, hidden: !n.hidden } : n
  );
  pushHistory();
  logger.info(`Toggled visibility for node ${payload.nodeId}: ${node.hidden ? 'shown' : 'hidden'}`);
}

// Context menu action handler
function handleContextMenuAction(payload: { action: string; nodeId?: string }) {
  switch (payload.action) {
    case 'duplicate':
      if (payload.nodeId) {
        // Select the node first if not selected
        if (!selectedNodeIds.value.has(payload.nodeId)) {
          applySelection([payload.nodeId], payload.nodeId);
        }
        duplicateSelectedNodes();
      }
      break;
    case 'copy':
      if (payload.nodeId) {
        // Select the node first if not selected
        if (!selectedNodeIds.value.has(payload.nodeId)) {
          applySelection([payload.nodeId], payload.nodeId);
        }
        copySelectedNodes();
      }
      break;
    case 'paste':
      pasteNodes();
      break;
    case 'delete':
      if (payload.nodeId) {
        handleInspectorNodeDelete({ nodeId: payload.nodeId });
      }
      break;
    case 'toggle-lock':
      if (payload.nodeId) {
        handleToggleLock({ nodeId: payload.nodeId });
      }
      break;
    case 'toggle-visibility':
      if (payload.nodeId) {
        handleToggleVisibility({ nodeId: payload.nodeId });
      }
      break;
    case 'bring-forward':
      if (payload.nodeId) {
        handleBringForward({ nodeId: payload.nodeId });
      }
      break;
    case 'send-backward':
      if (payload.nodeId) {
        handleSendBackward({ nodeId: payload.nodeId });
      }
      break;
  }
}

// Layer management functions
function handleLayerReorder(payload: { nodeId: string; newIndex: number; newParentId?: string | null }) {
  const node = nodes.value.find(n => n.id === payload.nodeId);
  if (!node) return;
  
  // Remove from old parent
  if (node.parentId) {
    removeFromParentChildren(payload.nodeId, node.parentId);
  }
  
  // Update node's parent
  const updatedNode = {
    ...node,
    parentId: payload.newParentId ?? null,
  };
  
  // If adding to a new parent, update parent's children array
  if (payload.newParentId) {
    const parent = nodes.value.find(n => n.id === payload.newParentId);
    if (parent) {
      const children = parent.children ?? [];
      const newChildren = [...children];
      newChildren.splice(payload.newIndex, 0, payload.nodeId);
      
      nodes.value = nodes.value.map(n => {
        if (n.id === payload.newParentId) {
          return { ...n, children: newChildren };
        }
        if (n.id === payload.nodeId) {
          return updatedNode;
        }
        return n;
      });
    }
  } else {
    // Moving to root level - update the node in the array
    nodes.value = nodes.value.map(n => 
      n.id === payload.nodeId ? updatedNode : n
    );
    
    // Reorder in the nodes array
    const currentIndex = nodes.value.findIndex(n => n.id === payload.nodeId);
    if (currentIndex !== -1) {
      const updated = [...nodes.value];
      const [movedNode] = updated.splice(currentIndex, 1);
      updated.splice(payload.newIndex, 0, movedNode);
      nodes.value = updated;
    }
  }
  
  pushHistory();
}

function handleLayerVisibilityToggle(payload: { nodeId: string }) {
  handleToggleVisibility(payload);
}

// Container management functions
function isContainer(nodeId: string): boolean {
  const node = nodes.value.find(n => n.id === nodeId);
  if (!node) return false;
  const template = templateMap.value[node.componentId];
  if (!template) return false;
  return template.primitiveId === 'primitive.container' || template.primitiveId === 'primitive.container.tabs';
}

function getContainerChildren(containerId: string): CanvasNode[] {
  return nodes.value.filter(node => node.parentId === containerId);
}

function getAllContainers(): CanvasNode[] {
  return nodes.value.filter(node => isContainer(node.id));
}

function addToContainer(nodeIds: string[], containerId: string) {
  if (!isContainer(containerId)) return;
  
  const container = nodes.value.find(n => n.id === containerId);
  if (!container) return;
  
  // Don't allow adding a container to itself or creating circular dependencies
  for (const nodeId of nodeIds) {
    if (nodeId === containerId) return;
    if (isAncestor(nodeId, containerId)) return;
  }
  
  nodes.value = nodes.value.map(node => {
    if (!nodeIds.includes(node.id)) return node;
    
    // Remove from old parent if any
    if (node.parentId) {
      removeFromParentChildren(node.id, node.parentId);
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
  });
  
  // Update container's children array
  const existingChildren = container.children || [];
  const newChildren = [...existingChildren, ...nodeIds.filter(id => !existingChildren.includes(id))];
  nodes.value = nodes.value.map(node => 
    node.id === containerId ? { ...node, children: newChildren } : node
  );
  
  pushHistory();
}

function removeFromContainer(nodeIds: string[]) {
  nodes.value = nodes.value.map(node => {
    if (!nodeIds.includes(node.id) || !node.parentId) return node;
    
    const parent = nodes.value.find(n => n.id === node.parentId);
    if (!parent) return node;
    
    // Convert position back to absolute coordinates
    const absolutePosition = {
      x: node.position.x + parent.position.x,
      y: node.position.y + parent.position.y
    };
    
    // Remove from parent's children array
    removeFromParentChildren(node.id, node.parentId);
    
    return {
      ...node,
      parentId: null,
      position: absolutePosition
    };
  });
  
  pushHistory();
}

function removeFromParentChildren(nodeId: string, parentId: string) {
  nodes.value = nodes.value.map(node => {
    if (node.id !== parentId) return node;
    const children = node.children || [];
    return {
      ...node,
      children: children.filter(id => id !== nodeId)
    };
  });
}

function isAncestor(potentialAncestorId: string, nodeId: string): boolean {
  let current = nodes.value.find(n => n.id === nodeId);
  while (current && current.parentId) {
    if (current.parentId === potentialAncestorId) return true;
    current = nodes.value.find(n => n.id === current!.parentId);
  }
  return false;
}

function clearContainerChildren(containerId: string) {
  if (!isContainer(containerId)) return;
  const children = getContainerChildren(containerId);
  if (children.length > 0) {
    removeFromContainer(children.map(c => c.id));
  }
}

function handleAddToContainer(payload: { nodeIds: string[]; containerId: string }) {
  addToContainer(payload.nodeIds, payload.containerId);
}

function handleRemoveFromContainer(payload: { nodeIds: string[] }) {
  removeFromContainer(payload.nodeIds);
}

function handleClearContainer(payload: { containerId: string }) {
  clearContainerChildren(payload.containerId);
}

/**
 * Group selected nodes into a new container
 * Creates a container that encompasses all selected nodes and makes them children
 */
function groupSelectedNodes() {
  if (selectedNodeIds.value.size < 2) {
    logger.warn('Need at least 2 nodes selected to group');
    return;
  }
  
  const nodesToGroup = nodes.value.filter(node => selectedNodeIds.value.has(node.id));
  
  // Calculate bounding box of selected nodes
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const node of nodesToGroup) {
    const absPos = getAbsolutePosition(node);
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
  const containerTemplate = componentLibrary.value.find(t => t.primitiveId === 'primitive.container');
  if (!containerTemplate) {
    logger.error('Container template not found');
    return;
  }
  
  // Create container node
  const containerId = generateId('node');
  const containerNode: CanvasNode = {
    id: containerId,
    componentId: containerTemplate.id,
    name: 'Group Container',
    position: { x: minX, y: minY },
    size: { x: maxX - minX, y: maxY - minY },
    props: {
      ...containerTemplate.defaults.props,
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
  nodes.value.push(containerNode);
  
  // Add selected nodes to container
  addToContainer(Array.from(selectedNodeIds.value), containerId);
  
  // Select the new container
  selectedNodeIds.value.clear();
  selectedNodeIds.value.add(containerId);
  selectedNodeId.value = containerId;
  
  pushHistory();
  logger.info(`Grouped ${nodesToGroup.length} nodes into container ${containerId}`);
}

/**
 * Ungroup a container - extract its children back to root level
 */
function ungroupSelectedNode() {
  if (selectedNodeIds.value.size !== 1) {
    logger.warn('Need exactly 1 container selected to ungroup');
    return;
  }
  
  const containerId = Array.from(selectedNodeIds.value)[0];
  const container = nodes.value.find(n => n.id === containerId);
  
  if (!container) return;
  
  if (!isContainer(containerId)) {
    logger.warn('Selected node is not a container');
    return;
  }
  
  const children = container.children || [];
  if (children.length === 0) {
    logger.warn('Container has no children to ungroup');
    return;
  }
  
  // Remove children from container (converts to absolute positions)
  removeFromContainer(children);
  
  // Select the ungrouped children
  selectedNodeIds.value.clear();
  children.forEach(id => selectedNodeIds.value.add(id));
  selectedNodeId.value = children[0] || null;
  
  // Delete the container
  nodes.value = nodes.value.filter(n => n.id !== containerId);
  
  // Remove any bindings associated with the container
  bindings.value = bindings.value.filter(b => b.componentId !== containerId);
  
  pushHistory();
  logger.info(`Ungrouped container ${containerId}, extracted ${children.length} children`);
}

/**
 * Get absolute position of a node (accounting for parent containers)
 */
function getAbsolutePosition(node: CanvasNode): Vector2 {
  if (!node.parentId) {
    return { ...node.position };
  }
  
  const parent = nodes.value.find(n => n.id === node.parentId);
  if (!parent) {
    return { ...node.position };
  }
  
  const parentAbsPos = getAbsolutePosition(parent);
  return {
    x: parentAbsPos.x + node.position.x,
    y: parentAbsPos.y + node.position.y,
  };
}

function handleGroupSelected() {
  groupSelectedNodes();
}

function handleUngroupSelected() {
  ungroupSelectedNode();
}

// Clipboard for copy/paste operations
const clipboard = ref<{
  nodes: CanvasNode[];
  bindings: Binding[];
} | null>(null);

// Auto-save timer
const autoSaveTimer = ref<number | null>(null);
const AUTO_SAVE_DELAY_MS = 30000; // 30 seconds

function scheduleAutoSave() {
  if (autoSaveTimer.value !== null) {
    window.clearTimeout(autoSaveTimer.value);
  }
  autoSaveTimer.value = window.setTimeout(() => {
    if (dirty.value && currentFaceplateId.value) {
      logger.debug('Auto-saving faceplate...');
      saveWorkspace().catch(err => {
        logger.warn('Auto-save failed:', err);
      });
    }
  }, AUTO_SAVE_DELAY_MS);
}

function duplicateSelectedNodes() {
  if (!selectedNodeIds.value.size) return;

  const nodesToDuplicate = nodes.value.filter(node => selectedNodeIds.value.has(node.id));
  const bindingsToDuplicate = bindings.value.filter(b => selectedNodeIds.value.has(b.componentId));
  
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
      componentName: nodes.value.find(n => n.id === newComponentId)?.name || binding.componentName,
    };
    newBindings.push(newBinding);
  }
  
  nodes.value = [...nodes.value, ...newNodes];
  bindings.value = [...bindings.value, ...newBindings];
  
  // Select the newly created nodes
  applySelection(newNodes.map(n => n.id), newNodes[0]?.id);
  pushHistory();
}

function copySelectedNodes() {
  if (!selectedNodeIds.value.size) return;
  
  const nodesToCopy = nodes.value.filter(node => selectedNodeIds.value.has(node.id));
  const bindingsToCopy = bindings.value.filter(b => selectedNodeIds.value.has(b.componentId));
  
  clipboard.value = {
    nodes: nodesToCopy.map(node => ({ ...node })),
    bindings: bindingsToCopy.map(b => ({ ...b })),
  };
  
  logger.debug(`Copied ${nodesToCopy.length} node(s) to clipboard`);
}

function pasteNodes() {
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
      position: { x: node.position.x + 30, y: node.position.y + 30 },
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
  
  nodes.value = [...nodes.value, ...newNodes];
  bindings.value = [...bindings.value, ...newBindings];
  
  // Select the newly pasted nodes
  applySelection(newNodes.map(n => n.id), newNodes[0]?.id);
  pushHistory();
  logger.debug(`Pasted ${newNodes.length} node(s)`);
}

function handleKeyDown(event: KeyboardEvent) {
  // Check if user is typing in a form field
  const target = event.target as HTMLElement | null;
  if (target) {
    const tag = target.tagName;
    const isFormField = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
    if (isFormField || target.isContentEditable) {
      return;
    }
  }

  const isMod = event.metaKey || event.ctrlKey;
  const isShift = event.shiftKey;

  // Undo/Redo: Cmd/Ctrl + Z / Cmd/Ctrl + Shift + Z
  if (isMod && event.key === 'z') {
    event.preventDefault();
    if (isShift) {
      redo();
    } else {
      undo();
    }
    return;
  }

  // Redo alternative: Cmd/Ctrl + Y
  if (isMod && event.key === 'y') {
    event.preventDefault();
    redo();
    return;
  }

  // Save: Cmd/Ctrl + S
  if (isMod && event.key === 's') {
    event.preventDefault();
    if (currentFaceplateId.value) {
      saveWorkspace();
    }
    return;
  }

  // Copy: Cmd/Ctrl + C
  if (isMod && event.key === 'c' && selectedNodeIds.value.size) {
    event.preventDefault();
    copySelectedNodes();
    return;
  }

  // Paste: Cmd/Ctrl + V
  if (isMod && event.key === 'v' && clipboard.value) {
    event.preventDefault();
    pasteNodes();
    return;
  }

  // Duplicate: Cmd/Ctrl + D
  if (isMod && event.key === 'd' && selectedNodeIds.value.size) {
    event.preventDefault();
    duplicateSelectedNodes();
    return;
  }

  // Group: Cmd/Ctrl + G
  if (isMod && event.key === 'g' && selectedNodeIds.value.size >= 2) {
    event.preventDefault();
    groupSelectedNodes();
    return;
  }

  // Ungroup: Cmd/Ctrl + Shift + G
  if (isMod && isShift && event.key === 'g' && selectedNodeIds.value.size === 1) {
    event.preventDefault();
    ungroupSelectedNode();
    return;
  }

  // Select All: Cmd/Ctrl + A
  if (isMod && event.key === 'a') {
    event.preventDefault();
    applySelection(nodes.value.map(n => n.id), nodes.value[0]?.id);
    return;
  }

  // Delete: Delete or Backspace
  if (selectedNodeIds.value.size) {
    const isDeleteKey = event.key === 'Delete';
    const isBackspace = event.key === 'Backspace' && !isMod && !event.altKey;
    if (isDeleteKey || isBackspace) {
      event.preventDefault();
      handleDeleteSelectedNodes();
      return;
    }
  }
}


function undo() {
  if (!canUndo.value) return;
  history.index -= 1;
  applyState(history.stack[history.index]);
}

function redo() {
  if (!canRedo.value) return;
  history.index += 1;
  applyState(history.stack[history.index]);
}

function markSaved() {
  savedIndex.value = history.index;
}

function resetWorkspace() {
  nodes.value = [];
  bindings.value = [];
  currentFaceplateId.value = null;
  currentFaceplateName.value = '';
  currentTargetEntityType.value = '';
  currentScriptModules.value = [];
  currentNotificationChannels.value = [];
  viewportSize.value = { ...DEFAULT_VIEWPORT };
  faceplateMetadata.value = {};
  applySelection([], null);
  pushHistory();
  markSaved();
}

/**
 * Shared function to load faceplate data and update component state
 * Eliminates code duplication between onMounted and handleSelectorSelect
 */
async function loadFaceplateData(faceplateId: EntityId) {
  const faceplate = await faceplateService.readFaceplate(faceplateId);
  currentFaceplateId.value = faceplateId;
  currentFaceplateName.value = faceplate.name;
  currentTargetEntityType.value = faceplate.targetEntityType;
  currentScriptModules.value = faceplate.scriptModules ?? [];
  currentNotificationChannels.value = faceplate.notificationChannels ?? [];
  
  // Load components
  const components = await faceplateService.readComponents(faceplate.components);
  
  // Convert to canvas nodes with parent-child relationships
  const tempNodes = faceplate.configuration.layout.map((layoutItem) => {
    const component = components.find((c) => c.name === layoutItem.component);
    if (!component) return null;
    
    // Find parent component ID if parentId (name) is specified
    let parentComponentId: string | null = null;
    if (layoutItem.parentId) {
      const parentComponent = components.find((c) => c.name === layoutItem.parentId);
      parentComponentId = parentComponent ? String(parentComponent.id) : null;
    }
    
    const node: CanvasNode = {
      id: String(component.id),
      componentId: findTemplateForPrimitive(component.componentType),
      name: component.name,
      position: { x: layoutItem.x, y: layoutItem.y },
      size: { x: layoutItem.w || 4, y: layoutItem.h || 3 },
      props: component.configuration,
      parentId: parentComponentId,
    };
    
    return node;
  }).filter((n): n is CanvasNode => n !== null);
  
  // Build children arrays for containers
  const childrenMap = new Map<string, string[]>();
  tempNodes.forEach(node => {
    if (node.parentId) {
      if (!childrenMap.has(node.parentId)) {
        childrenMap.set(node.parentId, []);
      }
      childrenMap.get(node.parentId)!.push(node.id);
    }
  });
  
  // Load event handlers from configuration
  const eventHandlersFromConfig = faceplate.configuration.eventHandlers || [];
  const eventHandlersByComponent = new Map<string, EventHandler[]>();
  
  eventHandlersFromConfig.forEach((handlerData: any) => {
    const componentName = handlerData.componentId; // componentId is actually the component name
    if (!eventHandlersByComponent.has(componentName)) {
      eventHandlersByComponent.set(componentName, []);
    }
    eventHandlersByComponent.get(componentName)!.push({
      id: handlerData.id,
      componentId: '', // Will be set when we map to nodes
      trigger: handlerData.trigger,
      action: handlerData.action,
      description: handlerData.description,
      enabled: handlerData.enabled !== false,
    });
  });

  // Assign children arrays and event handlers to nodes
  nodes.value = tempNodes.map(node => {
    const children = childrenMap.get(node.id);
    const eventHandlers = eventHandlersByComponent.get(node.name);
    
    // Update event handler componentId to match node ID
    const updatedHandlers = eventHandlers?.map(h => ({ ...h, componentId: node.id }));
    
    return {
      ...node,
      children: children && children.length > 0 ? children : undefined,
      eventHandlers: updatedHandlers && updatedHandlers.length > 0 ? updatedHandlers : undefined,
    };
  });
  
  // Convert bindings - b.component is now a name, find node by name
  bindings.value = faceplate.configuration.bindings.map((b, idx) => {
    const node = nodes.value.find((n) => n.name === b.component);
    return {
      id: `binding-${idx}`,
      componentId: node?.id || '',
      componentName: b.component,
      property: b.property,
      expression: b.expression,
      mode: b.mode ?? (b.expression?.trim()?.startsWith('script:') ? 'script' : 'field'),
      transform: b.transform ?? null,
      dependencies: Array.isArray(b.dependencies) ? b.dependencies : undefined,
      description: b.description,
    };
  });
  
  applyViewportMetadata(faceplate.configuration.metadata as Record<string, unknown> | undefined);
  applySelection([], null);
  
  pushHistory();
  markSaved();
}

async function saveWorkspace() {
  if (isSaving.value) return;
  
  try {
    isSaving.value = true;
    logger.info('Starting faceplate save...');
    
    // Show selector with new form if new faceplate
    if (!currentFaceplateId.value) {
      showFaceplateSelector.value = true;
      isSaving.value = false;
      return;
    }
    
    // Get existing components to delete after new ones are created (avoid race condition)
    const existingFaceplate = await faceplateService.readFaceplate(currentFaceplateId.value);
    const oldComponentIds = existingFaceplate.components;
    
    // Build NEW component entities with fresh IDs
    const componentIds: EntityId[] = [];
    const nodeIdToComponentId = new Map<string, EntityId>();
    
    for (const node of nodes.value) {
      const template = templateMap.value[node.componentId];
      if (!template) continue;
      
      // Always create a NEW component with fresh ID
      const componentId = await faceplateService.createComponent(
        currentFaceplateId.value,
        node.name,
        template.primitiveId
      );
      componentIds.push(componentId);
      nodeIdToComponentId.set(node.id, componentId);
      
      // Find bindings for this node and save with component name (not ID)
      const nodeBindings = bindings.value.filter((b) => b.componentId === node.id);
      const bindingsData = nodeBindings.map((b) => ({
        component: node.name,
        property: b.property,
        expression: b.expression,
        mode: b.mode ?? 'field',
        transform: b.transform ?? undefined,
        dependencies: b.dependencies?.length ? b.dependencies : undefined,
        description: b.description,
      }));
      
      // Update component data
      await faceplateService.writeComponent({
        id: componentId,
        name: node.name,
        componentType: template.primitiveId,
        configuration: node.props,
        configurationRaw: JSON.stringify(node.props),
        bindings: bindingsData,
        bindingsRaw: JSON.stringify(bindingsData),
        animationRules: [],
        animationRulesRaw: '[]',
      });
    }
    
    // Build layout configuration using component names
    const layout = nodes.value.map((node) => {
      const componentId = nodeIdToComponentId.get(node.id);
      if (!componentId) return null;
      
      // Map parent node ID to parent component name
      const parentNode = node.parentId ? nodes.value.find(n => n.id === node.parentId) : null;
      
      return {
        component: node.name,
        x: node.position.x,
        y: node.position.y,
        w: node.size.x,
        h: node.size.y,
        parentId: parentNode ? parentNode.name : null,
      };
    }).filter((item): item is NonNullable<typeof item> => item !== null);

    const bindingsData = bindings.value.map((b) => {
      const node = nodes.value.find(n => n.id === b.componentId);
      if (!node) return null;
      return {
        component: b.componentName,
        property: b.property,
        expression: b.expression,
        mode: b.mode ?? 'field',
        transform: b.transform ?? undefined,
        dependencies: b.dependencies?.length ? b.dependencies : undefined,
        description: b.description,
      };
    }).filter((item): item is NonNullable<typeof item> => item !== null);

    // Build event handlers configuration using component names
    const eventHandlersData = nodes.value
      .filter(node => node.eventHandlers && node.eventHandlers.length > 0)
      .flatMap(node => 
        (node.eventHandlers || []).map(handler => ({
          id: handler.id,
          componentId: node.name, // Use component name, not ID
          trigger: handler.trigger,
          action: handler.action,
          description: handler.description,
          enabled: handler.enabled !== false,
        }))
      );

    const metadata = {
      ...faceplateMetadata.value,
      viewport: {
        width: viewportSize.value.x,
        height: viewportSize.value.y,
      },
    };
    
    // Save faceplate configuration
    await faceplateService.writeFaceplate({
      id: currentFaceplateId.value,
      name: currentFaceplateName.value,
      targetEntityType: currentTargetEntityType.value,
      configuration: { 
        layout, 
        bindings: bindingsData, 
        eventHandlers: eventHandlersData.length > 0 ? eventHandlersData : undefined,
        metadata 
      },
      components: componentIds,
      notificationChannels: currentNotificationChannels.value,
      scriptModules: currentScriptModules.value,
    });
    
    // NOW delete old components after successful save (prevents race condition)
    if (oldComponentIds.length > 0) {
      await Promise.all(oldComponentIds.map(compId => 
        faceplateService.deleteComponent(compId).catch((err) => {
          logger.warn(`Failed to delete old component ${compId}:`, err);
        })
      ));
    }
    
    faceplateMetadata.value = metadata;
    markSaved();
  } catch (error) {
    logger.error('Failed to save faceplate:', error);
  } finally {
    isSaving.value = false;
  }
}

async function loadWorkspace() {
  selectorStartInNewMode.value = false;
  showFaceplateSelector.value = true;
}

async function handleSelectorSelect(faceplateId: EntityId) {
  showFaceplateSelector.value = false;
  
  try {
    await loadFaceplateData(faceplateId);
  } catch (error) {
    logger.error('Failed to load faceplate:', error);
  }
}

function findTemplateForPrimitive(primitiveId: string): string {
  // Find a template that uses this primitive
  for (const template of componentLibrary.value) {
    if (template.primitiveId === primitiveId) {
      return template.id;
    }
  }
  // Return first template as fallback
  return componentLibrary.value[0]?.id || 'component-gauge-default';
}

function newWorkspace() {
  if (dirty.value) {
    logger.warn('Warning: You have unsaved changes.');
  }
  // Show selector in 'new' mode
  selectorStartInNewMode.value = true;
  showFaceplateSelector.value = true;
}

function handleSelectorClose() {
  showFaceplateSelector.value = false;
  selectorStartInNewMode.value = false;
}

async function handleSelectorNew(faceplateId: EntityId) {
  showFaceplateSelector.value = false;
  selectorStartInNewMode.value = false;
  
  try {
    const faceplate = await faceplateService.readFaceplate(faceplateId);
    currentFaceplateId.value = faceplateId;
    currentFaceplateName.value = faceplate.name;
    currentTargetEntityType.value = faceplate.targetEntityType;
    currentScriptModules.value = faceplate.scriptModules ?? [];
    currentNotificationChannels.value = faceplate.notificationChannels ?? [];
    
    // Start with empty canvas for new faceplate
    nodes.value = [];
    bindings.value = [];
    
    applyViewportMetadata(faceplate.configuration.metadata as Record<string, unknown> | undefined);
    applySelection([], null);
    
    pushHistory();
    markSaved();
    logger.info(`New faceplate "${faceplate.name}" ready for editing!`);
  } catch (error) {
    logger.error('Failed to initialize new faceplate:', error);
  }
}

// Custom components have been removed from this implementation

function handleBeforeUnload(event: BeforeUnloadEvent) {
  if (dirty.value) {
    const message = 'You have unsaved changes. Are you sure you want to leave?';
    event.preventDefault();
    event.returnValue = message;
    return message;
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('beforeunload', handleBeforeUnload);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('beforeunload', handleBeforeUnload);
  if (autoSaveTimer.value !== null) {
    window.clearTimeout(autoSaveTimer.value);
  }
});

// Initialize with an empty baseline state.
onMounted(async () => {
  if (!history.stack.length) {
    pushHistory();
    markSaved();
  }
  
  // If a faceplate ID was provided, load it
  if (props.faceplateId) {
    try {
      await loadFaceplateData(props.faceplateId);
    } catch (error) {
      logger.error('Failed to load faceplate on mount:', error);
    }
  }
});
</script>

<template>
  <div class="faceplate-builder">
    <BuilderToolbar
      :can-undo="canUndo"
      :can-redo="canRedo"
      :dirty="dirty"
      :faceplate-id="currentFaceplateId ? String(currentFaceplateId) : null"
      :faceplate-name="currentFaceplateName"
      :target-entity-type="currentTargetEntityType"
      :viewport-width="viewportSize.x"
      :viewport-height="viewportSize.y"
      :is-saving="isSaving"
      @undo="undo"
      @redo="redo"
      @save="saveWorkspace"
      @new="newWorkspace"
      @load="loadWorkspace"
      @viewport-resize="handleViewportUpdate"
    />

    <div class="faceplate-builder__body">
      <aside class="faceplate-builder__sidebar">
        <ComponentPalette
          :components="paletteItems"
          @create-request="(id) => handleNodeRequest({ componentId: id, position: { x: 40, y: 40 } })"
        />
      </aside>

      <main class="workspace">
        <div class="workspace__canvas">
          <BuilderCanvas
            :nodes="nodes"
            :selected-node-id="selectedNodeId"
            :selected-node-ids="selectedNodeIds"
            :templates="templateMap"
            :viewport="viewportSize"
            @node-requested="handleNodeRequest"
            @node-selected="handleNodeSelected"
            @nodes-updated="handleNodesUpdated"
            @nodes-move-end="handleNodesMoveEnd"
            @node-resized="handleNodeResized"
            @node-resize-end="handleNodeResizeEnd"
            @canvas-clicked="handleCanvasClick"
            @drag-select-complete="handleDragSelectComplete"
            @add-to-container="handleAddToContainer"
            @context-menu-action="handleContextMenuAction"
          />
          <div v-if="!hasFaceplateSelected" class="workspace__overlay">
            <div class="workspace__overlay-content">
              <div class="workspace__overlay-icon">📋</div>
              <h3>No Faceplate Selected</h3>
              <p>Create a new faceplate or load an existing one to start editing</p>
              <div class="workspace__overlay-actions">
                <button type="button" class="workspace__overlay-button" @click="newWorkspace">Create New</button>
                <button type="button" class="workspace__overlay-button workspace__overlay-button--primary" @click="loadWorkspace">Load Existing</button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <LayersPanel
        :nodes="nodes"
        :selected-node-ids="selectedNodeIds"
        @select-node="(nodeId, isMultiSelect) => handleNodeSelected({ nodeId, isMultiSelect })"
        @toggle-visibility="handleLayerVisibilityToggle"
        @reorder="handleLayerReorder"
        @bring-to-front="(nodeId) => handleBringForward({ nodeId })"
        @send-to-back="(nodeId) => handleSendBackward({ nodeId })"
      />

      <InspectorPanel
        :node="selectedNode"
        :template="selectedTemplate"
        :bindings="selectedNodeBindings"
        :all-nodes="nodes"
        :all-containers="getAllContainers()"
        :container-children="selectedNode ? getContainerChildren(selectedNode.id) : []"
        :is-container="selectedNode ? isContainer(selectedNode.id) : false"
        :selected-count="selectedNodeIds.size"
        @resize="handleResize"
        @prop-updated="handlePropUpdated"
        @binding-create="handleInspectorBindingCreate"
        @binding-update="handleInspectorBindingUpdate"
        @binding-remove="handleInspectorBindingRemove"
        @event-handler-create="handleEventHandlerCreate"
        @event-handler-update="handleEventHandlerUpdate"
        @event-handler-remove="handleEventHandlerRemove"
        @delete-node="handleInspectorNodeDelete"
        @bring-forward="handleBringForward"
        @send-backward="handleSendBackward"
        @add-to-container="handleAddToContainer"
        @remove-from-container="handleRemoveFromContainer"
        @clear-container="handleClearContainer"
        @toggle-lock="handleToggleLock"
        @toggle-visibility="handleToggleVisibility"
        @group-selected="handleGroupSelected"
        @ungroup-selected="handleUngroupSelected"
      />
    </div>

    <FaceplateSelector
      :show="showFaceplateSelector"
      :start-in-new-mode="selectorStartInNewMode"
      @select="handleSelectorSelect"
      @new="handleSelectorNew"
      @close="handleSelectorClose"
    />
  </div>
</template>

<style scoped>
.faceplate-builder {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: radial-gradient(circle at top, rgba(0, 16, 24, 0.78), rgba(0, 0, 0, 0.9));
  color: var(--qui-text-primary);
}

.faceplate-builder__body {
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr) 280px 320px;
  gap: 0;
  flex: 1;
  min-height: 0;
  height: 100%;
  overflow: hidden;
}

.faceplate-builder__sidebar {
  display: flex;
  flex-direction: column;
  background: rgba(4, 12, 18, 0.72);
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(18px);
  overflow-y: auto;
  min-height: 0;
}

.faceplate-builder__sidebar :deep(.palette) {
  background: transparent;
  border-right: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 0;
}

.faceplate-builder__sidebar :deep(.palette__header) {
  padding-bottom: 12px;
}

.workspace {
  display: flex;
  flex-direction: column;
  padding: 0;
  gap: 0;
  min-height: 0;
  height: 100%;
  overflow: hidden;
}

.workspace__canvas {
  position: relative;
}

.workspace__overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 6, 10, 0.92);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.workspace__overlay-content {
  text-align: center;
  max-width: 420px;
  padding: 48px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
}

.workspace__overlay-icon {
  font-size: 64px;
  margin-bottom: 20px;
  opacity: 0.6;
}

.workspace__overlay-content h3 {
  margin: 0 0 12px 0;
  font-size: 24px;
  font-weight: 600;
}

.workspace__overlay-content p {
  margin: 0 0 32px 0;
  font-size: 15px;
  opacity: 0.7;
  line-height: 1.5;
}

.workspace__overlay-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.workspace__overlay-button {
  padding: 12px 24px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.05);
  color: inherit;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.18s ease;
}

.workspace__overlay-button:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-1px);
}

.workspace__overlay-button--primary {
  background: rgba(0, 255, 194, 0.18);
  border-color: rgba(0, 255, 194, 0.34);
}

.workspace__overlay-button--primary:hover {
  background: rgba(0, 255, 194, 0.28);
}

@media (max-width: 1480px) {
  .faceplate-builder__body {
    grid-template-columns: 260px 1fr 300px;
  }
}

@media (max-width: 1280px) {
  .faceplate-builder__body {
    grid-template-columns: 240px minmax(0, 1fr) 280px;
  }

  .workspace {
    padding: 20px;
  }
}

@media (max-width: 1080px) {
  .faceplate-builder__body {
    grid-template-columns: minmax(0, 1fr);
    grid-auto-rows: minmax(0, auto);
    overflow: auto;
  }

  .faceplate-builder__sidebar {
    grid-column: 1 / -1;
    max-height: 320px;
    border-right: none;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  .workspace {
    grid-column: 1 / -1;
    padding: 18px;
  }

  :deep(.inspector) {
    grid-column: 1 / -1;
    width: 100%;
    border-left: none;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }
}
</style>
