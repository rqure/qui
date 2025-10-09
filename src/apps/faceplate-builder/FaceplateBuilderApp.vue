<script setup lang="ts">
import { computed, reactive, ref, onMounted, onBeforeUnmount } from 'vue';
import BuilderCanvas from './components/BuilderCanvas.vue';
import ComponentPalette from './components/ComponentPalette.vue';
import InspectorPanel from './components/InspectorPanel.vue';
import BuilderToolbar from './components/BuilderToolbar.vue';
import FaceplateSelector from './components/FaceplateSelector.vue';
import { useDataStore } from '@/stores/data';
import { FaceplateDataService } from './utils/faceplate-data';
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

const DEFAULT_VIEWPORT: Vector2 = { x: 1280, y: 800 };

const primitiveCatalog: PrimitiveDefinition[] = [
  {
    id: 'primitive.text.block',
    label: 'Text Block',
    description: 'Static or data-bound text with alignment and typography controls.',
    icon: '🔖',
    category: 'Text',
    defaultSize: { x: 220, y: 120 },
    defaultProps: {
      text: 'Sample Text',
      align: 'center',
      textColor: '#ffffff',
      fontSize: 20,
      fontWeight: 500,
      fontStyle: 'normal',
      lineHeight: 1.2,
      letterSpacing: 0,
    },
    propertySchema: [
      { key: 'text', label: 'Text', type: 'string', default: 'Sample Text' },
      { key: 'textColor', label: 'Text Color', type: 'string', default: '#ffffff' },
      { key: 'fontSize', label: 'Font Size', type: 'number', default: 20 },
      { key: 'fontWeight', label: 'Font Weight', type: 'number', default: 500 },
      {
        key: 'fontStyle',
        label: 'Font Style',
        type: 'option',
        default: 'normal',
        options: [
          { label: 'Normal', value: 'normal' },
          { label: 'Italic', value: 'italic' },
          { label: 'Oblique', value: 'oblique' },
        ],
      },
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
      { key: 'lineHeight', label: 'Line Height', type: 'number', default: 1.2 },
      { key: 'letterSpacing', label: 'Letter Spacing', type: 'number', default: 0 },
    ],
    previewProps: { text: 'Hierarchy: Line A', align: 'left', textColor: '#ffffff' },
  },
  {
    id: 'primitive.form.field',
    label: 'Text Input',
    description: 'Simple text input field for data entry.',
    icon: '⌨️',
    category: 'Controls',
    defaultSize: { x: 260, y: 80 },
    defaultProps: {
      placeholder: 'Enter text',
      textColor: '#ffffff',
      backgroundColor: 'rgba(0, 0, 0, 0.35)',
      fontSize: 16,
      fontWeight: 500,
      align: 'left',
      visible: true,
    },
    propertySchema: [
      { key: 'placeholder', label: 'Placeholder', type: 'string', default: 'Enter text' },
      { key: 'textColor', label: 'Text Color', type: 'string', default: '#ffffff' },
      { key: 'backgroundColor', label: 'Background', type: 'string', default: 'rgba(0, 0, 0, 0.35)' },
      { key: 'fontSize', label: 'Font Size', type: 'number', default: 16 },
      { key: 'fontWeight', label: 'Font Weight', type: 'number', default: 500 },
      {
        key: 'align',
        label: 'Alignment',
        type: 'option',
        default: 'left',
        options: [
          { label: 'Left', value: 'left' },
          { label: 'Center', value: 'center' },
          { label: 'Right', value: 'right' },
        ],
      },
      { key: 'visible', label: 'Visible', type: 'boolean', default: true },
    ],
    previewProps: { placeholder: 'Enter text' },
  },
  {
    id: 'primitive.form.number',
    label: 'Number Input',
    description: 'Numeric entry with range, precision, and adornment options.',
    icon: '�',
    category: 'Controls',
    defaultSize: { x: 240, y: 80 },
    defaultProps: {
      placeholder: '0',
      min: 0,
      max: 100,
      step: 1,
      suffix: '',
      textColor: '#ffffff',
      backgroundColor: 'rgba(0, 0, 0, 0.35)',
      visible: true,
    },
    propertySchema: [
      { key: 'placeholder', label: 'Placeholder', type: 'string', default: '0' },
      { key: 'min', label: 'Minimum', type: 'number', default: 0 },
      { key: 'max', label: 'Maximum', type: 'number', default: 100 },
      { key: 'step', label: 'Step', type: 'number', default: 1 },
      { key: 'suffix', label: 'Suffix', type: 'string', default: '' },
      { key: 'textColor', label: 'Text Color', type: 'string', default: '#ffffff' },
      { key: 'backgroundColor', label: 'Background', type: 'string', default: 'rgba(0, 0, 0, 0.35)' },
      { key: 'visible', label: 'Visible', type: 'boolean', default: true },
    ],
    previewProps: { placeholder: '42', suffix: '°F' },
  },
  {
    id: 'primitive.form.date',
    label: 'Date Picker',
    description: 'Calendar picker for choosing a date value.',
    icon: '📅',
    category: 'Controls',
    defaultSize: { x: 280, y: 80 },
    defaultProps: {
      placeholder: 'Select date',
      minDate: '',
      maxDate: '',
      displayFormat: 'YYYY-MM-DD',
      visible: true,
    },
    propertySchema: [
      { key: 'placeholder', label: 'Placeholder', type: 'string', default: 'Select date' },
      { key: 'minDate', label: 'Min Date', type: 'string', default: '' },
      { key: 'maxDate', label: 'Max Date', type: 'string', default: '' },
      { key: 'displayFormat', label: 'Display Format', type: 'string', default: 'YYYY-MM-DD' },
      { key: 'visible', label: 'Visible', type: 'boolean', default: true },
    ],
    previewProps: { placeholder: '2025-01-01' },
  },
  {
    id: 'primitive.form.time',
    label: 'Time Picker',
    description: 'Time selector with hour and minute granularity.',
    icon: '⏰',
    category: 'Controls',
    defaultSize: { x: 240, y: 80 },
    defaultProps: {
      placeholder: 'Select time',
      stepMinutes: 5,
      visible: true,
    },
    propertySchema: [
      { key: 'placeholder', label: 'Placeholder', type: 'string', default: 'Select time' },
      { key: 'stepMinutes', label: 'Step (minutes)', type: 'number', default: 5 },
      { key: 'visible', label: 'Visible', type: 'boolean', default: true },
    ],
    previewProps: { placeholder: '14:30' },
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
    defaultSize: { x: 240, y: 80 },
    defaultProps: { 
      placeholder: 'Select option',
      options: 'Option 1,Option 2,Option 3', 
      selectedIndex: 0,
      visible: true
    },
    propertySchema: [
      { key: 'placeholder', label: 'Placeholder', type: 'string', default: 'Select option' },
      { key: 'options', label: 'Options (comma-separated)', type: 'string', default: 'Option 1,Option 2,Option 3' },
      { key: 'selectedIndex', label: 'Selected Index', type: 'number', default: 0 },
      { key: 'visible', label: 'Visible', type: 'boolean', default: true },
    ],
    previewProps: { placeholder: 'Select mode', options: 'Auto,Manual,Off', selectedIndex: 0 },
  },
  {
    id: 'primitive.form.toggle',
    label: 'Toggle Switch',
    description: 'Toggle switch for boolean values.',
    icon: '⏻',
    category: 'Controls',
    defaultSize: { x: 200, y: 80 },
    defaultProps: { 
      checked: false, 
      trueLabel: 'On', 
      falseLabel: 'Off',
      visible: true
    },
    propertySchema: [
      { key: 'checked', label: 'Checked', type: 'boolean', default: false },
      { key: 'trueLabel', label: 'True Label', type: 'string', default: 'On' },
      { key: 'falseLabel', label: 'False Label', type: 'string', default: 'Off' },
      { key: 'visible', label: 'Visible', type: 'boolean', default: true },
    ],
    previewProps: { checked: true, trueLabel: 'Enabled', falseLabel: 'Disabled' },
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
      gap: 12,
      layoutDirection: 'vertical',
      horizontalAlign: 'stretch',
      verticalAlign: 'start',
      opacity: 1,
      visible: true
    },
    propertySchema: [
      { key: 'backgroundColor', label: 'Background Color', type: 'string', default: 'rgba(255, 255, 255, 0.05)' },
      { key: 'borderColor', label: 'Border Color', type: 'string', default: 'rgba(255, 255, 255, 0.2)' },
      { key: 'borderWidth', label: 'Border Width', type: 'number', default: 1 },
      { key: 'padding', label: 'Padding', type: 'number', default: 10 },
      { key: 'gap', label: 'Gap', type: 'number', default: 12 },
      {
        key: 'layoutDirection',
        label: 'Layout Direction',
        type: 'option',
        default: 'vertical',
        options: [
          { label: 'Vertical', value: 'vertical' },
          { label: 'Horizontal', value: 'horizontal' },
        ],
      },
      {
        key: 'horizontalAlign',
        label: 'Horizontal Align',
        type: 'option',
        default: 'stretch',
        options: [
          { label: 'Start', value: 'start' },
          { label: 'Center', value: 'center' },
          { label: 'End', value: 'end' },
          { label: 'Stretch', value: 'stretch' },
        ],
      },
      {
        key: 'verticalAlign',
        label: 'Vertical Align',
        type: 'option',
        default: 'start',
        options: [
          { label: 'Start', value: 'start' },
          { label: 'Center', value: 'center' },
          { label: 'End', value: 'end' },
          { label: 'Stretch', value: 'stretch' },
        ],
      },
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

const componentLibrary = ref<PaletteTemplate[]>(
  primitiveCatalog.map((primitive) =>
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
    x: Math.max(320, Math.round(width)),
    y: Math.max(240, Math.round(height)),
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
  const beforeNodeCount = nodes.value.length;
  nodes.value = nodes.value.filter((node) => !idSet.has(node.id));

  const beforeBindingCount = bindings.value.length;
  bindings.value = bindings.value.filter((binding) => !idSet.has(binding.componentId));

  const nextSelection = new Set(selectedNodeIds.value);
  idSet.forEach((id) => nextSelection.delete(id));
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

function handleKeyDown(event: KeyboardEvent) {
  if (!selectedNodeIds.value.size) {
    return;
  }

  const target = event.target as HTMLElement | null;
  if (target) {
    const tag = target.tagName;
    const isFormField = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
    if (isFormField || target.isContentEditable) {
      return;
    }
  }

  const isDeleteKey = event.key === 'Delete';
  const isBackspace = event.key === 'Backspace' && !event.metaKey && !event.ctrlKey && !event.altKey;
  if (!isDeleteKey && !isBackspace) {
    return;
  }

  event.preventDefault();
  handleDeleteSelectedNodes();
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

async function saveWorkspace() {
  if (isSaving.value) return;
  
  try {
    isSaving.value = true;
    
    // Show selector with new form if new faceplate
    if (!currentFaceplateId.value) {
      showFaceplateSelector.value = true;
      isSaving.value = false;
      return;
    }
    
    // Delete old components before creating new ones
    const existingFaceplate = await faceplateService.readFaceplate(currentFaceplateId.value);
    if (existingFaceplate.components.length > 0) {
      await Promise.all(existingFaceplate.components.map(compId => 
        faceplateService.deleteComponent(compId).catch(() => {
          // Ignore errors if component doesn't exist
        })
      ));
    }
    
    // Build component entities and maintain node ID to component ID mapping
    const componentIds: EntityId[] = [];
    const nodeIdToComponentId = new Map<string, EntityId>();
    
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
      nodeIdToComponentId.set(node.id, componentId);
      
      // Find bindings for this node and map to component ID
      const nodeBindings = bindings.value.filter((b) => b.componentId === node.id);
      const bindingsData = nodeBindings.map((b) => ({
        component: String(componentId),
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
    
    // Build layout configuration using component entity IDs
    const layout = nodes.value.map((node) => {
      const componentId = nodeIdToComponentId.get(node.id);
      if (!componentId) return null;
      return {
        component: String(componentId),
        x: node.position.x,
        y: node.position.y,
        w: node.size.x,
        h: node.size.y,
      };
    }).filter((item): item is NonNullable<typeof item> => item !== null);

    const bindingsData = bindings.value.map((b) => {
      const componentId = nodeIdToComponentId.get(b.componentId);
      if (!componentId) return null;
      return {
        component: String(componentId),
        property: b.property,
        expression: b.expression,
        mode: b.mode ?? 'field',
        transform: b.transform ?? undefined,
        dependencies: b.dependencies?.length ? b.dependencies : undefined,
        description: b.description,
      };
    }).filter((item): item is NonNullable<typeof item> => item !== null);

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
      configuration: { layout, bindings: bindingsData, metadata },
      components: componentIds,
      notificationChannels: currentNotificationChannels.value,
      scriptModules: currentScriptModules.value,
    });
    
    faceplateMetadata.value = metadata;
    markSaved();
    console.log(`Faceplate "${currentFaceplateName.value}" saved successfully!`);
  } catch (error) {
    console.error('Failed to save faceplate:', error);
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
    const faceplate = await faceplateService.readFaceplate(faceplateId);
    currentFaceplateId.value = faceplateId;
    currentFaceplateName.value = faceplate.name;
    currentTargetEntityType.value = faceplate.targetEntityType;
  currentScriptModules.value = faceplate.scriptModules ?? [];
  currentNotificationChannels.value = faceplate.notificationChannels ?? [];
    
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
      mode: b.mode ?? (b.expression?.trim()?.startsWith('script:') ? 'script' : 'field'),
      transform: b.transform ?? null,
      dependencies: Array.isArray(b.dependencies) ? b.dependencies : undefined,
      description: b.description,
    }));

    applyViewportMetadata(faceplate.configuration.metadata as Record<string, unknown> | undefined);
    applySelection([], null);
    
    pushHistory();
    markSaved();
    console.log(`Faceplate "${faceplate.name}" loaded successfully!`);
  } catch (error) {
    console.error('Failed to load faceplate:', error);
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
    console.log('Warning: You have unsaved changes.');
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
    console.log(`New faceplate "${faceplate.name}" ready for editing!`);
  } catch (error) {
    console.error('Failed to initialize new faceplate:', error);
  }
}

// Custom components have been removed from this implementation

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyDown);
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
      const faceplate = await faceplateService.readFaceplate(props.faceplateId);
      currentFaceplateId.value = props.faceplateId;
      currentFaceplateName.value = faceplate.name;
      currentTargetEntityType.value = faceplate.targetEntityType;
  currentScriptModules.value = faceplate.scriptModules ?? [];
  currentNotificationChannels.value = faceplate.notificationChannels ?? [];
      
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
        mode: b.mode ?? (b.expression?.trim()?.startsWith('script:') ? 'script' : 'field'),
        transform: b.transform ?? null,
        dependencies: Array.isArray(b.dependencies) ? b.dependencies : undefined,
        description: b.description,
      }));
      
      applyViewportMetadata(faceplate.configuration.metadata as Record<string, unknown> | undefined);
      applySelection([], null);

      pushHistory();
      markSaved();
    } catch (error) {
      console.error('Failed to load faceplate on mount:', error);
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
            @canvas-clicked="handleCanvasClick"
            @drag-select-complete="handleDragSelectComplete"
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

      <InspectorPanel
        :node="selectedNode"
        :template="selectedTemplate"
        :bindings="selectedNodeBindings"
        @resize="handleResize"
        @prop-updated="handlePropUpdated"
        @binding-create="handleInspectorBindingCreate"
        @binding-update="handleInspectorBindingUpdate"
        @binding-remove="handleInspectorBindingRemove"
        @delete-node="handleInspectorNodeDelete"
        @bring-forward="handleBringForward"
        @send-backward="handleSendBackward"
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
  grid-template-columns: 300px minmax(0, 1fr) 320px;
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
