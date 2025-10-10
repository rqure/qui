<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue';
import ColorPicker from './ColorPicker.vue';
import type {
  Binding,
  BindingMode,
  CanvasNode,
  PaletteTemplate,
  PrimitivePropertyDefinition,
  EventHandler,
  EventTrigger,
  EventAction,
} from '../types';

type BindingDraftPayload = {
  nodeId: string;
  property: string;
  mode: BindingMode;
  expression: string;
  transform: string | null;
  dependencies: string[];
  description?: string;
};

const props = defineProps<{
  node: CanvasNode | null;
  template: PaletteTemplate | null;
  bindings: Binding[];
  allNodes?: CanvasNode[];
  allContainers?: CanvasNode[];
  containerChildren?: CanvasNode[];
  isContainer?: boolean;
  selectedCount?: number;
}>();

const emit = defineEmits<{
  (event: 'resize', payload: { nodeId: string; size: { x: number; y: number } }): void;
  (event: 'prop-updated', payload: { nodeId: string; key: string; value: unknown }): void;
  (event: 'binding-create', payload: BindingDraftPayload): void;
  (event: 'binding-update', payload: BindingDraftPayload): void;
  (event: 'binding-remove', payload: { nodeId: string; property: string }): void;
  (event: 'delete-node', payload: { nodeId: string }): void;
  (event: 'bring-forward', payload: { nodeId: string }): void;
  (event: 'send-backward', payload: { nodeId: string }): void;
  (event: 'add-to-container', payload: { nodeIds: string[]; containerId: string }): void;
  (event: 'remove-from-container', payload: { nodeIds: string[] }): void;
  (event: 'clear-container', payload: { containerId: string }): void;
  (event: 'event-handler-create', payload: { nodeId: string; handler: EventHandler }): void;
  (event: 'event-handler-update', payload: { nodeId: string; handler: EventHandler }): void;
  (event: 'event-handler-remove', payload: { nodeId: string; handlerId: string }): void;
  (event: 'toggle-lock', payload: { nodeId: string }): void;
  (event: 'toggle-visibility', payload: { nodeId: string }): void;
  (event: 'group-selected'): void;
  (event: 'ungroup-selected'): void;
}>();

const propertySchema = computed<PrimitivePropertyDefinition[]>(() => {
  if (props.template?.propertySchema?.length) {
    return props.template.propertySchema;
  }
  if (!props.node) return [];
  return Object.keys(props.node.props ?? {}).map((key) => ({
    key,
    label: key,
    type: 'string',
  }));
});

const bindingMap = computed<Record<string, Binding>>(() => {
  const result: Record<string, Binding> = {};
  (props.bindings ?? []).forEach((binding) => {
    result[binding.property] = binding;
  });
  return result;
});

const propertyRows = computed(() =>
  propertySchema.value.map((definition) => ({
    definition,
    binding: bindingMap.value[definition.key],
  })),
);

// Group properties by category
const categorizedProperties = computed(() => {
  const categories: Record<string, typeof propertyRows.value> = {
    'Layout': [],
    'Appearance': [],
    'Typography': [],
    'Animation': [],
    'Behavior': [],
    'Advanced': [],
    'Uncategorized': [],
  };
  
  propertyRows.value.forEach((row) => {
    const category = row.definition.category || 'Uncategorized';
    if (!categories[category]) {
      categories[category] = [];
    }
    categories[category].push(row);
  });
  
  // Filter out empty categories
  return Object.entries(categories).filter(([_, rows]) => rows.length > 0);
});

const expandedCategories = ref<Record<string, boolean>>({
  'Layout': true,
  'Appearance': true,
  'Typography': false,
  'Animation': false,
  'Behavior': false,
  'Advanced': false,
  'Uncategorized': true,
});

function toggleCategory(category: string) {
  expandedCategories.value[category] = !expandedCategories.value[category];
}

// Property search
const propertySearchQuery = ref('');

// Filter properties based on search
const filteredCategorizedProperties = computed(() => {
  if (!propertySearchQuery.value) return categorizedProperties.value;
  
  const query = propertySearchQuery.value.toLowerCase();
  const filtered: typeof categorizedProperties.value = [];
  
  for (const [category, rows] of categorizedProperties.value) {
    const matchingRows = rows.filter((row) =>
      row.definition.label.toLowerCase().includes(query) ||
      row.definition.key.toLowerCase().includes(query) ||
      (row.definition.description || '').toLowerCase().includes(query)
    );
    
    if (matchingRows.length > 0) {
      filtered.push([category, matchingRows]);
    }
  }
  
  return filtered;
});

// Component naming
const componentName = ref('');
const nameError = ref<string | null>(null);

watchEffect(() => {
  if (props.node) {
    componentName.value = props.node.name || props.node.componentId;
  }
});

function validateComponentName(name: string): string | null {
  if (!name.trim()) {
    return 'Name cannot be empty';
  }
  
  if (name.length > 100) {
    return 'Name is too long (max 100 characters)';
  }
  
  // Check for duplicate names
  const isDuplicate = props.allNodes?.some(
    (n) => n.id !== props.node?.id && n.name === name.trim()
  );
  
  if (isDuplicate) {
    return 'Component name must be unique';
  }
  
  return null;
}

function handleNameChange(event: Event) {
  if (!props.node) return;
  
  const input = event.target as HTMLInputElement;
  const newName = input.value.trim();
  
  nameError.value = validateComponentName(newName);
  
  if (!nameError.value) {
    componentName.value = newName;
    emit('prop-updated', { nodeId: props.node.id, key: '__name', value: newName });
  }
}

// Property reset
function handlePropertyReset(definition: PrimitivePropertyDefinition) {
  if (!props.node || props.node.locked) return;
  
  const defaultValue = definition.default ?? null;
  emit('prop-updated', { nodeId: props.node.id, key: definition.key, value: defaultValue });
}

// Property validation
function validateProperty(definition: PrimitivePropertyDefinition, value: unknown): string | null {
  if (definition.type === 'number') {
    const numValue = Number(value);
    
    if (isNaN(numValue)) {
      return 'Must be a valid number';
    }
    
    if (definition.min !== undefined && numValue < definition.min) {
      return `Must be at least ${definition.min}`;
    }
    
    if (definition.max !== undefined && numValue > definition.max) {
      return `Must be at most ${definition.max}`;
    }
  }
  
  if (definition.type === 'color' && typeof value === 'string') {
    // Basic color validation
    const colorPattern = /^(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|[a-zA-Z]+|transparent)$/;
    if (!colorPattern.test(value.trim())) {
      return 'Invalid color format';
    }
  }
  
  return null;
}

const propertyErrors = ref<Record<string, string | null>>({});

const bindingAdvanced = ref<Record<string, boolean>>({});

watchEffect(() => {
  const rows = propertyRows.value;
  const next: Record<string, boolean> = { ...bindingAdvanced.value };
  let changed = false;
  for (const row of rows) {
    if (row.binding && (row.binding.mode ?? 'field') === 'script' && !next[row.definition.key]) {
      next[row.definition.key] = true;
      changed = true;
    }
  }
  const validKeys = new Set(rows.map((row) => row.definition.key));
  for (const key of Object.keys(next)) {
    if (!validKeys.has(key)) {
      delete next[key];
      changed = true;
    }
  }
  if (changed) {
    bindingAdvanced.value = next;
  }
});

function toggleBindingAdvanced(propertyKey: string) {
  bindingAdvanced.value = {
    ...bindingAdvanced.value,
    [propertyKey]: !bindingAdvanced.value[propertyKey],
  };
}

function isBindingAdvancedOpen(propertyKey: string): boolean {
  return Boolean(bindingAdvanced.value[propertyKey]);
}

function defaultExpressionFor(definition: PrimitivePropertyDefinition, mode: BindingMode): string {
  if (mode === 'field') {
    return `Parent->${definition.key}`;
  }
  if (mode === 'literal') {
    if (definition.type === 'number') return '0';
    if (definition.type === 'boolean') return 'true';
    return '""';
  }
  return `return await context.get("Parent->${definition.key}");`;
}

function getDependenciesText(binding: Binding | undefined): string {
  const deps = binding?.dependencies ?? [];
  if (!deps.length) return '';
  return deps.join('\n');
}

function handleBindingCreate(definition: PrimitivePropertyDefinition) {
  if (!props.node) return;
  const expression = defaultExpressionFor(definition, 'field');
  bindingAdvanced.value = {
    ...bindingAdvanced.value,
    [definition.key]: false,
  };
  emit('binding-create', {
    nodeId: props.node.id,
    property: definition.key,
    mode: 'field',
    expression,
    transform: null,
    dependencies: [],
  });
}

function emitBindingUpdate(
  propertyKey: string,
  overrides: Partial<Omit<BindingDraftPayload, 'nodeId' | 'property'>>,
) {
  if (!props.node) return;
  const existing = bindingMap.value[propertyKey];
  if (!existing) return;
  const mode = overrides.mode ?? (existing.mode ?? 'field');
  const expression =
    overrides.expression !== undefined ? overrides.expression : existing.expression;
  const transform =
    overrides.transform !== undefined ? overrides.transform : existing.transform ?? null;
  const dependencies =
    overrides.dependencies !== undefined ? overrides.dependencies : existing.dependencies ?? [];
  const description =
    overrides.description !== undefined ? overrides.description : existing.description;

  emit('binding-update', {
    nodeId: props.node.id,
    property: propertyKey,
    mode,
    expression,
    transform,
    dependencies,
    description: description ?? undefined,
  });
}

function handleBindingModeChange(
  definition: PrimitivePropertyDefinition,
  propertyKey: string,
  mode: BindingMode,
) {
  const existing = bindingMap.value[propertyKey];
  if (!existing) return;
  const nextExpression =
    existing.mode === mode && existing.expression
      ? existing.expression
      : defaultExpressionFor(definition, mode);
  const nextDependencies = mode === 'script' ? existing.dependencies ?? [] : [];
  emitBindingUpdate(propertyKey, {
    mode,
    expression: nextExpression,
    dependencies: nextDependencies,
  });
  bindingAdvanced.value = {
    ...bindingAdvanced.value,
    [propertyKey]: mode === 'script' ? true : Boolean(bindingAdvanced.value[propertyKey]),
  };
}

function handleBindingExpressionInput(propertyKey: string, event: Event) {
  const value = (event.target as HTMLInputElement | HTMLTextAreaElement | null)?.value ?? '';
  emitBindingUpdate(propertyKey, { expression: value });
}

function handleBindingDependenciesInput(propertyKey: string, event: Event) {
  const raw = (event.target as HTMLTextAreaElement | null)?.value ?? '';
  const list = raw
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
  emitBindingUpdate(propertyKey, { dependencies: list });
}

function handleBindingTransformInput(propertyKey: string, event: Event) {
  const value = (event.target as HTMLTextAreaElement | null)?.value ?? '';
  emitBindingUpdate(propertyKey, { transform: value.trim() ? value : null });
}

function handleBindingDescriptionInput(propertyKey: string, event: Event) {
  const value = (event.target as HTMLTextAreaElement | null)?.value ?? '';
  emitBindingUpdate(propertyKey, { description: value.trim() ? value : undefined });
}

function handleBindingRemove(propertyKey: string) {
  if (!props.node) return;
  const next = { ...bindingAdvanced.value };
  delete next[propertyKey];
  bindingAdvanced.value = next;
  emit('binding-remove', { nodeId: props.node.id, property: propertyKey });
}

function handleSizeChange(axis: 'x' | 'y', event: Event) {
  if (!props.node) return;
  const value = Number((event.target as HTMLInputElement | null)?.value ?? 0);
  const next = {
    x: axis === 'x' ? value : props.node.size.x,
    y: axis === 'y' ? value : props.node.size.y,
  };
  emit('resize', { nodeId: props.node.id, size: next });
}

function handlePropInput(definition: PrimitivePropertyDefinition, event: Event) {
  if (!props.node) return;
  if (bindingMap.value[definition.key]) {
    return;
  }
  let value: unknown;
  if (definition.type === 'boolean') {
    value = (event.target as HTMLInputElement | null)?.checked ?? false;
  } else if (definition.type === 'number') {
    const raw = (event.target as HTMLInputElement | null)?.value ?? '0';
    value = Number(raw);
  } else {
    value = (event.target as HTMLInputElement | HTMLTextAreaElement | null)?.value ?? '';
  }
  
  // Validate the value
  const validationError = validateProperty(definition, value);
  propertyErrors.value = {
    ...propertyErrors.value,
    [definition.key]: validationError,
  };
  
  // Only emit if validation passes
  if (!validationError) {
    emit('prop-updated', { nodeId: props.node.id, key: definition.key, value });
  }
}

function handleDeleteClick() {
  if (!props.node) return;
  emit('delete-node', { nodeId: props.node.id });
}

function handleBringForward() {
  if (!props.node) return;
  emit('bring-forward', { nodeId: props.node.id });
}

function handleSendBackward() {
  if (!props.node) return;
  emit('send-backward', { nodeId: props.node.id });
}

function handleParentChange(event: Event) {
  if (!props.node) return;
  const target = event.target as HTMLSelectElement;
  const newParentId = target.value;
  
  if (!newParentId) {
    // Remove from current container
    if (props.node.parentId) {
      emit('remove-from-container', { nodeIds: [props.node.id] });
    }
  } else {
    // Add to new container
    emit('add-to-container', { nodeIds: [props.node.id], containerId: newParentId });
  }
}

// Quick add to container
const quickAddContainerId = ref<string>('');

function handleQuickAddToContainer() {
  if (!props.node || !quickAddContainerId.value) return;
  emit('add-to-container', { nodeIds: [props.node.id], containerId: quickAddContainerId.value });
  quickAddContainerId.value = ''; // Reset selection after adding
}

// Tab Container management
const isTabContainer = computed(() => {
  return props.node?.componentId === 'primitive.container.tabs';
});

const tabs = computed(() => {
  if (!props.node?.props?.tabs || !Array.isArray(props.node.props.tabs)) {
    return [];
  }
  return props.node.props.tabs as Array<{ name: string; id: string }>;
});

function addTab() {
  if (!props.node) return;
  const currentTabs = tabs.value;
  const newTabIndex = currentTabs.length;
  
  // Generate unique tab ID to avoid collisions
  let tabId = `tab-${newTabIndex}`;
  let counter = newTabIndex;
  while (currentTabs.some(tab => tab.id === tabId)) {
    counter++;
    tabId = `tab-${counter}`;
  }
  
  const newTab = {
    name: `Tab ${newTabIndex + 1}`,
    id: tabId,
  };
  emit('prop-updated', {
    nodeId: props.node.id,
    key: 'tabs',
    value: [...currentTabs, newTab],
  });
}

function removeTab(tabId: string) {
  if (!props.node) return;
  const currentTabs = tabs.value;
  const updatedTabs = currentTabs.filter(tab => tab.id !== tabId);
  if (updatedTabs.length === 0) {
    // Don't allow removing all tabs
    return;
  }
  emit('prop-updated', {
    nodeId: props.node.id,
    key: 'tabs',
    value: updatedTabs,
  });
  // If active tab was removed, reset to first tab
  const activeTab = Number(props.node.props?.activeTab ?? 0);
  if (activeTab >= updatedTabs.length) {
    emit('prop-updated', {
      nodeId: props.node.id,
      key: 'activeTab',
      value: 0,
    });
  }
}

function updateTabName(tabId: string, newName: string) {
  if (!props.node) return;
  const currentTabs = tabs.value;
  const updatedTabs = currentTabs.map(tab => 
    tab.id === tabId ? { ...tab, name: newName } : tab
  );
  emit('prop-updated', {
    nodeId: props.node.id,
    key: 'tabs',
    value: updatedTabs,
  });
}

// Event Handler Management
const eventHandlers = computed<EventHandler[]>(() => {
  return props.node?.eventHandlers ?? [];
});

// Determine which events are applicable for this component type
const applicableEvents = computed<EventTrigger[]>(() => {
  if (!props.node) return [];
  const componentId = props.node.componentId;
  
  // Define which events each component type supports
  if (componentId === 'primitive.form.button') {
    return ['onClick'];
  } else if (componentId === 'primitive.form.toggle') {
    return ['onChange', 'onClick'];
  } else if (componentId === 'primitive.form.field' || componentId === 'primitive.form.number') {
    return ['onChange', 'onInput', 'onFocus', 'onBlur', 'onSubmit'];
  }
  
  // Default: only onClick for most components
  return ['onClick'];
});

const isInteractiveComponent = computed(() => {
  if (!props.node) return false;
  const componentId = props.node.componentId;
  return componentId.includes('form.') || componentId.includes('button') || componentId.includes('toggle');
});

// Generate unique ID for event handler
function generateHandlerId(): string {
  return `event-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Create new event handler
function handleEventHandlerCreate(trigger: EventTrigger) {
  if (!props.node) return;
  
  const newHandler: EventHandler = {
    id: generateHandlerId(),
    componentId: props.node.id,
    trigger,
    action: {
      type: 'writeField',
      valueSource: 'component',
      fieldPath: 'Value',
    },
    enabled: true,
  };
  
  emit('event-handler-create', { nodeId: props.node.id, handler: newHandler });
}

// Update event handler
function handleEventHandlerUpdate(handler: EventHandler, updates: Partial<EventHandler>) {
  if (!props.node) return;
  
  const updated: EventHandler = {
    ...handler,
    ...updates,
  };
  
  emit('event-handler-update', { nodeId: props.node.id, handler: updated });
}

// Remove event handler
function handleEventHandlerRemove(handlerId: string) {
  if (!props.node) return;
  emit('event-handler-remove', { nodeId: props.node.id, handlerId });
}

// Get user-friendly label for event trigger
function getEventTriggerLabel(trigger: EventTrigger): string {
  const labels: Record<EventTrigger, string> = {
    onClick: 'Click',
    onChange: 'Change',
    onInput: 'Input',
    onSubmit: 'Submit',
    onFocus: 'Focus',
    onBlur: 'Blur',
  };
  return labels[trigger] || trigger;
}

// Get user-friendly label for action type
function getActionTypeLabel(actionType: string): string {
  const labels: Record<string, string> = {
    writeField: 'Write Field',
    script: 'Run Script',
    navigate: 'Navigate',
  };
  return labels[actionType] || actionType;
}

// Event handler action type change
function handleActionTypeChange(handler: EventHandler, newType: 'writeField' | 'script' | 'navigate') {
  let newAction: EventAction;
  
  if (newType === 'writeField') {
    newAction = {
      type: 'writeField',
      valueSource: 'component',
      fieldPath: 'Value',
    };
  } else if (newType === 'script') {
    newAction = {
      type: 'script',
      code: '// Access component value via event parameter\n// context.set("FieldPath", value);\nconsole.log("Event triggered");',
      dependencies: [],
    };
  } else {
    newAction = {
      type: 'navigate',
      targetFaceplate: '',
    };
  }
  
  handleEventHandlerUpdate(handler, { action: newAction });
}

// Update writeField action properties
function handleWriteFieldUpdate(handler: EventHandler, key: string, value: string) {
  if (handler.action.type !== 'writeField') return;
  
  const updatedAction = {
    ...handler.action,
    [key]: value,
  };
  
  handleEventHandlerUpdate(handler, { action: updatedAction });
}

// Update script action code
function handleScriptUpdate(handler: EventHandler, code: string) {
  if (handler.action.type !== 'script') return;
  
  const updatedAction = {
    ...handler.action,
    code,
  };
  
  handleEventHandlerUpdate(handler, { action: updatedAction });
}
</script>

<template>
  <aside class="inspector">
    <header class="inspector__header">
      <div>
        <h2>Inspector</h2>
        <p v-if="node">
          {{ template?.label ?? node.componentId }}<span v-if="template?.source === 'custom'" class="inspector__badge">custom</span>
        </p>
      </div>
    </header>

    <div v-if="!node && (!selectedCount || selectedCount <= 1)" class="inspector__empty">Select a component to edit its properties.</div>

    <!-- Multi-selection actions -->
    <div v-else-if="!node && selectedCount && selectedCount >= 2" class="inspector__content">
      <section class="inspector__section">
        <header><h3>Multi-Selection ({{ selectedCount }} items)</h3></header>
        <div class="inspector__actions">
          <button 
            type="button" 
            class="inspector__primary" 
            @click="emit('group-selected')"
            title="Group selected components into a container (Cmd/Ctrl + G)"
          >
            📦 Group Selection
          </button>
        </div>
        <p class="inspector__hint">
          Group the selected components into a container for easier organization and layout management.
        </p>
      </section>
    </div>

    <form v-else class="inspector__content" @submit.prevent>
      <section class="inspector__section">
        <header><h3>General</h3></header>
        <div class="inspector__grid">
          <label class="inspector__field">
            <span>Width (px)</span>
            <input type="number" min="10" step="5" :value="node.size.x" @input="handleSizeChange('x', $event)" :disabled="node.locked" />
          </label>
          <label class="inspector__field">
            <span>Height (px)</span>
            <input type="number" min="10" step="5" :value="node.size.y" @input="handleSizeChange('y', $event)" :disabled="node.locked" />
          </label>
        </div>
        <div class="inspector__actions">
          <button 
            type="button" 
            :class="['inspector__secondary', { 'inspector__lock-active': node.locked }]"
            @click="emit('toggle-lock', { nodeId: node.id })"
            :title="node.locked ? 'Unlock component' : 'Lock component'"
          >
            {{ node.locked ? '🔒 Locked' : '🔓 Unlocked' }}
          </button>
          <button 
            type="button" 
            :class="['inspector__secondary', { 'inspector__visibility-hidden': node.hidden }]"
            @click="emit('toggle-visibility', { nodeId: node.id })"
            :title="node.hidden ? 'Show component in builder' : 'Hide component in builder (still renders at runtime)'"
          >
            {{ node.hidden ? '👁️ Hidden' : '👁️ Visible' }}
          </button>
        </div>
        <div class="inspector__actions">
          <button type="button" class="inspector__secondary" @click="handleBringForward" :disabled="node.locked">Bring Forward</button>
          <button type="button" class="inspector__secondary" @click="handleSendBackward" :disabled="node.locked">Send Backward</button>
        </div>
        <div class="inspector__actions" v-if="isContainer">
          <button 
            type="button" 
            class="inspector__secondary" 
            @click="emit('ungroup-selected')"
            :disabled="node.locked || !containerChildren || containerChildren.length === 0"
            title="Extract children from container (Cmd/Ctrl + Shift + G)"
          >
            📦 Ungroup
          </button>
        </div>
        <button type="button" class="inspector__danger" @click="handleDeleteClick" :disabled="node.locked">Delete Component</button>
      </section>

      <!-- Quick Add to Container Section (shown when not in a container and containers exist) -->
      <section v-if="!node.parentId && allContainers && allContainers.length > 0" class="inspector__section">
        <header><h3>Quick Actions</h3></header>
        <div class="quick-actions">
          <label class="inspector__field">
            <span>Add to Container</span>
            <select 
              v-model="quickAddContainerId"
              class="inspector__select"
            >
              <option value="">Select a container...</option>
              <option 
                v-for="container in allContainers" 
                :key="container.id" 
                :value="container.id"
                :disabled="container.id === node.id"
              >
                {{ container.name }}
              </option>
            </select>
          </label>
          <button 
            type="button" 
            class="inspector__primary"
            :disabled="!quickAddContainerId"
            @click="handleQuickAddToContainer"
          >
            Add to Container
          </button>
        </div>
      </section>

      <!-- Container Hierarchy Section -->
      <section v-if="allContainers && allContainers.length > 0" class="inspector__section">
        <header><h3>Container Hierarchy</h3></header>
        
        <!-- Parent Container -->
        <div class="container-section">
          <label class="inspector__field">
            <span>Parent Container</span>
            <select 
              :value="node.parentId || ''"
              @change="handleParentChange($event)"
            >
              <option value="">None (Root Level)</option>
              <option 
                v-for="container in allContainers" 
                :key="container.id" 
                :value="container.id"
                :disabled="container.id === node.id"
              >
                {{ container.name }}
              </option>
            </select>
          </label>
          <button 
            v-if="node.parentId" 
            type="button" 
            class="inspector__secondary"
            @click="emit('remove-from-container', { nodeIds: [node.id] })"
          >
            Remove from Container
          </button>
        </div>

        <!-- Children (if this is a container) -->
        <div v-if="isContainer" class="container-section">
          <div class="container-section__header">
            <span class="container-section__label">Children ({{ containerChildren?.length || 0 }})</span>
            <button 
              v-if="containerChildren && containerChildren.length > 0"
              type="button" 
              class="inspector__danger-link"
              @click="emit('clear-container', { containerId: node.id })"
            >
              Clear All
            </button>
          </div>
          <div v-if="containerChildren && containerChildren.length > 0" class="container-children">
            <div 
              v-for="child in containerChildren" 
              :key="child.id" 
              class="container-child"
            >
              <span class="container-child__name">{{ child.name }}</span>
              <button 
                type="button" 
                class="container-child__remove"
                @click="emit('remove-from-container', { nodeIds: [child.id] })"
                title="Remove from container"
              >
                ×
              </button>
            </div>
          </div>
          <p v-else class="inspector__hint">
            No children yet. Drag components over this container or use "Add to Container" from another component's menu.
          </p>
        </div>
      </section>

      <!-- Tab Management Section (for TabContainer only) -->
      <section v-if="isTabContainer" class="inspector__section">
        <header>
          <h3>Tab Management</h3>
        </header>
        
        <div class="tab-management">
          <div class="tab-management__header">
            <span class="container-section__label">Tabs ({{ tabs.length }})</span>
            <button 
              type="button" 
              class="inspector__secondary"
              @click="addTab"
            >
              Add Tab
            </button>
          </div>
          
          <div v-if="tabs.length > 0" class="tab-list">
            <div 
              v-for="(tab, index) in tabs" 
              :key="tab.id" 
              class="tab-item"
            >
              <span class="tab-item__index">{{ index }}</span>
              <input 
                type="text" 
                class="tab-item__input"
                :value="tab.name"
                @input="updateTabName(tab.id, ($event.target as HTMLInputElement).value)"
                placeholder="Tab name"
              />
              <button 
                v-if="tabs.length > 1"
                type="button" 
                class="tab-item__remove"
                @click="removeTab(tab.id)"
                title="Remove tab"
              >
                ×
              </button>
            </div>
          </div>
          
          <p class="inspector__hint">
            Each tab can have its own set of child components. Assign children to specific tabs using the component's tabId property.
          </p>
        </div>
      </section>

      <section class="inspector__section">
        <header>
          <h3>Properties</h3>
        </header>
        
        <!-- Component Naming -->
        <div v-if="node" class="inspector__field inspector__field--name">
          <label>
            <span>Component Name</span>
            <input
              type="text"
              :value="componentName"
              @input="handleNameChange"
              :class="{ 'input-error': nameError }"
              placeholder="Enter unique name..."
              maxlength="100"
            />
            <small v-if="nameError" class="error-message">{{ nameError }}</small>
            <small v-else class="binding-help">Unique identifier for this component instance</small>
          </label>
        </div>
        
        <!-- Property Search -->
        <div v-if="propertySchema.length > 10" class="property-search">
          <input
            v-model="propertySearchQuery"
            type="text"
            class="property-search__input"
            placeholder="🔍 Search properties..."
          />
        </div>
        
        <p v-if="!propertySchema.length" class="inspector__hint">This component has no configurable properties yet.</p>
        <div v-else class="inspector__list">
          <!-- Property Categories -->
          <div v-for="[categoryName, categoryRows] in filteredCategorizedProperties" :key="categoryName" class="property-category">
            <button 
              type="button" 
              class="property-category__header"
              @click="toggleCategory(categoryName)"
            >
              <span class="property-category__icon">{{ expandedCategories[categoryName] ? '▼' : '▶' }}</span>
              <span class="property-category__name">{{ categoryName }}</span>
              <span class="property-category__count">({{ categoryRows.length }})</span>
            </button>
            <div v-show="expandedCategories[categoryName]" class="property-category__content">
              <div v-for="row in categoryRows" :key="row.definition.key" class="property-card">
            <header class="property-card__header">
              <div class="property-card__titles">
                <span class="property-card__label">
                  {{ row.definition.label }}
                  <span v-if="row.binding" 
                    :class="['binding-badge', `binding-badge--${row.binding.mode ?? 'field'}`]"
                    :title="`Binding mode: ${row.binding.mode ?? 'field'}`"
                  >
                    {{ row.binding.mode === 'field' ? '📖' : row.binding.mode === 'twoWay' ? '🔄' : row.binding.mode === 'literal' ? '📝' : '⚡' }}
                    {{ row.binding.mode ?? 'field' }}
                  </span>
                </span>
              </div>
              <div class="property-card__actions">
                <button
                  v-if="!row.binding && node?.props?.[row.definition.key] !== row.definition.default"
                  type="button"
                  class="property-card__reset"
                  @click="handlePropertyReset(row.definition)"
                  :disabled="node?.locked"
                  title="Reset to default value"
                >
                  ↺
                </button>
                <button
                  type="button"
                  class="property-card__action"
                  @click="row.binding ? handleBindingRemove(row.definition.key) : handleBindingCreate(row.definition)"
                >
                  {{ row.binding ? 'Remove Binding' : 'Add Binding' }}
                </button>
              </div>
            </header>

            <div class="property-card__body">
              <div class="property-card__control">
                <template v-if="row.definition.type === 'boolean'">
                  <input
                    type="checkbox"
                    :checked="Boolean(node?.props?.[row.definition.key])"
                    :disabled="Boolean(row.binding)"
                    @change="handlePropInput(row.definition, $event)"
                  />
                </template>
                <template v-else-if="row.definition.type === 'number'">
                  <div class="number-input-group">
                    <!-- Show slider if min and max are defined -->
                    <input
                      v-if="row.definition.min !== undefined && row.definition.max !== undefined"
                      type="range"
                      class="number-slider"
                      :value="Number(node?.props?.[row.definition.key] ?? row.definition.default ?? 0)"
                      :min="row.definition.min"
                      :max="row.definition.max"
                      :step="row.definition.step ?? 1"
                      :disabled="Boolean(row.binding)"
                      @input="handlePropInput(row.definition, $event)"
                    />
                    <input
                      type="number"
                      class="number-input"
                      :class="{ 'input-error': propertyErrors[row.definition.key] }"
                      :value="Number(node?.props?.[row.definition.key] ?? row.definition.default ?? 0)"
                      :min="row.definition.min"
                      :max="row.definition.max"
                      :step="row.definition.step ?? 1"
                      :disabled="Boolean(row.binding)"
                      @input="handlePropInput(row.definition, $event)"
                    />
                  </div>
                  <small v-if="propertyErrors[row.definition.key]" class="error-message">{{ propertyErrors[row.definition.key] }}</small>
                </template>
                <template v-else-if="row.definition.type === 'option'">
                  <select
                    :value="String(node?.props?.[row.definition.key] ?? row.definition.default ?? '')"
                    :disabled="Boolean(row.binding)"
                    @change="handlePropInput(row.definition, $event)"
                  >
                    <option v-for="option in row.definition.options || []" :key="option.value" :value="option.value">
                      {{ option.label }}
                    </option>
                  </select>
                </template>
                <template v-else-if="row.definition.type === 'color'">
                  <ColorPicker
                    :model-value="String(node?.props?.[row.definition.key] ?? row.definition.default ?? '#ffffff')"
                    :disabled="Boolean(row.binding)"
                    @update:model-value="(value) => handlePropInput(row.definition, { target: { value } } as any)"
                  />
                </template>
                <template v-else>
                  <input
                    type="text"
                    :value="String(node?.props?.[row.definition.key] ?? '')"
                    :disabled="Boolean(row.binding)"
                    @input="handlePropInput(row.definition, $event)"
                  />
                </template>
                <p v-if="row.binding" class="property-card__hint">Value controlled by binding.</p>
              </div>

              <div v-if="row.binding" class="binding-editor">
                <div class="binding-editor__modes">
                  <button
                    v-for="mode in ['field', 'twoWay', 'literal', 'script']"
                    :key="mode"
                    type="button"
                    :class="['binding-editor__mode', { 'binding-editor__mode--active': (row.binding.mode ?? 'field') === mode }]"
                    @click="handleBindingModeChange(row.definition, row.definition.key, mode as BindingMode)"
                  >
                    {{ mode === 'field' ? 'Field (Read)' : mode === 'twoWay' ? 'Two-Way' : mode === 'literal' ? 'Literal' : 'Script' }}
                  </button>
                </div>

                <label class="binding-editor__field">
                  <span v-if="(row.binding.mode ?? 'field') === 'field'">Field Path (Read Only)</span>
                  <span v-else-if="(row.binding.mode ?? 'field') === 'twoWay'">Field Path (Read & Write)</span>
                  <span v-else-if="(row.binding.mode ?? 'field') === 'literal'">Literal Value</span>
                  <span v-else>Script Body</span>
                  <textarea
                    v-if="(row.binding.mode ?? 'field') === 'script'"
                    :value="row.binding.expression"
                    rows="4"
                    @input="handleBindingExpressionInput(row.definition.key, $event)"
                    placeholder="// Available: context, helpers&#10;return await context.get('Parent->Name');"
                  ></textarea>
                  <input
                    v-else
                    type="text"
                    :value="row.binding.expression"
                    @input="handleBindingExpressionInput(row.definition.key, $event)"
                    placeholder="Enter expression or value"
                  />
                  <small v-if="(row.binding.mode ?? 'field') === 'field'" class="binding-help">
                    Simple: <code>Name</code>, <code>Parent->Name</code>. Computed: <code>Temperature * 1.8 + 32</code>, <code>Width * Height</code>. Supports +, -, *, /, %, (). Read-only.
                  </small>
                  <small v-else-if="(row.binding.mode ?? 'field') === 'twoWay'" class="binding-help">
                    Two-way binding: Reads from field AND automatically writes back changes. Perfect for input fields. Example: <code>Temperature</code>, <code>Settings->Value</code>
                  </small>
                  <small v-else-if="(row.binding.mode ?? 'field') === 'script'" class="binding-help">
                    Available: <code>context.get(path)</code>, <code>context.getCached(path)</code>, <code>helpers.clamp()</code>, <code>helpers.lerp()</code>, <code>helpers.colorRamp()</code>
                  </small>
                  <small v-else class="binding-help">
                    Enter a literal value: string, number, or boolean
                  </small>
                </label>

                <div class="binding-editor__advanced">
                  <button type="button" @click="toggleBindingAdvanced(row.definition.key)">
                    {{ isBindingAdvancedOpen(row.definition.key) ? 'Hide Advanced' : 'Show Advanced' }}
                  </button>
                </div>

                <div v-if="isBindingAdvancedOpen(row.definition.key)" class="binding-editor__advanced-fields">
                  <label v-if="(row.binding.mode ?? 'field') === 'script'" class="binding-editor__field">
                    <span>Dependencies (paths)</span>
                    <textarea
                      :value="getDependenciesText(row.binding)"
                      rows="3"
                      @input="handleBindingDependenciesInput(row.definition.key, $event)"
                      placeholder="Parent->Name&#10;Status&#10;Temperature->Value"
                    ></textarea>
                    <small>One per line. Field paths that trigger script re-evaluation. Example: <code>Parent->Name</code></small>
                  </label>

                  <label class="binding-editor__field">
                    <span>Transform</span>
                    <textarea
                      :value="row.binding.transform ?? ''"
                      rows="3"
                      @input="handleBindingTransformInput(row.definition.key, $event)"
                      placeholder="// Post-process the value&#10;return value.toFixed(2);"
                    ></textarea>
                    <small>Optional post-processing. Receives <code>value</code>. Example: <code>(value) => value * 100</code> or <code>return value.toFixed(2);</code></small>
                  </label>

                  <label class="binding-editor__field">
                    <span>Description</span>
                    <textarea
                      :value="row.binding.description ?? ''"
                      rows="2"
                      @input="handleBindingDescriptionInput(row.definition.key, $event)"
                    ></textarea>
                  </label>
                </div>
              </div>
            </div>
          </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Event Handlers Section -->
      <section v-if="isInteractiveComponent" class="inspector__section">
        <header>
          <h3>Event Handlers</h3>
        </header>
        
        <p v-if="!eventHandlers.length" class="inspector__hint">
          Add event handlers to make this component interactive. Event handlers can write values to fields, execute custom scripts, or trigger navigation.
        </p>
        
        <div class="event-handlers">
          <!-- Available events to add -->
          <div v-if="applicableEvents.length > 0" class="event-add-section">
            <span class="event-section-label">Add Event Handler</span>
            <div class="event-triggers">
              <button
                v-for="trigger in applicableEvents"
                :key="trigger"
                type="button"
                class="event-trigger-button"
                :disabled="eventHandlers.some(h => h.trigger === trigger)"
                @click="handleEventHandlerCreate(trigger)"
                :title="eventHandlers.some(h => h.trigger === trigger) ? 'Handler already exists for this event' : `Add ${getEventTriggerLabel(trigger)} handler`"
              >
                + {{ getEventTriggerLabel(trigger) }}
              </button>
            </div>
          </div>

          <!-- Event handler list -->
          <div v-if="eventHandlers.length > 0" class="event-handler-list">
            <div
              v-for="handler in eventHandlers"
              :key="handler.id"
              class="event-handler-card"
            >
              <div class="event-handler-header">
                <div class="event-handler-title">
                  <span class="event-handler-trigger-badge">{{ getEventTriggerLabel(handler.trigger) }}</span>
                  <span class="event-handler-action-label">{{ getActionTypeLabel(handler.action.type) }}</span>
                </div>
                <button
                  type="button"
                  class="event-handler-remove"
                  @click="handleEventHandlerRemove(handler.id)"
                  title="Remove event handler"
                >
                  ×
                </button>
              </div>

              <div class="event-handler-body">
                <!-- Action Type Selector -->
                <label class="event-handler-field">
                  <span>Action Type</span>
                  <select
                    :value="handler.action.type"
                    @change="handleActionTypeChange(handler, ($event.target as HTMLSelectElement).value as any)"
                  >
                    <option value="writeField">Write Field</option>
                    <option value="script">Run Script</option>
                    <option value="navigate">Navigate</option>
                  </select>
                </label>

                <!-- Write Field Action -->
                <template v-if="handler.action.type === 'writeField'">
                  <label class="event-handler-field">
                    <span>Field Path</span>
                    <input
                      type="text"
                      :value="(handler.action as any).fieldPath || ''"
                      @input="handleWriteFieldUpdate(handler, 'fieldPath', ($event.target as HTMLInputElement).value)"
                      placeholder="e.g., Value, Status, Parent->Name"
                    />
                    <small>Path to the field to write to (supports indirect paths)</small>
                  </label>

                  <label class="event-handler-field">
                    <span>Value Source</span>
                    <select
                      :value="(handler.action as any).valueSource || 'component'"
                      @change="handleWriteFieldUpdate(handler, 'valueSource', ($event.target as HTMLSelectElement).value)"
                    >
                      <option value="component">Component Value</option>
                      <option value="literal">Literal Value</option>
                      <option value="expression">Expression</option>
                    </select>
                    <small>Where to get the value to write</small>
                  </label>

                  <label v-if="(handler.action as any).valueSource !== 'component'" class="event-handler-field">
                    <span>Value</span>
                    <input
                      type="text"
                      :value="(handler.action as any).value || ''"
                      @input="handleWriteFieldUpdate(handler, 'value', ($event.target as HTMLInputElement).value)"
                      placeholder="Value to write"
                    />
                  </label>

                  <label class="event-handler-field">
                    <span>Target Entity (optional)</span>
                    <input
                      type="text"
                      :value="(handler.action as any).targetEntity || ''"
                      @input="handleWriteFieldUpdate(handler, 'targetEntity', ($event.target as HTMLInputElement).value)"
                      placeholder="Default: bound entity"
                    />
                    <small>Leave empty to use bound entity, or specify entity path</small>
                  </label>
                </template>

                <!-- Script Action -->
                <template v-if="handler.action.type === 'script'">
                  <label class="event-handler-field">
                    <span>Script Code</span>
                    <textarea
                      :value="(handler.action as any).code || ''"
                      @input="handleScriptUpdate(handler, ($event.target as HTMLTextAreaElement).value)"
                      rows="6"
                      placeholder="// Available: event, value, context&#10;// Example:&#10;await context.set('Status', value);"
                    ></textarea>
                    <small>JavaScript code to execute. Access event details via <code>event</code>, component value via <code>value</code>, and data context via <code>context</code></small>
                  </label>
                </template>

                <!-- Navigate Action -->
                <template v-if="handler.action.type === 'navigate'">
                  <label class="event-handler-field">
                    <span>Target Faceplate</span>
                    <input
                      type="text"
                      :value="(handler.action as any).targetFaceplate || ''"
                      @input="handleWriteFieldUpdate(handler, 'targetFaceplate', ($event.target as HTMLInputElement).value)"
                      placeholder="Faceplate ID"
                    />
                  </label>

                  <label class="event-handler-field">
                    <span>Entity Context (optional)</span>
                    <input
                      type="text"
                      :value="(handler.action as any).entityContext || ''"
                      @input="handleWriteFieldUpdate(handler, 'entityContext', ($event.target as HTMLInputElement).value)"
                      placeholder="Entity ID or path"
                    />
                  </label>
                </template>

                <!-- Description -->
                <label class="event-handler-field">
                  <span>Description (optional)</span>
                  <textarea
                    :value="handler.description || ''"
                    @input="handleEventHandlerUpdate(handler, { description: ($event.target as HTMLTextAreaElement).value })"
                    rows="2"
                    placeholder="Describe what this handler does..."
                  ></textarea>
                </label>

                <!-- Enabled toggle -->
                <label class="event-handler-toggle">
                  <input
                    type="checkbox"
                    :checked="handler.enabled !== false"
                    @change="handleEventHandlerUpdate(handler, { enabled: ($event.target as HTMLInputElement).checked })"
                  />
                  <span>Enabled</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </section>
    </form>
  </aside>
</template>

<style scoped>
.inspector {
  display: flex;
  flex-direction: column;
  width: 320px;
  height: 100%;
  max-height: 100%;
  min-height: 0;
  background: rgba(2, 12, 18, 0.72);
  border-left: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(18px);
  overflow: hidden;
}

.inspector__header {
  padding: 16px 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.inspector__header h2 {
  margin: 0;
  font-size: 15px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.inspector__header p {
  margin: 6px 0 0;
  font-size: 12px;
  opacity: 0.65;
}

.inspector__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: 6px;
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  background: rgba(0, 255, 194, 0.2);
  color: rgba(0, 255, 194, 0.85);
}

.inspector__content {
  flex: 1;
  overflow: auto;
  padding: 16px 18px 24px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-height: 0;
}

.inspector__section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.inspector__section header h3 {
  margin: 0;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  opacity: 0.8;
}

.inspector__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.inspector__field span {
  font-size: 12px;
  opacity: 0.7;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.inspector__field input,
.inspector__field select,
.inspector__field textarea {
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.35);
  color: inherit;
  padding: 8px 10px;
}

.inspector__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.inspector__list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.inspector__actions {
  display: flex;
  gap: 10px;
}

.inspector__secondary {
  flex: 1;
  border-radius: 10px;
  padding: 8px 14px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.05);
  color: inherit;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 11px;
  cursor: pointer;
  transition: background 0.18s ease, border 0.18s ease;
}

.inspector__secondary:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.28);
}

.inspector__lock-active {
  background: rgba(255, 200, 100, 0.15);
  border-color: rgba(255, 200, 100, 0.4);
  color: rgba(255, 220, 150, 0.95);
}

.inspector__lock-active:hover {
  background: rgba(255, 200, 100, 0.25);
  border-color: rgba(255, 200, 100, 0.6);
}

.inspector__danger {
  align-self: flex-start;
  border-radius: 10px;
  padding: 8px 14px;
  border: 1px solid rgba(240, 120, 120, 0.4);
  background: rgba(240, 80, 80, 0.15);
  color: rgba(255, 190, 190, 0.95);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 11px;
  cursor: pointer;
  transition: background 0.18s ease, border 0.18s ease;
}

.inspector__danger:hover {
  background: rgba(240, 80, 80, 0.25);
  border-color: rgba(240, 120, 120, 0.6);
}

@media (max-width: 1080px) {
  .inspector {
    width: 100%;
    max-width: none;
    max-height: none;
    height: auto;
    border-left: none;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }

  .inspector__content {
    padding: 16px 18px 22px;
  }
}

.inspector__hint {
  font-size: 12px;
  opacity: 0.65;
}

.inspector__empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  text-align: center;
  font-size: 14px;
  opacity: 0.65;
}

.property-category {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.property-category__header {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 12px;
  background: rgba(0, 255, 194, 0.08);
  border: 1px solid rgba(0, 255, 194, 0.15);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
  color: inherit;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.property-category__header:hover {
  background: rgba(0, 255, 194, 0.12);
  border-color: rgba(0, 255, 194, 0.25);
}

.property-category__icon {
  font-size: 10px;
  opacity: 0.7;
}

.property-category__name {
  flex: 1;
}

.property-category__count {
  font-size: 11px;
  opacity: 0.6;
  font-weight: 400;
}

.property-category__content {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-left: 8px;
}

.property-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 12, 22, 0.45);
}

.property-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.property-card__titles {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.property-card__label {
  font-size: 13px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.property-card__status {
  font-size: 11px;
  opacity: 0.65;
}

.property-card__action {
  border-radius: 8px;
  padding: 6px 12px;
  background: rgba(0, 255, 194, 0.12);
  border: 1px solid rgba(0, 255, 194, 0.3);
  color: inherit;
  cursor: pointer;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.property-card__body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.property-card__control {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.property-card__control input,
.property-card__control select,
.binding-editor__field textarea,
.binding-editor__field input {
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: inherit;
  padding: 8px 10px;
}

.property-card__control select {
  padding-right: 26px;
}

/* Fix dropdown option colors - critical UX issue */
.property-card__control select option,
.event-handler-field select option,
.inspector__select option {
  background: rgba(8, 16, 24, 0.98);
  color: #ffffff;
  padding: 8px;
}

.property-card__control select option:hover,
.event-handler-field select option:hover,
.inspector__select option:hover {
  background: rgba(0, 255, 194, 0.2);
}

.property-card__control input:disabled,
.property-card__control select:disabled {
  opacity: 0.45;
}

.property-card__hint {
  font-size: 11px;
  opacity: 0.6;
}

.binding-editor {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.28);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.binding-editor__modes {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.binding-editor__mode {
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.05);
  color: inherit;
  cursor: pointer;
  padding: 6px 8px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.binding-editor__mode--active {
  border-color: rgba(0, 255, 194, 0.6);
  background: rgba(0, 255, 194, 0.18);
  color: #00120c;
}

.binding-editor__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.binding-editor__field span {
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.7;
}

.binding-editor__field small {
  font-size: 10px;
  opacity: 0.55;
  line-height: 1.4;
}

.binding-editor__field small code {
  padding: 2px 4px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  font-size: 10px;
}

.binding-help {
  display: block;
  margin-top: 4px;
  font-size: 10px;
  line-height: 1.5;
  opacity: 0.7;
  font-style: italic;
}

.binding-editor__advanced {
  display: flex;
  justify-content: flex-end;
}

.binding-editor__advanced button {
  border-radius: 8px;
  padding: 6px 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.binding-editor__advanced-fields {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Container Hierarchy Styles */
.container-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.container-section__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.container-section__label {
  font-weight: 600;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.9);
}

.container-children {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.container-child {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  transition: background 0.2s;
}

.container-child:hover {
  background: rgba(0, 0, 0, 0.4);
}

.container-child__name {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.9);
  flex: 1;
}

.container-child__remove {
  width: 24px;
  height: 24px;
  border: none;
  background: rgba(255, 68, 68, 0.2);
  color: #ff4444;
  border-radius: 4px;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.container-child__remove:hover {
  background: rgba(255, 68, 68, 0.3);
  transform: scale(1.1);
}

.inspector__danger-link {
  background: none;
  border: none;
  color: #ff4444;
  font-size: 11px;
  cursor: pointer;
  text-decoration: underline;
  padding: 0;
  transition: opacity 0.2s;
}

.inspector__danger-link:hover {
  opacity: 0.8;
}

/* Quick Actions Styles */
.quick-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.inspector__select {
  width: 100%;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  color: inherit;
  font-size: 13px;
  cursor: pointer;
  transition: border-color 0.2s;
}

.inspector__select:hover {
  border-color: rgba(255, 255, 255, 0.2);
}

.inspector__select:focus {
  outline: none;
  border-color: rgba(0, 255, 170, 0.5);
}

.inspector__primary {
  padding: 10px 16px;
  background: linear-gradient(135deg, rgba(0, 255, 170, 0.25), rgba(0, 200, 255, 0.25));
  border: 1px solid rgba(0, 255, 170, 0.4);
  border-radius: 8px;
  color: inherit;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.inspector__primary:hover:not(:disabled) {
  background: linear-gradient(135deg, rgba(0, 255, 170, 0.35), rgba(0, 200, 255, 0.35));
  border-color: rgba(0, 255, 170, 0.6);
  transform: translateY(-1px);
}

.inspector__primary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Tab Management Styles */
.tab-management {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tab-management__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.tab-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  transition: background 0.2s;
}

.tab-item:hover {
  background: rgba(0, 0, 0, 0.4);
}

.tab-item__index {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 4px;
  background: rgba(0, 255, 136, 0.15);
  border: 1px solid rgba(0, 255, 136, 0.3);
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  color: rgba(0, 255, 136, 0.9);
}

.tab-item__input {
  flex: 1;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 4px;
  color: inherit;
  font-size: 13px;
}

.tab-item__input:focus {
  outline: none;
  border-color: rgba(0, 255, 194, 0.5);
  background: rgba(255, 255, 255, 0.06);
}

.tab-item__remove {
  width: 24px;
  height: 24px;
  border: none;
  background: rgba(255, 68, 68, 0.2);
  color: #ff4444;
  border-radius: 4px;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.tab-item__remove:hover {
  background: rgba(255, 68, 68, 0.3);
  transform: scale(1.1);
}

/* Event Handler Styles */
.event-handlers {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.event-add-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.event-section-label {
  font-size: 12px;
  font-weight: 600;
  opacity: 0.8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.event-triggers {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.event-trigger-button {
  padding: 8px 14px;
  background: linear-gradient(135deg, rgba(0, 255, 170, 0.15), rgba(0, 200, 255, 0.15));
  border: 1px solid rgba(0, 255, 170, 0.3);
  border-radius: 8px;
  color: inherit;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.event-trigger-button:hover:not(:disabled) {
  background: linear-gradient(135deg, rgba(0, 255, 170, 0.25), rgba(0, 200, 255, 0.25));
  border-color: rgba(0, 255, 170, 0.5);
  transform: translateY(-1px);
}

.event-trigger-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.event-handler-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.event-handler-card {
  display: flex;
  flex-direction: column;
  padding: 14px;
  background: rgba(0, 12, 22, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  transition: border-color 0.2s;
}

.event-handler-card:hover {
  border-color: rgba(0, 255, 170, 0.3);
}

.event-handler-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.event-handler-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.event-handler-trigger-badge {
  padding: 4px 10px;
  background: rgba(0, 170, 255, 0.2);
  border: 1px solid rgba(0, 170, 255, 0.4);
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.event-handler-action-label {
  font-size: 12px;
  opacity: 0.7;
  font-style: italic;
}

.event-handler-remove {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 68, 68, 0.15);
  border: 1px solid rgba(255, 68, 68, 0.3);
  border-radius: 6px;
  color: #ff4444;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  transition: all 0.2s;
}

.event-handler-remove:hover {
  background: rgba(255, 68, 68, 0.25);
  transform: scale(1.05);
}

.event-handler-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.event-handler-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.event-handler-field span {
  font-size: 11px;
  font-weight: 500;
  opacity: 0.75;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.event-handler-field input,
.event-handler-field select,
.event-handler-field textarea {
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  color: inherit;
  font-size: 13px;
  font-family: inherit;
}

.event-handler-field input:focus,
.event-handler-field select:focus,
.event-handler-field textarea:focus {
  outline: none;
  border-color: rgba(0, 255, 194, 0.5);
  background: rgba(255, 255, 255, 0.06);
}

.event-handler-field textarea {
  font-family: 'Courier New', monospace;
  resize: vertical;
  min-height: 80px;
}

.event-handler-field small {
  font-size: 10px;
  opacity: 0.6;
  line-height: 1.4;
}

.event-handler-field small code {
  padding: 2px 4px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  font-size: 10px;
}

.event-handler-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  font-size: 13px;
}

.event-handler-toggle input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.event-handler-toggle span {
  font-weight: 500;
}

/* Number input with slider */
.number-input-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.number-slider {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.1);
  outline: none;
  -webkit-appearance: none;
  appearance: none;
}

.number-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--qui-accent-color, #00ffaa);
  cursor: pointer;
  transition: transform 0.15s ease;
}

.number-slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

.number-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border: none;
  border-radius: 50%;
  background: var(--qui-accent-color, #00ffaa);
  cursor: pointer;
  transition: transform 0.15s ease;
}

.number-slider::-moz-range-thumb:hover {
  transform: scale(1.2);
}

.number-slider:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.number-input {
  width: 100%;
}

/* Binding indicator badges */
.binding-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: 8px;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
}

.binding-badge--field {
  background: rgba(100, 150, 255, 0.2);
  color: rgba(100, 150, 255, 1);
  border: 1px solid rgba(100, 150, 255, 0.4);
}

.binding-badge--twoWay {
  background: rgba(255, 170, 0, 0.2);
  color: rgba(255, 170, 0, 1);
  border: 1px solid rgba(255, 170, 0, 0.4);
}

.binding-badge--literal {
  background: rgba(150, 100, 255, 0.2);
  color: rgba(150, 100, 255, 1);
  border: 1px solid rgba(150, 100, 255, 0.4);
}

.binding-badge--script {
  background: rgba(0, 255, 170, 0.2);
  color: rgba(0, 255, 170, 1);
  border: 1px solid rgba(0, 255, 170, 0.4);
}

/* Component name field */
.inspector__field--name {
  margin-bottom: 16px;
}

.inspector__field--name input {
  width: 100%;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  color: inherit;
  font-size: 14px;
}

.inspector__field--name input.input-error {
  border-color: rgba(255, 68, 68, 0.6);
  background: rgba(255, 68, 68, 0.08);
}

/* Property search */
.property-search {
  margin-bottom: 12px;
}

.property-search__input {
  width: 100%;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  color: inherit;
  font-size: 13px;
  outline: none;
  transition: all 0.2s ease;
}

.property-search__input:focus {
  border-color: rgba(0, 255, 194, 0.5);
  background: rgba(255, 255, 255, 0.08);
}

/* Property reset button */
.property-card__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.property-card__reset {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 170, 0, 0.15);
  border: 1px solid rgba(255, 170, 0, 0.3);
  border-radius: 6px;
  color: rgba(255, 170, 0, 1);
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.property-card__reset:hover:not(:disabled) {
  background: rgba(255, 170, 0, 0.25);
  transform: scale(1.1);
}

.property-card__reset:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Validation error messages */
.error-message {
  display: block;
  margin-top: 4px;
  color: rgba(255, 68, 68, 1);
  font-size: 11px;
  font-weight: 500;
}

.input-error {
  border-color: rgba(255, 68, 68, 0.6) !important;
  background: rgba(255, 68, 68, 0.08) !important;
}
</style>
