<script setup lang="ts">
import { computed, reactive, ref, onMounted } from 'vue';
import BuilderCanvas from './components/BuilderCanvas.vue';
import ComponentPalette from './components/ComponentPalette.vue';
import ComponentComposerPanel from './components/ComponentComposerPanel.vue';
import InspectorPanel from './components/InspectorPanel.vue';
import BindingsPanel from './components/BindingsPanel.vue';
import FaceplatePreview from './components/FaceplatePreview.vue';
import BuilderToolbar from './components/BuilderToolbar.vue';
import FaceplatePickerDialog from './components/FaceplatePickerDialog.vue';
import CreateFaceplateDialog from './components/CreateFaceplateDialog.vue';
import CreateCustomComponentDialog from './components/CreateCustomComponentDialog.vue';
import { useDataStore } from '@/stores/data';
import { FaceplateDataService } from './utils/faceplate-data';
import type { EntityId } from '@/core/data/types';
import type {
  Binding,
  CanvasNode,
  PaletteTemplate,
  PrimitiveDefinition,
  PrimitivePropertyDefinition,
  Vector2,
} from './types';

// Props for optional pre-loaded faceplate
const props = defineProps<{
  faceplateId?: EntityId | null;
  entityId?: EntityId | null;
}>();

const dataStore = useDataStore();
const faceplateService = new FaceplateDataService(dataStore);

const primitiveCatalog: PrimitiveDefinition[] = [
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
  {
    id: 'primitive.shape.rectangle',
    label: 'Rectangle',
    description: 'Basic rectangle shape with configurable color and border.',
    icon: '▭',
    category: 'Shapes',
    defaultSize: { x: 200, y: 150 },
    defaultProps: { fillColor: '#00ffaa', borderColor: '#ffffff', borderWidth: 2, opacity: 1, rotation: 0, visible: true },
    propertySchema: [
      { key: 'fillColor', label: 'Fill Color', type: 'string', default: '#00ffaa' },
      { key: 'borderColor', label: 'Border Color', type: 'string', default: '#ffffff' },
      { key: 'borderWidth', label: 'Border Width', type: 'number', default: 2 },
      { key: 'opacity', label: 'Opacity', type: 'number', default: 1 },
      { key: 'rotation', label: 'Rotation (deg)', type: 'number', default: 0 },
      { key: 'visible', label: 'Visible', type: 'boolean', default: true },
    ],
    previewProps: { fillColor: '#00ffaa', borderColor: '#ffffff', borderWidth: 2 },
  },
  {
    id: 'primitive.shape.circle',
    label: 'Circle',
    description: 'Circular shape with configurable color and border.',
    icon: '○',
    category: 'Shapes',
    defaultSize: { x: 150, y: 150 },
    defaultProps: { fillColor: '#00ffaa', borderColor: '#ffffff', borderWidth: 2, opacity: 1, rotation: 0, visible: true },
    propertySchema: [
      { key: 'fillColor', label: 'Fill Color', type: 'string', default: '#00ffaa' },
      { key: 'borderColor', label: 'Border Color', type: 'string', default: '#ffffff' },
      { key: 'borderWidth', label: 'Border Width', type: 'number', default: 2 },
      { key: 'opacity', label: 'Opacity', type: 'number', default: 1 },
      { key: 'rotation', label: 'Rotation (deg)', type: 'number', default: 0 },
      { key: 'visible', label: 'Visible', type: 'boolean', default: true },
    ],
    previewProps: { fillColor: '#0088ff', borderColor: '#ffffff', borderWidth: 2 },
  },
  {
    id: 'primitive.shape.line',
    label: 'Line',
    description: 'Straight line with configurable color and thickness.',
    icon: '─',
    category: 'Shapes',
    defaultSize: { x: 200, y: 50 },
    defaultProps: { strokeColor: '#ffffff', strokeWidth: 3, opacity: 1, rotation: 0, visible: true },
    propertySchema: [
      { key: 'strokeColor', label: 'Color', type: 'string', default: '#ffffff' },
      { key: 'strokeWidth', label: 'Width', type: 'number', default: 3 },
      { key: 'opacity', label: 'Opacity', type: 'number', default: 1 },
      { key: 'rotation', label: 'Rotation (deg)', type: 'number', default: 0 },
      { key: 'visible', label: 'Visible', type: 'boolean', default: true },
    ],
    previewProps: { strokeColor: '#00ffaa', strokeWidth: 3 },
  },
  {
    id: 'primitive.shape.polygon',
    label: 'Polygon',
    description: 'Multi-sided polygon with configurable color and points.',
    icon: '⬡',
    category: 'Shapes',
    defaultSize: { x: 180, y: 180 },
    defaultProps: { 
      fillColor: '#00ffaa', 
      borderColor: '#ffffff', 
      borderWidth: 2, 
      sides: 6, 
      opacity: 1, 
      rotation: 0, 
      visible: true 
    },
    propertySchema: [
      { key: 'fillColor', label: 'Fill Color', type: 'string', default: '#00ffaa' },
      { key: 'borderColor', label: 'Border Color', type: 'string', default: '#ffffff' },
      { key: 'borderWidth', label: 'Border Width', type: 'number', default: 2 },
      { key: 'sides', label: 'Number of Sides', type: 'number', default: 6 },
      { key: 'opacity', label: 'Opacity', type: 'number', default: 1 },
      { key: 'rotation', label: 'Rotation (deg)', type: 'number', default: 0 },
      { key: 'visible', label: 'Visible', type: 'boolean', default: true },
    ],
    previewProps: { fillColor: '#ff8800', borderColor: '#ffffff', borderWidth: 2, sides: 6 },
  },
  {
    id: 'primitive.form.dropdown',
    label: 'Dropdown',
    description: 'Dropdown select field with multiple options.',
    icon: '▼',
    category: 'Controls',
    defaultSize: { x: 240, y: 120 },
    defaultProps: { 
      label: 'Select Option', 
      options: 'Option 1,Option 2,Option 3', 
      selectedIndex: 0,
      visible: true
    },
    propertySchema: [
      { key: 'label', label: 'Label', type: 'string', default: 'Select Option' },
      { key: 'options', label: 'Options (comma-separated)', type: 'string', default: 'Option 1,Option 2,Option 3' },
      { key: 'selectedIndex', label: 'Selected Index', type: 'number', default: 0 },
      { key: 'visible', label: 'Visible', type: 'boolean', default: true },
    ],
    previewProps: { label: 'Mode', options: 'Auto,Manual,Off', selectedIndex: 0 },
  },
  {
    id: 'primitive.form.toggle',
    label: 'Toggle Switch',
    description: 'Toggle switch for boolean values.',
    icon: '⏻',
    category: 'Controls',
    defaultSize: { x: 200, y: 100 },
    defaultProps: { 
      label: 'Toggle', 
      checked: false, 
      trueLabel: 'On', 
      falseLabel: 'Off',
      visible: true
    },
    propertySchema: [
      { key: 'label', label: 'Label', type: 'string', default: 'Toggle' },
      { key: 'checked', label: 'Checked', type: 'boolean', default: false },
      { key: 'trueLabel', label: 'True Label', type: 'string', default: 'On' },
      { key: 'falseLabel', label: 'False Label', type: 'string', default: 'Off' },
      { key: 'visible', label: 'Visible', type: 'boolean', default: true },
    ],
    previewProps: { label: 'Enable', checked: true, trueLabel: 'Enabled', falseLabel: 'Disabled' },
  },
  {
    id: 'primitive.form.button',
    label: 'Button',
    description: 'Clickable button for triggering actions.',
    icon: '🔘',
    category: 'Controls',
    defaultSize: { x: 180, y: 80 },
    defaultProps: { 
      label: 'Click Me', 
      color: '#00ffaa', 
      textColor: '#000000',
      disabled: false,
      visible: true
    },
    propertySchema: [
      { key: 'label', label: 'Button Text', type: 'string', default: 'Click Me' },
      { key: 'color', label: 'Background Color', type: 'string', default: '#00ffaa' },
      { key: 'textColor', label: 'Text Color', type: 'string', default: '#000000' },
      { key: 'disabled', label: 'Disabled', type: 'boolean', default: false },
      { key: 'visible', label: 'Visible', type: 'boolean', default: true },
    ],
    previewProps: { label: 'Submit', color: '#00ffaa', textColor: '#000000' },
  },
  {
    id: 'primitive.image',
    label: 'Image',
    description: 'Display image or icon from URL.',
    icon: '🖼️',
    category: 'Media',
    defaultSize: { x: 200, y: 200 },
    defaultProps: { 
      src: '', 
      alt: 'Image', 
      fit: 'contain',
      opacity: 1,
      rotation: 0,
      visible: true
    },
    propertySchema: [
      { key: 'src', label: 'Image URL', type: 'string', default: '' },
      { key: 'alt', label: 'Alt Text', type: 'string', default: 'Image' },
      { 
        key: 'fit', 
        label: 'Object Fit', 
        type: 'option', 
        default: 'contain',
        options: [
          { label: 'Contain', value: 'contain' },
          { label: 'Cover', value: 'cover' },
          { label: 'Fill', value: 'fill' },
          { label: 'None', value: 'none' },
        ]
      },
      { key: 'opacity', label: 'Opacity', type: 'number', default: 1 },
      { key: 'rotation', label: 'Rotation (deg)', type: 'number', default: 0 },
      { key: 'visible', label: 'Visible', type: 'boolean', default: true },
    ],
    previewProps: { src: '', alt: 'Placeholder', fit: 'contain' },
  },
  {
    id: 'primitive.container',
    label: 'Container',
    description: 'Layout container for grouping other components.',
    icon: '□',
    category: 'Layout',
    defaultSize: { x: 400, y: 300 },
    defaultProps: { 
      backgroundColor: 'rgba(255, 255, 255, 0.05)', 
      borderColor: 'rgba(255, 255, 255, 0.2)', 
      borderWidth: 1,
      padding: 10,
      opacity: 1,
      visible: true
    },
    propertySchema: [
      { key: 'backgroundColor', label: 'Background Color', type: 'string', default: 'rgba(255, 255, 255, 0.05)' },
      { key: 'borderColor', label: 'Border Color', type: 'string', default: 'rgba(255, 255, 255, 0.2)' },
      { key: 'borderWidth', label: 'Border Width', type: 'number', default: 1 },
      { key: 'padding', label: 'Padding', type: 'number', default: 10 },
      { key: 'opacity', label: 'Opacity', type: 'number', default: 1 },
      { key: 'visible', label: 'Visible', type: 'boolean', default: true },
    ],
    previewProps: { backgroundColor: 'rgba(0, 255, 170, 0.1)', borderColor: '#00ffaa', borderWidth: 2 },
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
    icon: '📝',
    props: { label: 'Setpoint', placeholder: 'Enter target' },
    size: { x: 260, y: 160 },
    source: 'built-in',
  }),
  // Shapes
  buildTemplate({
    id: 'component-rect-default',
    primitiveId: 'primitive.shape.rectangle',
    label: 'Rectangle',
    description: 'Basic rectangle shape for visual structure.',
    icon: '▭',
    props: { fillColor: '#00ffaa', borderColor: '#ffffff', borderWidth: 2 },
    size: { x: 200, y: 150 },
    source: 'built-in',
  }),
  buildTemplate({
    id: 'component-circle-default',
    primitiveId: 'primitive.shape.circle',
    label: 'Circle',
    description: 'Circular shape for indicators or decorative elements.',
    icon: '○',
    props: { fillColor: '#0088ff', borderColor: '#ffffff', borderWidth: 2 },
    size: { x: 150, y: 150 },
    source: 'built-in',
  }),
  buildTemplate({
    id: 'component-line-default',
    primitiveId: 'primitive.shape.line',
    label: 'Line',
    description: 'Horizontal or vertical divider line.',
    icon: '─',
    props: { strokeColor: '#00ffaa', strokeWidth: 3 },
    size: { x: 200, y: 50 },
    source: 'built-in',
  }),
  buildTemplate({
    id: 'component-polygon-default',
    primitiveId: 'primitive.shape.polygon',
    label: 'Polygon',
    description: 'Multi-sided polygon shape (hexagon by default).',
    icon: '⬡',
    props: { fillColor: '#ff8800', borderColor: '#ffffff', borderWidth: 2, sides: 6 },
    size: { x: 180, y: 180 },
    source: 'built-in',
  }),
  // Form Controls
  buildTemplate({
    id: 'component-dropdown-default',
    primitiveId: 'primitive.form.dropdown',
    label: 'Dropdown Menu',
    description: 'Select from multiple options.',
    icon: '▼',
    props: { label: 'Mode Select', options: 'Auto,Manual,Off', selectedIndex: 0 },
    size: { x: 240, y: 120 },
    source: 'built-in',
  }),
  buildTemplate({
    id: 'component-toggle-default',
    primitiveId: 'primitive.form.toggle',
    label: 'Toggle Switch',
    description: 'On/off toggle for boolean control.',
    icon: '⏻',
    props: { label: 'Enable', checked: false, trueLabel: 'On', falseLabel: 'Off' },
    size: { x: 200, y: 100 },
    source: 'built-in',
  }),
  buildTemplate({
    id: 'component-button-default',
    primitiveId: 'primitive.form.button',
    label: 'Action Button',
    description: 'Clickable button for operator actions.',
    icon: '🔘',
    props: { label: 'Execute', color: '#00ffaa', textColor: '#000000' },
    size: { x: 180, y: 80 },
    source: 'built-in',
  }),
  // Media and Layout
  buildTemplate({
    id: 'component-image-default',
    primitiveId: 'primitive.image',
    label: 'Image',
    description: 'Display image or icon from URL.',
    icon: '🖼️',
    props: { src: '', alt: 'Image', fit: 'contain' },
    size: { x: 200, y: 200 },
    source: 'built-in',
  }),
  buildTemplate({
    id: 'component-container-default',
    primitiveId: 'primitive.container',
    label: 'Container',
    description: 'Group and organize other components.',
    icon: '□',
    props: { backgroundColor: 'rgba(0, 255, 170, 0.1)', borderColor: '#00ffaa', borderWidth: 2 },
    size: { x: 400, y: 300 },
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
const selectedNodeIds = ref<Set<string>>(new Set()); // Multi-selection support
const currentFaceplateId = ref<EntityId | null>(props.faceplateId ?? null);
const currentFaceplateName = ref<string>('');
const currentTargetEntityType = ref<string>('');
const isSaving = ref(false);
const showPickerDialog = ref(false);
const showCreateDialog = ref(false);
const showCreateCustomComponentDialog = ref(false);

const history = reactive<{ stack: Array<{ nodes: CanvasNode[]; bindings: Binding[] }>; index: number }>({
  stack: [],
  index: -1,
});
const savedIndex = ref(-1);

const selectedNode = computed(() => nodes.value.find((node) => node.id === selectedNodeId.value) ?? null);
const selectedTemplate = computed(() =>
  selectedNode.value ? templateMap.value[selectedNode.value.componentId] ?? null : null,
);
const selectedNodes = computed(() => nodes.value.filter((node) => selectedNodeIds.value.has(node.id)));
const hasMultipleSelected = computed(() => selectedNodeIds.value.size > 1);
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
  currentFaceplateId.value = null;
  currentFaceplateName.value = '';
  currentTargetEntityType.value = '';
  pushHistory();
  markSaved();
}

async function saveWorkspace() {
  if (isSaving.value) return;
  
  try {
    isSaving.value = true;
    
    // Show create dialog if new faceplate
    if (!currentFaceplateId.value) {
      showCreateDialog.value = true;
      isSaving.value = false;
      return;
    }
    
    // Build component entities
    const componentIds: EntityId[] = [];
    for (const node of nodes.value) {
      const template = templateMap.value[node.componentId];
      if (!template) continue;
      
      // Create or update component
      const componentId = await faceplateService.createComponent(
        currentFaceplateId.value,
        node.name,
        template.primitiveId
      );
      componentIds.push(componentId);
      
      // Find bindings for this node
      const nodeBindings = bindings.value.filter((b) => b.componentId === node.id);
      const bindingsData = nodeBindings.map((b) => ({
        component: node.id,
        property: b.property,
        expression: b.expression,
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
    
    // Build layout configuration
    const layout = nodes.value.map((node) => ({
      component: node.id,
      x: node.position.x,
      y: node.position.y,
      w: node.size.x,
      h: node.size.y,
    }));
    
    const bindingsData = bindings.value.map((b) => ({
      component: b.componentId,
      property: b.property,
      expression: b.expression,
    }));
    
    // Save faceplate configuration
    await faceplateService.writeFaceplate({
      id: currentFaceplateId.value,
      name: currentFaceplateName.value,
      targetEntityType: currentTargetEntityType.value,
      configuration: { layout, bindings: bindingsData },
      configurationRaw: JSON.stringify({ layout, bindings: bindingsData }),
      bindings: bindingsData,
      bindingsRaw: JSON.stringify(bindingsData),
      components: componentIds,
      notificationChannels: [],
      notificationChannelsRaw: '[]',
    });
    
    markSaved();
    alert(`Faceplate "${currentFaceplateName.value}" saved successfully!`);
  } catch (error) {
    console.error('Failed to save faceplate:', error);
    alert(`Failed to save faceplate: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    isSaving.value = false;
  }
}

async function loadWorkspace() {
  showPickerDialog.value = true;
}

async function handlePickerSelect(faceplateId: EntityId) {
  showPickerDialog.value = false;
  
  try {
    const faceplate = await faceplateService.readFaceplate(faceplateId);
    currentFaceplateId.value = faceplateId;
    currentFaceplateName.value = faceplate.name;
    currentTargetEntityType.value = faceplate.targetEntityType;
    
    // Load components
    const components = await faceplateService.readComponents(faceplate.components);
    
    // Convert to canvas nodes
    nodes.value = faceplate.configuration.layout.map((layoutItem) => {
      const component = components.find((c) => c.id.toString() === layoutItem.component);
      if (!component) return null;
      
      return {
        id: layoutItem.component,
        componentId: findTemplateForPrimitive(component.componentType),
        name: component.name,
        position: { x: layoutItem.x, y: layoutItem.y },
        size: { x: layoutItem.w || 4, y: layoutItem.h || 3 },
        props: component.configuration,
      };
    }).filter((n): n is CanvasNode => n !== null);
    
    // Convert bindings
    bindings.value = faceplate.configuration.bindings.map((b, idx) => ({
      id: `binding-${idx}`,
      componentId: b.component,
      componentName: nodes.value.find((n) => n.id === b.component)?.name || 'Unknown',
      property: b.property,
      expression: b.expression,
    }));
    
    pushHistory();
    markSaved();
    alert(`Faceplate "${faceplate.name}" loaded successfully!`);
  } catch (error) {
    console.error('Failed to load faceplate:', error);
    alert(`Failed to load faceplate: ${error instanceof Error ? error.message : String(error)}`);
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
    if (!confirm('You have unsaved changes. Create a new faceplate anyway?')) {
      return;
    }
  }
  resetWorkspace();
}

function handlePickerCancel() {
  showPickerDialog.value = false;
}

function handlePickerCreate() {
  showPickerDialog.value = false;
  showCreateDialog.value = true;
}

async function handleCreateFaceplate(data: { name: string; targetEntityType: string }) {
  showCreateDialog.value = false;
  
  try {
    // Create faceplate entity - use root as parent for now
    const rootId = 1; // QOS root entity ID
    const faceplateId = await faceplateService.createFaceplate(rootId, data.name, data.targetEntityType);
    
    currentFaceplateId.value = faceplateId;
    currentFaceplateName.value = data.name;
    currentTargetEntityType.value = data.targetEntityType;
    
    // Mark as dirty since we've set metadata but haven't saved components yet
    pushHistory();
    
    alert(`Faceplate "${data.name}" created! Add components and save to persist.`);
  } catch (error) {
    console.error('Failed to create faceplate:', error);
    alert(`Failed to create faceplate: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function handleCreateCancel() {
  showCreateDialog.value = false;
}

// Custom Component Functions
async function loadCustomComponents() {
  try {
    const customComponents = await faceplateService.listCustomComponents();
    
    for (const cc of customComponents) {
      const def = JSON.parse(cc.definition) as import('./types').CustomComponentDefinition;
      
      // Create a template for this custom component
      const template: PaletteTemplate = {
        id: `custom-${cc.id}`,
        label: def.name,
        description: def.description,
        icon: def.icon,
        primitiveId: 'custom.composite', // Special marker for custom components
        defaults: {
          size: def.size,
          props: {}, // Custom components don't have editable props at the top level
        },
        propertySchema: [],
        source: 'custom',
        customComponentId: cc.id.toString(),
      };
      
      // Add to component library if not already there
      const existingIndex = componentLibrary.value.findIndex((t) => t.id === template.id);
      if (existingIndex >= 0) {
        componentLibrary.value[existingIndex] = template;
      } else {
        componentLibrary.value.push(template);
      }
    }
  } catch (error) {
    console.error('Failed to load custom components:', error);
  }
}

async function handleCreateCustomComponent() {
  const selected = selectedNodes.value;
  if (selected.length === 0) {
    alert('Please select one or more components to create a custom component');
    return;
  }
  
  showCreateCustomComponentDialog.value = true;
}

async function handleSaveCustomComponent(data: { name: string; description: string; icon: string }) {
  const selected = selectedNodes.value;
  if (selected.length === 0) {
    return;
  }
  
  try {
    // Calculate bounding box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const node of selected) {
      minX = Math.min(minX, node.position.x);
      minY = Math.min(minY, node.position.y);
      maxX = Math.max(maxX, node.position.x + node.size.x);
      maxY = Math.max(maxY, node.position.y + node.size.y);
    }
    
    const width = maxX - minX;
    const height = maxY - minY;
    
    // Build custom component definition
    const definition: import('./types').CustomComponentDefinition = {
      id: '', // Will be set by data store
      name: data.name,
      description: data.description,
      icon: data.icon,
      children: selected.map((node) => {
        const template = templateMap.value[node.componentId];
        return {
          primitiveId: template?.primitiveId || node.componentId,
          position: {
            x: node.position.x - minX,
            y: node.position.y - minY,
          },
          size: node.size,
          props: node.props,
        };
      }),
      bindings: bindings.value
        .filter((b) => selected.some((n) => n.id === b.componentId))
        .map((b) => {
          const childIndex = selected.findIndex((n) => n.id === b.componentId);
          return {
            childIndex,
            property: b.property,
            expression: b.expression,
          };
        }),
      size: { x: width, y: height },
    };
    
    // Save to data store - use root as parent for now
    const rootId = 1;
    const componentId = await faceplateService.createCustomComponent(rootId, data.name, JSON.stringify(definition));
    
    definition.id = componentId.toString();
    
    // Add to component library
    const template: PaletteTemplate = {
      id: `custom-${componentId}`,
      label: data.name,
      description: data.description,
      icon: data.icon,
      primitiveId: 'custom.composite',
      defaults: {
        size: { x: width, y: height },
        props: {},
      },
      propertySchema: [],
      source: 'custom',
      customComponentId: componentId.toString(),
    };
    
    componentLibrary.value.push(template);
    
    showCreateCustomComponentDialog.value = false;
    alert(`Custom component "${data.name}" created successfully!`);
    
    // Deselect all nodes
    selectedNodeIds.value.clear();
    selectedNodeId.value = null;
    
  } catch (error) {
    console.error('Failed to create custom component:', error);
    alert(`Failed to create custom component: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function handleCancelCustomComponent() {
  showCreateCustomComponentDialog.value = false;
}

// Initialize with an empty baseline state.
onMounted(async () => {
  // Load custom components from data store
  await loadCustomComponents();
  
  if (!history.stack.length) {
    pushHistory();
    markSaved();
  }
  
  // If a faceplate ID was provided, load it
  if (props.faceplateId) {
    try {
      const faceplate = await faceplateService.readFaceplate(props.faceplateId);
      currentFaceplateId.value = props.faceplateId;
      currentFaceplateName.value = faceplate.name;
      currentTargetEntityType.value = faceplate.targetEntityType;
      
      // Load components
      const components = await faceplateService.readComponents(faceplate.components);
      
      // Convert to canvas nodes
      nodes.value = faceplate.configuration.layout.map((layoutItem) => {
        const component = components.find((c) => c.id.toString() === layoutItem.component);
        if (!component) return null;
        
        return {
          id: layoutItem.component,
          componentId: findTemplateForPrimitive(component.componentType),
          name: component.name,
          position: { x: layoutItem.x, y: layoutItem.y },
          size: { x: layoutItem.w || 4, y: layoutItem.h || 3 },
          props: component.configuration,
        };
      }).filter((n): n is CanvasNode => n !== null);
      
      // Convert bindings
      bindings.value = faceplate.configuration.bindings.map((b, idx) => ({
        id: `binding-${idx}`,
        componentId: b.component,
        componentName: nodes.value.find((n) => n.id === b.component)?.name || 'Unknown',
        property: b.property,
        expression: b.expression,
      }));
      
      pushHistory();
      markSaved();
    } catch (error) {
      console.error('Failed to load faceplate on mount:', error);
      alert(`Failed to load faceplate: ${error instanceof Error ? error.message : String(error)}`);
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
      :has-multiple-selected="hasMultipleSelected"
      :faceplate-id="currentFaceplateId ? String(currentFaceplateId) : null"
      :faceplate-name="currentFaceplateName"
      @undo="undo"
      @redo="redo"
      @reset="resetWorkspace"
      @save="saveWorkspace"
      @new="newWorkspace"
      @load="loadWorkspace"
      @create-custom="handleCreateCustomComponent"
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

    <FaceplatePickerDialog
      v-if="showPickerDialog"
      mode="load"
      @select="handlePickerSelect"
      @cancel="handlePickerCancel"
      @create="handlePickerCreate"
    />

    <CreateFaceplateDialog
      v-if="showCreateDialog"
      @create="handleCreateFaceplate"
      @cancel="handleCreateCancel"
    />

    <CreateCustomComponentDialog
      v-if="showCreateCustomComponentDialog"
      @create="handleSaveCustomComponent"
      @cancel="handleCancelCustomComponent"
    />
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
