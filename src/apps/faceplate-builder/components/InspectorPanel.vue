<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue';
import type {
  Binding,
  BindingMode,
  CanvasNode,
  PaletteTemplate,
  PrimitivePropertyDefinition,
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
  emit('prop-updated', { nodeId: props.node.id, key: definition.key, value });
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
  const newTab = {
    name: `Tab ${newTabIndex + 1}`,
    id: `tab-${newTabIndex}`,
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

    <div v-if="!node" class="inspector__empty">Select a component to edit its properties.</div>

    <form v-else class="inspector__content" @submit.prevent>
      <section class="inspector__section">
        <header><h3>General</h3></header>
        <div class="inspector__grid">
          <label class="inspector__field">
            <span>Width (px)</span>
            <input type="number" min="60" step="20" :value="node.size.x" @input="handleSizeChange('x', $event)" />
          </label>
          <label class="inspector__field">
            <span>Height (px)</span>
            <input type="number" min="60" step="20" :value="node.size.y" @input="handleSizeChange('y', $event)" />
          </label>
        </div>
        <div class="inspector__actions">
          <button type="button" class="inspector__secondary" @click="handleBringForward">Bring Forward</button>
          <button type="button" class="inspector__secondary" @click="handleSendBackward">Send Backward</button>
        </div>
        <button type="button" class="inspector__danger" @click="handleDeleteClick">Delete Component</button>
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
        <header><h3>Properties</h3></header>
        <p v-if="!propertySchema.length" class="inspector__hint">This component has no configurable properties yet.</p>
        <div v-else class="inspector__list">
          <div v-for="row in propertyRows" :key="row.definition.key" class="property-card">
            <header class="property-card__header">
              <div class="property-card__titles">
                <span class="property-card__label">{{ row.definition.label }}</span>
                <small v-if="row.binding" class="property-card__status">
                  Bound · {{ row.binding.mode ?? 'field' }}
                </small>
              </div>
              <button
                type="button"
                class="property-card__action"
                @click="row.binding ? handleBindingRemove(row.definition.key) : handleBindingCreate(row.definition)"
              >
                {{ row.binding ? 'Remove Binding' : 'Add Binding' }}
              </button>
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
                  <input
                    type="number"
                    :value="Number(node?.props?.[row.definition.key] ?? row.definition.default ?? 0)"
                    :disabled="Boolean(row.binding)"
                    @input="handlePropInput(row.definition, $event)"
                  />
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
                    v-for="mode in ['field', 'literal', 'script']"
                    :key="mode"
                    type="button"
                    :class="['binding-editor__mode', { 'binding-editor__mode--active': (row.binding.mode ?? 'field') === mode }]"
                    @click="handleBindingModeChange(row.definition, row.definition.key, mode as BindingMode)"
                  >
                    {{ mode === 'field' ? 'Entity Field' : mode === 'literal' ? 'Literal' : 'Script' }}
                  </button>
                </div>

                <label class="binding-editor__field">
                  <span v-if="(row.binding.mode ?? 'field') === 'field'">Field Path</span>
                  <span v-else-if="(row.binding.mode ?? 'field') === 'literal'">Literal Value</span>
                  <span v-else>Script Body</span>
                  <textarea
                    v-if="(row.binding.mode ?? 'field') === 'script'"
                    :value="row.binding.expression"
                    rows="4"
                    @input="handleBindingExpressionInput(row.definition.key, $event)"
                  ></textarea>
                  <input
                    v-else
                    type="text"
                    :value="row.binding.expression"
                    @input="handleBindingExpressionInput(row.definition.key, $event)"
                  />
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
                    ></textarea>
                    <small>One per line. Used to notify the runtime which fields to observe.</small>
                  </label>

                  <label class="binding-editor__field">
                    <span>Transform</span>
                    <textarea
                      :value="row.binding.transform ?? ''"
                      rows="3"
                      @input="handleBindingTransformInput(row.definition.key, $event)"
                    ></textarea>
                    <small>Optional post-processing hook. Receives <code>value</code>.</small>
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
  grid-template-columns: repeat(3, minmax(0, 1fr));
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
</style>
