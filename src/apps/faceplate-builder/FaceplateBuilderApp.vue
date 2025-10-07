<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import BuilderCanvas from './components/BuilderCanvas.vue';
import ComponentPalette from './components/ComponentPalette.vue';
import InspectorPanel from './components/InspectorPanel.vue';
import BindingsPanel from './components/BindingsPanel.vue';
import FaceplatePreview from './components/FaceplatePreview.vue';
import BuilderToolbar from './components/BuilderToolbar.vue';

type Vector2 = { x: number; y: number };

type PaletteTemplate = {
  id: string;
  label: string;
  description: string;
  icon: string;
  defaults: {
    size: Vector2;
    props: Record<string, unknown>;
  };
};

type CanvasNode = {
  id: string;
  componentId: string;
  name: string;
  position: Vector2;
  size: Vector2;
  props: Record<string, unknown>;
};

type Binding = {
  id: string;
  componentId: string;
  componentName: string;
  property: string;
  expression: string;
};

const paletteTemplates: PaletteTemplate[] = [
  {
    id: 'value-indicator',
    label: 'Value Indicator',
    description: 'Show a single numeric or text value.',
    icon: '🔢',
    defaults: {
      size: { x: 200, y: 140 },
      props: { label: 'Indicator', precision: 2 },
    },
  },
  {
    id: 'status-tile',
    label: 'Status Tile',
    description: 'Display a boolean state with contextual styling.',
    icon: '🟢',
    defaults: {
      size: { x: 200, y: 160 },
      props: { label: 'Status', trueLabel: 'Running', falseLabel: 'Stopped' },
    },
  },
  {
    id: 'trend-chart',
    label: 'Trend Chart',
    description: 'Time series sparkline for numeric values.',
    icon: '📈',
    defaults: {
      size: { x: 320, y: 220 },
      props: { label: 'Trend', window: '15m' },
    },
  },
  {
    id: 'text-label',
    label: 'Text Label',
    description: 'Static or data bound text field.',
    icon: '🔖',
    defaults: {
      size: { x: 180, y: 100 },
      props: { label: 'Label', text: 'Double-click to edit' },
    },
  },
];

const nodes = ref<CanvasNode[]>([]);
const bindings = ref<Binding[]>([]);
const selectedNodeId = ref<string | null>(null);

const history = reactive<{ stack: Array<{ nodes: CanvasNode[]; bindings: Binding[] }>; index: number }>({
  stack: [],
  index: -1,
});
const savedIndex = ref(-1);

const selectedNode = computed(() => nodes.value.find((node) => node.id === selectedNodeId.value) ?? null);
const canUndo = computed(() => history.index > 0);
const canRedo = computed(() => history.index < history.stack.length - 1);
const dirty = computed(() => history.index !== savedIndex.value);

function generateId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function cloneState(): { nodes: CanvasNode[]; bindings: Binding[] } {
  return {
    nodes: nodes.value.map((node) => ({
      ...node,
      position: { ...node.position },
      size: { ...node.size },
      props: { ...node.props },
    })),
    bindings: bindings.value.map((binding) => ({ ...binding })),
  };
}

function pushHistory() {
  history.stack.splice(history.index + 1);
  history.stack.push(cloneState());
  history.index = history.stack.length - 1;
}

function applyState(snapshot: { nodes: CanvasNode[]; bindings: Binding[] }) {
  nodes.value = snapshot.nodes.map((node) => ({
    ...node,
    position: { ...node.position },
    size: { ...node.size },
    props: { ...node.props },
  }));
  bindings.value = snapshot.bindings.map((binding) => ({ ...binding }));
  if (selectedNodeId.value && !nodes.value.some((node) => node.id === selectedNodeId.value)) {
    selectedNodeId.value = null;
  }
}

function handleNodeRequest(payload: { componentId: string; position: Vector2 }) {
  const template = paletteTemplates.find((item) => item.id === payload.componentId);
  if (!template) return;

  const nodeId = generateId('node');
  nodes.value = [
    ...nodes.value,
    {
      id: nodeId,
      componentId: template.id,
      name: template.label,
      position: { ...payload.position },
      size: { ...template.defaults.size },
      props: { ...template.defaults.props },
    },
  ];
  selectedNodeId.value = nodeId;
  pushHistory();
}

function handleNodeUpdate(payload: { nodeId: string; position: Vector2 }) {
  nodes.value = nodes.value.map((node) =>
    node.id === payload.nodeId ? { ...node, position: { ...payload.position } } : node,
  );
}

function handleNodeMoveEnd(payload: { nodeId: string; position: Vector2 }) {
  handleNodeUpdate(payload);
  pushHistory();
}

function handleNodeSelected(nodeId: string) {
  selectedNodeId.value = nodeId;
}

function handleRename(payload: { nodeId: string; name: string }) {
  nodes.value = nodes.value.map((node) =>
    node.id === payload.nodeId ? { ...node, name: payload.name } : node,
  );
  pushHistory();
}

function handleResize(payload: { nodeId: string; size: Vector2 }) {
  nodes.value = nodes.value.map((node) =>
    node.id === payload.nodeId ? { ...node, size: { x: Math.max(80, payload.size.x), y: Math.max(80, payload.size.y) } } : node,
  );
  pushHistory();
}

function handlePropUpdated(payload: { nodeId: string; key: string; value: unknown }) {
  nodes.value = nodes.value.map((node) =>
    node.id === payload.nodeId ? { ...node, props: { ...node.props, [payload.key]: payload.value } } : node,
  );
  pushHistory();
}

function handleBindingCreate() {
  if (!selectedNode.value) return;
  const bindingId = generateId('binding');
  bindings.value = [
    ...bindings.value,
    {
      id: bindingId,
      componentId: selectedNode.value.id,
      componentName: selectedNode.value.name,
      property: 'value',
      expression: 'Parent->Name',
    },
  ];
  pushHistory();
}

function handleBindingEdit(bindingId: string) {
  const binding = bindings.value.find((item) => item.id === bindingId);
  if (!binding) return;
  // For scaffolding, cycle sample expressions quickly.
  const samples = ['Parent->Name', 'Parent->Parent->Status', 'Temperature', 'CustomLiteral'];
  const currentIndex = samples.indexOf(binding.expression);
  const nextExpression = samples[(currentIndex + 1) % samples.length];
  bindings.value = bindings.value.map((item) =>
    item.id === bindingId ? { ...item, expression: nextExpression } : item,
  );
  pushHistory();
}

function handleBindingRemove(bindingId: string) {
  bindings.value = bindings.value.filter((item) => item.id !== bindingId);
  pushHistory();
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
  selectedNodeId.value = null;
  pushHistory();
  markSaved();
}

function saveWorkspace() {
  // Placeholder save routine - integrate with store API later.
  markSaved();
}

// Initialize with an empty baseline state.
if (!history.stack.length) {
  pushHistory();
  markSaved();
}
</script>

<template>
  <div class="faceplate-builder">
    <BuilderToolbar
      :can-undo="canUndo"
      :can-redo="canRedo"
      :dirty="dirty"
      @undo="undo"
      @redo="redo"
      @reset="resetWorkspace"
      @save="saveWorkspace"
    />

    <div class="faceplate-builder__body">
      <ComponentPalette :components="paletteTemplates" @create-request="(id) => handleNodeRequest({ componentId: id, position: { x: 40, y: 40 } })" />

      <main class="workspace">
        <BuilderCanvas
          :nodes="nodes"
          :selected-node-id="selectedNodeId"
          @node-requested="handleNodeRequest"
          @node-selected="handleNodeSelected"
          @node-updated="handleNodeUpdate"
          @node-move-end="handleNodeMoveEnd"
        />

        <BindingsPanel
          class="workspace__bindings"
          :items="bindings"
          @create="handleBindingCreate"
          @edit="handleBindingEdit"
          @remove="handleBindingRemove"
        />

        <FaceplatePreview class="workspace__preview" :nodes="nodes" />
      </main>

      <InspectorPanel
        :node="selectedNode"
        @rename="handleRename"
        @resize="handleResize"
        @prop-updated="handlePropUpdated"
      />
    </div>
  </div>
</template>

<style scoped>
.faceplate-builder {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: radial-gradient(circle at top, rgba(0, 16, 24, 0.78), rgba(0, 0, 0, 0.9));
  color: var(--qui-text-primary);
}

.faceplate-builder__body {
  display: grid;
  grid-template-columns: 240px 1fr 320px;
  gap: 0;
  flex: 1;
  overflow: hidden;
}

.workspace {
  display: flex;
  flex-direction: column;
  padding: 24px;
  gap: 24px;
  overflow: auto;
}

.workspace__bindings,
.workspace__preview {
  flex: none;
}

@media (max-width: 1480px) {
  .faceplate-builder__body {
    grid-template-columns: 220px 1fr 300px;
  }
}
</style>
