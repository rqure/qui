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
}>();

const emit = defineEmits<{
  (event: 'resize', payload: { nodeId: string; size: { x: number; y: number } }): void;
  (event: 'prop-updated', payload: { nodeId: string; key: string; value: unknown }): void;
  (event: 'binding-create', payload: BindingDraftPayload): void;
  (event: 'binding-update', payload: BindingDraftPayload): void;
  (event: 'binding-remove', payload: { nodeId: string; property: string }): void;
  (event: 'delete-node', payload: { nodeId: string }): void;
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
        <button type="button" class="inspector__danger" @click="handleDeleteClick">Delete Component</button>
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
  background: rgba(2, 12, 18, 0.72);
  border-left: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(18px);
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
</style>
