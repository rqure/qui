<script setup lang="ts">
import { computed, reactive, ref, onMounted, onBeforeUnmount } from 'vue';
import SchematicCanvas from './components/SchematicCanvas.vue';
import ComponentPalette from '@/apps/faceplate-builder/components/ComponentPalette.vue';
import InspectorPanel from '@/apps/faceplate-builder/components/InspectorPanel.vue';
import BuilderToolbar from '@/apps/faceplate-builder/components/BuilderToolbar.vue';
import SchematicSelector from './components/SchematicSelector.vue';
import LayersPanel from '@/apps/faceplate-builder/components/LayersPanel.vue';
import { useDataStore } from '@/stores/data';
import { useWindowStore } from '@/stores/windows';
import { SchematicDataService } from './utils/schematic-data';
import {
  DEFAULT_VIEWPORT_WIDTH,
  DEFAULT_VIEWPORT_HEIGHT,
  MIN_VIEWPORT_WIDTH,
  MIN_VIEWPORT_HEIGHT,
} from './constants';
import { PRIMITIVE_REGISTRY } from '@/apps/faceplate-builder/utils/primitive-registry';
import { generateId, createNodeMap, createBindingMap } from '@/apps/faceplate-builder/utils/helpers';
import { useWorkspaceState } from '@/apps/faceplate-builder/composables/useWorkspaceState';
import { useFaceplateOperations } from '@/apps/faceplate-builder/composables/useFaceplateOperations';
import { useHistoryManager } from '@/apps/faceplate-builder/composables/useHistoryManager';
import { useClipboard } from '@/apps/faceplate-builder/composables/useClipboard';
import { useContainerManagement } from '@/apps/faceplate-builder/composables/useContainerManagement';
import { ContainerManagementService } from '@/apps/faceplate-builder/utils/container-management';
import type { SchematicNotificationChannel, SchematicScriptModule } from './utils/schematic-data';
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

// Props for optional pre-loaded schematic
const props = defineProps<{
  schematicId?: EntityId | null;
  entityId?: EntityId | null;
}>();

const dataStore = useDataStore();
const schematicService = new SchematicDataService(dataStore);
const windowStore = useWindowStore();

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
        ...options.props,
      },
    },
    propertySchema: cloneSchema(primitive.propertySchema),
    source: options.source,
  };
}

const builtInTemplates: PaletteTemplate[] = PRIMITIVE_REGISTRY.map((primitive) =>
  buildTemplate({
    id: primitive.id,
    primitiveId: primitive.id,
    label: primitive.label,
    description: primitive.description,
    icon: primitive.icon,
    source: 'built-in',
  }),
);

const customTemplates = ref<PaletteTemplate[]>([]);
const templateMap = ref<Record<string, PaletteTemplate>>({});
const allTemplates = computed(() => [...builtInTemplates, ...customTemplates.value]);

const nodes = ref<CanvasNode[]>([]);
const bindings = ref<Binding[]>([]);
const selectedNodeIds = ref<string[]>([]);
const zoom = ref(1.0);
const pan = ref<Vector2>({ x: 0, y: 0 });
const viewportSize = ref<Vector2>(DEFAULT_VIEWPORT);
const showPalette = ref(true);
const showInspector = ref(true);
const showLayers = ref(true);

const currentSchematicId = ref<EntityId | null>(null);
const currentSchematicName = ref('New Schematic');
const currentScriptModules = ref<SchematicScriptModule[]>([]);
const currentNotificationChannels = ref<SchematicNotificationChannel[]>([]);
const schematicMetadata = ref<Record<string, unknown>>({});

// Simple history and clipboard management
const historyStack = ref<any[]>([]);
const historyIndex = ref(-1);
const clipboard = ref<{ nodes: CanvasNode[]; bindings: Binding[] } | null>(null);

const canUndo = computed(() => historyIndex.value > 0);
const canRedo = computed(() => historyIndex.value < historyStack.value.length - 1);
const canPaste = computed(() => clipboard.value !== null);

function pushHistory(nodesVal: CanvasNode[], bindingsVal: Binding[], viewportVal: Vector2, metadataVal: Record<string, unknown>) {
  const snapshot = {
    nodes: JSON.parse(JSON.stringify(nodesVal)),
    bindings: JSON.parse(JSON.stringify(bindingsVal)),
    viewport: JSON.parse(JSON.stringify(viewportVal)),
    metadata: JSON.parse(JSON.stringify(metadataVal)),
  };
  
  // Remove any redo states
  historyStack.value = historyStack.value.slice(0, historyIndex.value + 1);
  historyStack.value.push(snapshot);
  historyIndex.value++;
}

function undo() {
  if (!canUndo.value) return;
  historyIndex.value--;
  const snapshot = historyStack.value[historyIndex.value];
  nodes.value = JSON.parse(JSON.stringify(snapshot.nodes));
  bindings.value = JSON.parse(JSON.stringify(snapshot.bindings));
  viewportSize.value = JSON.parse(JSON.stringify(snapshot.viewport));
  schematicMetadata.value = JSON.parse(JSON.stringify(snapshot.metadata));
}

function redo() {
  if (!canRedo.value) return;
  historyIndex.value++;
  const snapshot = historyStack.value[historyIndex.value];
  nodes.value = JSON.parse(JSON.stringify(snapshot.nodes));
  bindings.value = JSON.parse(JSON.stringify(snapshot.bindings));
  viewportSize.value = JSON.parse(JSON.stringify(snapshot.viewport));
  schematicMetadata.value = JSON.parse(JSON.stringify(snapshot.metadata));
}

function copySelection() {
  const selectedNodes = nodes.value.filter(n => selectedNodeIds.value.includes(n.id));
  const selectedBindings = bindings.value.filter(b => selectedNodeIds.value.includes(b.componentId));
  clipboard.value = {
    nodes: JSON.parse(JSON.stringify(selectedNodes)),
    bindings: JSON.parse(JSON.stringify(selectedBindings)),
  };
}

function pasteSelection() {
  if (!clipboard.value) return;
  
  const idMap = new Map<string, string>();
  const pastedNodes = clipboard.value.nodes.map(node => {
    const newId = generateId('node');
    idMap.set(node.id, newId);
    return {
      ...node,
      id: newId,
      position: { x: node.position.x + 20, y: node.position.y + 20 },
    };
  });
  
  const pastedBindings = clipboard.value.bindings.map(binding => ({
    ...binding,
    id: generateId('binding'),
    componentId: idMap.get(binding.componentId) ?? binding.componentId,
  }));
  
  nodes.value = [...nodes.value, ...pastedNodes];
  bindings.value = [...bindings.value, ...pastedBindings];
  selectedNodeIds.value = pastedNodes.map(n => n.id);
  pushHistory(nodes.value, bindings.value, viewportSize.value, schematicMetadata.value);
}

// Container management placeholder
const containerManagement = {
  addToContainer: (nodeIds: string[], containerId: string, nodesVal: CanvasNode[], onPush: () => void) => {
    // Simple implementation - just set parent
    const updated = [...nodesVal];
    for (const nodeId of nodeIds) {
      const idx = updated.findIndex(n => n.id === nodeId);
      if (idx !== -1) {
        updated[idx] = { ...updated[idx], parentId: containerId };
      }
    }
    nodes.value = updated;
    onPush();
  },
  removeFromContainer: (nodeIds: string[], nodesVal: CanvasNode[], onPush: () => void) => {
    const updated = [...nodesVal];
    for (const nodeId of nodeIds) {
      const idx = updated.findIndex(n => n.id === nodeId);
      if (idx !== -1) {
        updated[idx] = { ...updated[idx], parentId: null };
      }
    }
    nodes.value = updated;
    onPush();
  },
};

// Simplified operations - we'll implement these directly
async function createNewSchematic() {
  nodes.value = [];
  bindings.value = [];
  selectedNodeIds.value = [];
  viewportSize.value = DEFAULT_VIEWPORT;
  currentSchematicId.value = null;
  currentSchematicName.value = 'New Schematic';
  currentScriptModules.value = [];
  currentNotificationChannels.value = [];
  schematicMetadata.value = {};
  pushHistory(nodes.value, bindings.value, viewportSize.value, schematicMetadata.value);
}

async function loadExistingSchematic(schematicId: EntityId) {
  const schematic = await schematicService.readSchematic(schematicId);
  currentSchematicId.value = schematic.id;
  currentSchematicName.value = schematic.name;
  currentScriptModules.value = schematic.scriptModules;
  currentNotificationChannels.value = schematic.notificationChannels;
  schematicMetadata.value = schematic.configuration.metadata || {};
  
  const components = await schematicService.readComponents(schematic.components);
  
  const tempNodes = schematic.configuration.layout.map((layoutItem) => {
    const component = components.find((c) => c.name === layoutItem.component);
    if (!component) return null;
    
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
      size: { x: layoutItem.w ?? 100, y: layoutItem.h ?? 100 },
      props: component.configuration,
      parentId: parentComponentId,
    };
    
    return node;
  }).filter(Boolean) as CanvasNode[];
  
  nodes.value = tempNodes;
  bindings.value = schematic.configuration.bindings.map((b) => ({
    id: generateId('binding'),
    componentId: tempNodes.find(n => n.name === b.component)?.id ?? '',
    componentName: b.component,
    property: b.property,
    expression: b.expression,
    mode: b.mode,
    transform: b.transform,
    dependencies: b.dependencies,
    description: b.description,
  }));
  
  selectedNodeIds.value = [];
  const metadata = schematic.configuration.metadata as any;
  viewportSize.value = metadata?.viewport 
    ? { x: metadata.viewport.width, y: metadata.viewport.height }
    : DEFAULT_VIEWPORT;
  
  pushHistory(nodes.value, bindings.value, viewportSize.value, schematicMetadata.value);
}

async function saveCurrentSchematic() {
  if (!currentSchematicId.value) {
    const rootId = 1 as EntityId;
    currentSchematicId.value = await schematicService.createSchematic(rootId, currentSchematicName.value);
  }
  
  const nodeMap = createNodeMap(nodes.value);
  const bindingMap = createBindingMap(bindings.value);
  
  const componentIds: EntityId[] = [];
  
  for (const node of nodes.value) {
    const componentId = parseInt(node.id, 10) as EntityId;
    componentIds.push(componentId);
    
    const template = templateMap.value[node.componentId];
    await schematicService.writeComponent({
      id: componentId,
      name: node.name,
      componentType: template?.primitiveId ?? 'Rectangle',
      configuration: node.props,
      configurationRaw: JSON.stringify(node.props),
      bindings: [],
      bindingsRaw: '[]',
      animationRules: [],
      animationRulesRaw: '[]',
    });
  }
  
  const layout = nodes.value.map(node => ({
    component: node.name,
    x: node.position.x,
    y: node.position.y,
    w: node.size.x,
    h: node.size.y,
    parentId: node.parentId ? nodeMap.get(node.parentId)?.name ?? null : null,
  }));
  
  const bindingsData = bindings.value.map(binding => ({
    component: binding.componentName,
    property: binding.property,
    expression: binding.expression,
    mode: binding.mode,
    transform: binding.transform ?? undefined,
    dependencies: binding.dependencies,
    description: binding.description,
  }));
  
  const metadata = {
    ...schematicMetadata.value,
    viewport: {
      width: viewportSize.value.x,
      height: viewportSize.value.y,
    },
  };
  
  await schematicService.writeSchematic({
    id: currentSchematicId.value,
    name: currentSchematicName.value,
    configuration: { 
      layout, 
      bindings: bindingsData, 
      metadata 
    },
    components: componentIds,
    notificationChannels: currentNotificationChannels.value,
    scriptModules: currentScriptModules.value,
  });
}

async function deleteCurrentSchematic() {
  if (currentSchematicId.value) {
    await schematicService.deleteSchematic(currentSchematicId.value);
    createNewSchematic();
  }
}

onMounted(async () => {
  // Build template map
  templateMap.value = Object.fromEntries(
    allTemplates.value.map((template) => [template.id, template]),
  );

  // Load schematic if provided
  if (props.schematicId) {
    await loadExistingSchematic(props.schematicId);
  } else {
    // Initialize empty schematic state
    nodes.value = [];
    bindings.value = [];
    selectedNodeIds.value = [];
    viewportSize.value = DEFAULT_VIEWPORT;
    pushHistory(nodes.value, bindings.value, viewportSize.value, schematicMetadata.value);
  }
});

onBeforeUnmount(() => {
  // Cleanup if needed
});

function findTemplateForPrimitive(primitiveId: string): string {
  return allTemplates.value.find((t) => t.primitiveId === primitiveId)?.id ?? primitiveId;
}

function handleAddNode(payload: { templateId: string; position: Vector2 }) {
  const template = templateMap.value[payload.templateId];
  if (!template) {
    console.error('Template not found:', payload.templateId);
    return;
  }

  const node: CanvasNode = {
    id: generateId('node'),
    componentId: template.id,
    name: `${template.label} ${nodes.value.length + 1}`,
    position: payload.position,
    size: template.defaults.size,
    props: { ...template.defaults.props },
  };

  nodes.value = [...nodes.value, node];
  selectedNodeIds.value = [node.id];
  pushHistory(nodes.value, bindings.value, viewportSize.value, schematicMetadata.value);
}

function handleNodeUpdate(payload: { nodeId: string; props?: Record<string, unknown>; position?: Vector2; size?: Vector2; name?: string }) {
  const nodeIndex = nodes.value.findIndex((n) => n.id === payload.nodeId);
  if (nodeIndex === -1) return;

  const updated = [...nodes.value];
  const node = { ...updated[nodeIndex] };

  if (payload.props !== undefined) node.props = { ...node.props, ...payload.props };
  if (payload.position !== undefined) node.position = payload.position;
  if (payload.size !== undefined) node.size = payload.size;
  if (payload.name !== undefined) node.name = payload.name;

  updated[nodeIndex] = node;
  nodes.value = updated;
  pushHistory(nodes.value, bindings.value, viewportSize.value, schematicMetadata.value);
}

function handleNodesUpdate(payload: { updates: Array<{ nodeId: string; position?: Vector2; size?: Vector2 }> }) {
  const updated = [...nodes.value];
  let changed = false;

  for (const update of payload.updates) {
    const nodeIndex = updated.findIndex((n) => n.id === update.nodeId);
    if (nodeIndex === -1) continue;

    const node = { ...updated[nodeIndex] };
    if (update.position) node.position = update.position;
    if (update.size) node.size = update.size;
    updated[nodeIndex] = node;
    changed = true;
  }

  if (changed) {
    nodes.value = updated;
    pushHistory(nodes.value, bindings.value, viewportSize.value, schematicMetadata.value);
  }
}

function handleDeleteNodes(payload: { nodeIds: string[] }) {
  const idsToDelete = new Set(payload.nodeIds);
  nodes.value = nodes.value.filter((n) => !idsToDelete.has(n.id));
  bindings.value = bindings.value.filter((b) => !idsToDelete.has(b.componentId));
  selectedNodeIds.value = selectedNodeIds.value.filter((id) => !idsToDelete.has(id));
  pushHistory(nodes.value, bindings.value, viewportSize.value, schematicMetadata.value);
}

function handleSelectionChange(payload: { selectedIds: string[] }) {
  selectedNodeIds.value = payload.selectedIds;
}

function handleToggleVisibility(payload: { nodeId: string }) {
  const nodeIndex = nodes.value.findIndex((n) => n.id === payload.nodeId);
  if (nodeIndex === -1) return;

  const updated = [...nodes.value];
  const node = { ...updated[nodeIndex] };
  node.hidden = !node.hidden;
  updated[nodeIndex] = node;
  nodes.value = updated;
  pushHistory(nodes.value, bindings.value, viewportSize.value, schematicMetadata.value);
}

function handleToggleLock(payload: { nodeId: string }) {
  const nodeIndex = nodes.value.findIndex((n) => n.id === payload.nodeId);
  if (nodeIndex === -1) return;

  const updated = [...nodes.value];
  const node = { ...updated[nodeIndex] };
  node.locked = !node.locked;
  updated[nodeIndex] = node;
  nodes.value = updated;
  pushHistory(nodes.value, bindings.value, viewportSize.value, schematicMetadata.value);
}

function handleBindingUpdate(payload: InspectorBindingPayload) {
  const existingIndex = bindings.value.findIndex(
    (b) => b.componentId === payload.nodeId && b.property === payload.property,
  );

  const node = nodes.value.find((n) => n.id === payload.nodeId);
  if (!node) return;

  const newBinding: Binding = {
    id: existingIndex >= 0 ? bindings.value[existingIndex].id : generateId('binding'),
    componentId: payload.nodeId,
    componentName: node.name,
    property: payload.property,
    expression: payload.expression,
    mode: payload.mode,
    transform: payload.transform,
    dependencies: payload.dependencies,
    description: payload.description,
  };

  if (existingIndex >= 0) {
    bindings.value = bindings.value.map((b, i) => (i === existingIndex ? newBinding : b));
  } else {
    bindings.value = [...bindings.value, newBinding];
  }

  pushHistory(nodes.value, bindings.value, viewportSize.value, schematicMetadata.value);
}

function handleBindingDelete(payload: { nodeId: string; property: string }) {
  bindings.value = bindings.value.filter(
    (b) => !(b.componentId === payload.nodeId && b.property === payload.property),
  );
  pushHistory(nodes.value, bindings.value, viewportSize.value, schematicMetadata.value);
}

function handleScriptModulesUpdate(modules: SchematicScriptModule[]) {
  currentScriptModules.value = modules;
  pushHistory(nodes.value, bindings.value, viewportSize.value, schematicMetadata.value);
}

function handleNotificationChannelsUpdate(channels: SchematicNotificationChannel[]) {
  currentNotificationChannels.value = channels;
  pushHistory(nodes.value, bindings.value, viewportSize.value, schematicMetadata.value);
}

function handleSave() {
  saveCurrentSchematic();
}

function handleZoomChange(newZoom: number) {
  zoom.value = newZoom;
}

function handlePanChange(newPan: Vector2) {
  pan.value = newPan;
}

function handleViewportSizeChange(newSize: Vector2) {
  viewportSize.value = newSize;
  pushHistory(nodes.value, bindings.value, viewportSize.value, schematicMetadata.value);
}

function convertTemplateMap(): Map<string, { id: string; primitiveId: string }> {
  return new Map(Object.entries(templateMap.value).map(([id, template]) => [id, { id, primitiveId: template.primitiveId }]));
}

function handleAddToContainer(payload: { nodeIds: string[]; containerId: string }) {
  containerManagement.addToContainer(payload.nodeIds, payload.containerId, nodes.value, () => 
    pushHistory(nodes.value, bindings.value, viewportSize.value, schematicMetadata.value)
  );
}

function handleRemoveFromContainer(payload: { nodeIds: string[] }) {
  containerManagement.removeFromContainer(payload.nodeIds, nodes.value, () =>
    pushHistory(nodes.value, bindings.value, viewportSize.value, schematicMetadata.value)
  );
}

function handleLayerReorder(payload: { nodeId: string; newIndex: number; newParentId?: string | null }) {
  const nodeIndex = nodes.value.findIndex((n) => n.id === payload.nodeId);
  if (nodeIndex === -1) return;

  const updated = [...nodes.value];
  const node = { ...updated[nodeIndex] };
  
  if (payload.newParentId !== undefined) {
    node.parentId = payload.newParentId;
  }

  if (!payload.newParentId) {
    const currentIndex = updated.findIndex((n) => n.id === payload.nodeId);
    if (currentIndex !== -1) {
      const [movedNode] = updated.splice(currentIndex, 1);
      updated.splice(payload.newIndex, 0, movedNode);
    }
  }
  
  nodes.value = updated;
  pushHistory(nodes.value, bindings.value, viewportSize.value, schematicMetadata.value);
}

function handleLayerVisibilityToggle(payload: { nodeId: string }) {
  handleToggleVisibility(payload);
}

const selectedNodes = computed(() => {
  const selectedIds = new Set(selectedNodeIds.value);
  return nodes.value.filter((n) => selectedIds.has(n.id));
});
</script>

<template>
  <div class="schematic-builder">
    <BuilderToolbar
      title="Schematic Builder"
      :faceplate-name="currentSchematicName"
      :dirty="false"
      :can-undo="canUndo"
      :can-redo="canRedo"
      :can-paste="canPaste"
      :show-palette="showPalette"
      :show-inspector="showInspector"
      :show-layers="showLayers"
      @save="handleSave"
      @undo="undo"
      @redo="redo"
      @copy="copySelection"
      @paste="pasteSelection"
      @delete="handleDeleteNodes({ nodeIds: selectedNodeIds })"
      @toggle-palette="showPalette = !showPalette"
      @toggle-inspector="showInspector = !showInspector"
      @toggle-layers="showLayers = !showLayers"
    />

    <div class="builder-main">
      <ComponentPalette
        v-if="showPalette"
        :components="allTemplates"
        class="palette-panel"
      />

      <div class="canvas-area">
        <SchematicSelector
          :current-schematic-id="currentSchematicId"
          :current-schematic-name="currentSchematicName"
          @load="loadExistingSchematic"
          @create="createNewSchematic"
          @delete="deleteCurrentSchematic"
        />

        <SchematicCanvas
          :nodes="nodes"
          :selected-node-ids="selectedNodeIds"
          :zoom="zoom"
          :pan="pan"
          :viewport-size="viewportSize"
          :templates="templateMap"
          @add-node="handleAddNode"
          @node-update="handleNodeUpdate"
          @nodes-update="handleNodesUpdate"
          @delete-nodes="handleDeleteNodes"
          @selection-change="handleSelectionChange"
          @zoom-change="handleZoomChange"
          @pan-change="handlePanChange"
          @viewport-size-change="handleViewportSizeChange"
        />
      </div>

      <div v-if="showInspector || showLayers" class="side-panels">
        <InspectorPanel
          v-if="showInspector"
          :node="selectedNodes.length === 1 ? selectedNodes[0] : null"
          :template="selectedNodes.length === 1 ? templateMap[selectedNodes[0].componentId] : null"
          :bindings="bindings"
          :all-nodes="nodes"
          :selected-count="selectedNodes.length"
          class="inspector-panel"
          @prop-updated="(p) => handleNodeUpdate({ nodeId: p.nodeId, props: { [p.key]: p.value } })"
          @binding-create="handleBindingUpdate"
          @binding-update="handleBindingUpdate"
          @binding-remove="(p) => handleBindingDelete({ nodeId: p.nodeId, property: p.property })"
          @delete-node="(p) => handleDeleteNodes({ nodeIds: [p.nodeId] })"
        />

        <LayersPanel
          v-if="showLayers"
          :nodes="nodes"
          :selected-node-ids="new Set(selectedNodeIds)"
          :templates="templateMap"
          class="layers-panel"
          @select-node="(id, multi) => handleSelectionChange({ selectedIds: multi ? [...selectedNodeIds, id] : [id] })"
          @toggle-visibility="handleLayerVisibilityToggle"
          @toggle-lock="handleToggleLock"
          @reorder="handleLayerReorder"
          @delete-nodes="handleDeleteNodes"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.schematic-builder {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--qui-bg-primary);
  color: var(--qui-text-primary);
}

.builder-main {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.palette-panel {
  width: 280px;
  border-right: var(--qui-window-border);
  background: var(--qui-bg-secondary);
  overflow-y: auto;
}

.canvas-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.side-panels {
  display: flex;
  flex-direction: column;
  width: 320px;
  border-left: var(--qui-window-border);
  background: var(--qui-bg-secondary);
  overflow: hidden;
}

.inspector-panel {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  border-bottom: var(--qui-window-border);
}

.layers-panel {
  flex: 0 0 300px;
  overflow-y: auto;
}
</style>
