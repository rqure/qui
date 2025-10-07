<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import BuilderCanvas from './components/BuilderCanvas.vue';
import ComponentPalette from './components/ComponentPalette.vue';
import ComponentComposerPanel from './components/ComponentComposerPanel.vue';
import InspectorPanel from './components/InspectorPanel.vue';
import BindingsPanel from './components/BindingsPanel.vue';
import FaceplatePreview from './components/FaceplatePreview.vue';
import BuilderToolbar from './components/BuilderToolbar.vue';
import type {
  Binding,
  CanvasNode,
  PaletteTemplate,
  PrimitiveDefinition,
  PrimitivePropertyDefinition,
  Vector2,
} from './types';

const primitiveCatalog: PrimitiveDefinition[] = [
  {
    id: 'primitive.gauge.arc',
    label: 'Arc Gauge',
    description: 'Circular gauge with dial indicator and numeric readout.',
    icon: '🧭',
    category: 'Indicators',
    defaultSize: { x: 260, y: 200 },
    defaultProps: { label: 'Gauge', value: 58, min: 0, max: 100, unit: '%', precision: 1, suffix: '' },
    propertySchema: [
      { key: 'label', label: 'Label', type: 'string', default: 'Gauge Label' },
      { key: 'value', label: 'Value', type: 'number', default: 58, description: 'Bind this field to live data.' },
      { key: 'min', label: 'Minimum', type: 'number', default: 0 },
      { key: 'max', label: 'Maximum', type: 'number', default: 100 },
      { key: 'unit', label: 'Unit', type: 'string', default: '%' },
      { key: 'precision', label: 'Precision', type: 'number', default: 1 },
      { key: 'suffix', label: 'Suffix', type: 'string', default: '' },
    ],
    previewProps: { label: 'Arc Gauge', value: 72, unit: '%' },
  },
  {
    id: 'primitive.status.pill',
    label: 'Status Pill',
    description: 'Boolean indicator pill with customizable labels.',
    icon: '🟢',
    category: 'Indicators',
    defaultSize: { x: 240, y: 160 },
    defaultProps: { label: 'Status', status: true, trueLabel: 'Running', falseLabel: 'Stopped' },
    propertySchema: [
      { key: 'label', label: 'Label', type: 'string', default: 'Status Indicator' },
      { key: 'status', label: 'State', type: 'boolean', default: true, description: 'Bind to a boolean or alarm status.' },
      { key: 'trueLabel', label: 'True Label', type: 'string', default: 'Running' },
      { key: 'falseLabel', label: 'False Label', type: 'string', default: 'Stopped' },
    ],
    previewProps: { label: 'System', status: true, trueLabel: 'Online', falseLabel: 'Offline' },
  },
  {
    id: 'primitive.trend.sparkline',
    label: 'Trend Sparkline',
    description: 'Compact trend visualization with window controls.',
    icon: '📈',
    category: 'Analytics',
    defaultSize: { x: 360, y: 220 },
    defaultProps: { label: 'Trend', window: '15m', showThreshold: false },
    propertySchema: [
      { key: 'label', label: 'Label', type: 'string', default: 'Trend' },
      { key: 'window', label: 'Window', type: 'string', default: '15m' },
      { key: 'showThreshold', label: 'Show Threshold', type: 'boolean', default: false },
    ],
    previewProps: { label: 'Trend', window: '15m' },
  },
  {
    id: 'primitive.text.block',
    label: 'Text Block',
    description: 'Static or data-bound text with alignment options.',
    icon: '🔖',
    category: 'Text',
    defaultSize: { x: 220, y: 120 },
    defaultProps: { label: 'Label', text: 'Sample Text', align: 'center' },
    propertySchema: [
      { key: 'text', label: 'Text', type: 'string', default: 'Sample Text' },
      {
        key: 'align',
        label: 'Alignment',
        type: 'option',
        default: 'center',
        options: [
          { label: 'Left', value: 'left' },
          { label: 'Center', value: 'center' },
          { label: 'Right', value: 'right' },
        ],
      },
    ],
    previewProps: { text: 'Hierarchy: Line A', align: 'left' },
  },
  {
    id: 'primitive.form.field',
    label: 'Form Field',
    description: 'Input-style primitive for acknowledging values or setting targets.',
    icon: '📝',
    category: 'Controls',
    defaultSize: { x: 260, y: 160 },
    defaultProps: { label: 'Setpoint', placeholder: 'Enter value', required: false },
    propertySchema: [
      { key: 'label', label: 'Label', type: 'string', default: 'Form Field' },
      { key: 'placeholder', label: 'Placeholder', type: 'string', default: 'Enter value' },
      { key: 'required', label: 'Required', type: 'boolean', default: false },
    ],
    previewProps: { label: 'Target', placeholder: 'Enter new target' },
  },
];

const primitiveMap = Object.fromEntries(
  primitiveCatalog.map((primitive) => [primitive.id, primitive]),
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

const componentLibrary = ref<PaletteTemplate[]>([
  buildTemplate({
    id: 'component-gauge-default',
    primitiveId: 'primitive.gauge.arc',
    label: 'Process Gauge',
    description: 'Dial gauge tuned for live process values.',
    icon: '🧭',
    props: { label: 'Process Value', unit: '%', precision: 1, suffix: '' },
    size: { x: 280, y: 200 },
    source: 'built-in',
  }),
  buildTemplate({
    id: 'component-status-default',
    primitiveId: 'primitive.status.pill',
    label: 'Status Tile',
    description: 'Boolean status pill with customizable labels.',
    icon: '🟢',
    props: { label: 'System Status', trueLabel: 'Active', falseLabel: 'Inactive' },
    size: { x: 240, y: 160 },
    source: 'built-in',
  }),
  buildTemplate({
    id: 'component-trend-default',
    primitiveId: 'primitive.trend.sparkline',
    label: 'Trend Card',
    description: 'Sparkline preview for rolling metrics.',
    icon: '📈',
    props: { label: 'Throughput', window: '30m' },
    size: { x: 360, y: 220 },
    source: 'built-in',
  }),
  buildTemplate({
    id: 'component-label-default',
    primitiveId: 'primitive.text.block',
    label: 'Hierarchy Label',
    description: 'Text block for contextual labeling.',
    icon: '🔖',
    props: { text: 'Line A / Cell 4', align: 'left' },
    size: { x: 240, y: 120 },
    source: 'built-in',
  }),
  buildTemplate({
    id: 'component-form-default',
    primitiveId: 'primitive.form.field',
    label: 'Setpoint Field',
    description: 'Operator input for targets with validation flag.',
    icon: '�',
    props: { label: 'Setpoint', placeholder: 'Enter target' },
    size: { x: 260, y: 160 },
    source: 'built-in',
  }),
]);

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

const history = reactive<{ stack: Array<{ nodes: CanvasNode[]; bindings: Binding[] }>; index: number }>({
  stack: [],
  index: -1,
});
const savedIndex = ref(-1);

const selectedNode = computed(() => nodes.value.find((node) => node.id === selectedNodeId.value) ?? null);
const selectedTemplate = computed(() =>
  selectedNode.value ? templateMap.value[selectedNode.value.componentId] ?? null : null,
);
const canUndo = computed(() => history.index > 0);
const canRedo = computed(() => history.index < history.stack.length - 1);
const dirty = computed(() => history.index !== savedIndex.value);

function generateId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
  return slug.length ? slug : 'component';
}

function ensureTemplateId(label: string): string {
  const slug = slugify(label);
  const existing = new Set(componentLibrary.value.map((item) => item.id));
  let candidate = `component-${slug}`;
  let index = 2;
  while (existing.has(candidate)) {
    candidate = `component-${slug}-${index}`;
    index += 1;
  }
  return candidate;
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

function handleComponentCreated(payload: {
  label: string;
  description: string;
  icon: string;
  primitiveId: string;
  size: Vector2;
  props: Record<string, unknown>;
}) {
  const id = ensureTemplateId(payload.label || 'component');
  const template = buildTemplate({
    id,
    primitiveId: payload.primitiveId,
    label: payload.label,
    description: payload.description,
    icon: payload.icon,
    size: payload.size,
    props: payload.props,
    source: 'custom',
  });
  componentLibrary.value = [...componentLibrary.value, template];
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
      <aside class="faceplate-builder__sidebar">
        <ComponentPalette
          :components="paletteItems"
          @create-request="(id) => handleNodeRequest({ componentId: id, position: { x: 40, y: 40 } })"
        />
        <ComponentComposerPanel
          :primitives="primitiveCatalog"
          @create-component="handleComponentCreated"
        />
      </aside>

      <main class="workspace">
        <BuilderCanvas
          :nodes="nodes"
          :selected-node-id="selectedNodeId"
          :templates="templateMap"
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

        <FaceplatePreview class="workspace__preview" :nodes="nodes" :templates="templateMap" />
      </main>

      <InspectorPanel
        :node="selectedNode"
        :template="selectedTemplate"
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
  grid-template-columns: 300px 1fr 320px;
  gap: 0;
  flex: 1;
  overflow: hidden;
}

.faceplate-builder__sidebar {
  display: flex;
  flex-direction: column;
  background: rgba(4, 12, 18, 0.72);
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(18px);
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
    grid-template-columns: 260px 1fr 300px;
  }
}
</style>
