<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import type { Binding, BindingMode, CanvasNode, PaletteTemplate, PrimitivePropertyDefinition } from '../types';

const props = defineProps<{
  show: boolean;
  nodes: CanvasNode[];
  templates: Record<string, PaletteTemplate>;
  binding?: Binding | null;
}>();

const emit = defineEmits<{
  (event: 'cancel'): void;
  (event: 'save', payload: Omit<Binding, 'id' | 'componentName'> & { componentName?: string }): void;
}>();

type DraftState = {
  componentId: string;
  property: string;
  mode: BindingMode;
  expression: string;
  transform: string;
  dependenciesText: string;
  description: string;
};

const defaultDraft: DraftState = {
  componentId: '',
  property: '',
  mode: 'field',
  expression: '',
  transform: '',
  dependenciesText: '',
  description: '',
};

const draft = reactive<DraftState>({ ...defaultDraft });

const componentOptions = computed(() => props.nodes.map((node) => ({ id: node.id, name: node.name })));

const selectedNode = computed(() => props.nodes.find((node) => node.id === draft.componentId) ?? null);

const propertySchema = computed<PrimitivePropertyDefinition[]>(() => {
  if (!selectedNode.value) return [];
  const template = props.templates[selectedNode.value.componentId];
  if (template?.propertySchema?.length) {
    return template.propertySchema;
  }
  const propsObject = selectedNode.value.props ?? {};
  return Object.keys(propsObject).map((key) => ({
    key,
    label: key,
    type: 'string',
  }));
});

const propertyOptions = computed(() => {
  if (!propertySchema.value.length) return [];
  return propertySchema.value.map((item) => ({
    key: item.key,
    label: item.label || item.key,
  }));
});

const expressionPlaceholder = computed(() => {
  if (draft.mode === 'field') return 'Parent->Parent->Status';
  if (draft.mode === 'literal') return 'Manual';
  return 'return await context.get("Temperature");';
});

watch(
  () => props.binding,
  (binding) => {
    if (!binding) {
      Object.assign(draft, { ...defaultDraft });
      if (componentOptions.value.length) {
        draft.componentId = componentOptions.value[0].id;
        draft.property = propertyOptions.value[0]?.key ?? '';
      }
      return;
    }

    draft.componentId = binding.componentId;
    draft.property = binding.property;
    draft.mode = binding.mode ?? inferBindingMode(binding.expression);
    draft.expression = binding.expression;
    draft.transform = binding.transform ?? '';
    draft.dependenciesText = (binding.dependencies ?? []).join('\n');
    draft.description = binding.description ?? '';
  },
  { immediate: true },
);

watch(
  () => draft.componentId,
  (componentId) => {
    if (!componentId) return;
    if (!propertyOptions.value.find((item) => item.key === draft.property)) {
      draft.property = propertyOptions.value[0]?.key ?? '';
    }
  },
);

watch(
  () => draft.mode,
  (mode) => {
    if (mode === 'field' && !draft.expression) {
      draft.expression = 'Parent->Name';
    }
    if (mode === 'literal' && !draft.expression) {
      draft.expression = '"Literal Value"';
    }
  },
);

function inferBindingMode(expression: string): BindingMode {
  if (expression.trim().startsWith('script:')) {
    return 'script';
  }
  if (/^\s*("|').+("|')\s*$/.test(expression) || /^\s*-?\d+(\.\d+)?\s*$/.test(expression)) {
    return 'literal';
  }
  return 'field';
}

function parseDependencies(input: string): string[] {
  if (!input) return [];
  return input
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function handleSave() {
  if (!draft.componentId) {
    alert('Select a component for this binding.');
    return;
  }
  if (!draft.property) {
    alert('Select a component property to bind.');
    return;
  }
  if (!draft.expression.trim()) {
    alert('Provide an expression for the binding.');
    return;
  }

  const resultMode = draft.mode ?? 'field';
  const expression = resultMode === 'script' && draft.expression.trim().startsWith('script:')
    ? draft.expression.trim().slice('script:'.length)
    : draft.expression.trim();

  const payload: Omit<Binding, 'id' | 'componentName'> & { componentName?: string } = {
    componentId: draft.componentId,
    componentName: selectedNode.value?.name,
    property: draft.property,
    expression,
    mode: resultMode,
    transform: draft.transform.trim() ? draft.transform.trim() : null,
    dependencies: parseDependencies(draft.dependenciesText),
    description: draft.description.trim() || undefined,
  };

  emit('save', payload);
}
</script>

<template>
  <div v-if="show" class="dialog-backdrop">
    <section class="dialog" role="dialog" aria-modal="true">
      <header class="dialog__header">
        <h2>{{ props.binding ? 'Edit Binding' : 'Add Binding' }}</h2>
      </header>

      <form class="dialog__form" @submit.prevent="handleSave">
        <label class="dialog__field">
          <span>Component</span>
          <select v-model="draft.componentId">
            <option v-for="option in componentOptions" :key="option.id" :value="option.id">
              {{ option.name }}
            </option>
          </select>
        </label>

        <label class="dialog__field">
          <span>Property</span>
          <select v-model="draft.property">
            <option v-for="option in propertyOptions" :key="option.key" :value="option.key">
              {{ option.label }}
            </option>
          </select>
        </label>

        <div class="dialog__field">
          <span>Binding Type</span>
          <div class="mode-toggle">
            <button
              v-for="mode in ['field', 'literal', 'script']"
              :key="mode"
              type="button"
              :class="['mode-toggle__button', { 'mode-toggle__button--active': draft.mode === mode }]"
              @click="draft.mode = mode as BindingMode"
            >
              {{ mode === 'field' ? 'Entity Field' : mode === 'literal' ? 'Literal' : 'Script' }}
            </button>
          </div>
        </div>

        <label class="dialog__field dialog__field--wide">
          <span v-if="draft.mode === 'field'">Field Path (e.g. Parent-&gt;Name)</span>
          <span v-else-if="draft.mode === 'literal'">Literal Value (string, number, boolean)</span>
          <span v-else>Script Body</span>
          <textarea
            v-model="draft.expression"
            :placeholder="expressionPlaceholder"
            rows="draft.mode === 'script' ? 6 : 3"
          ></textarea>
        </label>

        <label v-if="draft.mode === 'script'" class="dialog__field dialog__field--wide">
          <span>Dependencies (field paths, one per line)</span>
          <textarea
            v-model="draft.dependenciesText"
            placeholder="Temperature\nSetpoint\nParent->Name"
            rows="3"
          ></textarea>
        </label>

        <label class="dialog__field dialog__field--wide">
          <span>Transform (optional)</span>
          <textarea
            v-model="draft.transform"
            placeholder="value => Math.round(value)"
            rows="3"
          ></textarea>
          <small>
            Transform runs after the binding resolves. Use <code>value</code> and optional helpers provided by the runtime.
          </small>
        </label>

        <label class="dialog__field dialog__field--wide">
          <span>Description (optional)</span>
          <textarea v-model="draft.description" rows="2" placeholder="Describe what this binding does"></textarea>
        </label>

        <footer class="dialog__footer">
          <button type="button" class="dialog__button" @click="emit('cancel')">Cancel</button>
          <button type="submit" class="dialog__button dialog__button--primary">
            {{ props.binding ? 'Save Changes' : 'Create Binding' }}
          </button>
        </footer>
      </form>
    </section>
  </div>
</template>

<style scoped>
.dialog-backdrop {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(10px);
  z-index: 3000;
}

.dialog {
  width: 540px;
  max-width: calc(100vw - 40px);
  border-radius: 18px;
  background: rgba(6, 18, 24, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 28px 48px rgba(0, 0, 0, 0.45);
  color: var(--qui-text-primary);
  display: flex;
  flex-direction: column;
}

.dialog__header {
  padding: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.dialog__header h2 {
  margin: 0;
  font-size: 18px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.dialog__form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
}

.dialog__field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dialog__field span {
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.7;
}

.dialog__field select,
.dialog__field textarea {
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(0, 0, 0, 0.35);
  color: inherit;
  padding: 10px 12px;
}

.dialog__field textarea {
  resize: vertical;
}

.dialog__field small {
  font-size: 11px;
  opacity: 0.6;
}

.dialog__field--wide textarea {
  min-height: 96px;
}

.mode-toggle {
  display: flex;
  gap: 8px;
}

.mode-toggle__button {
  flex: 1;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: inherit;
  cursor: pointer;
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 0.08em;
}

.mode-toggle__button--active {
  border-color: rgba(0, 255, 194, 0.6);
  background: rgba(0, 255, 194, 0.12);
}

.dialog__footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 8px;
}

.dialog__button {
  padding: 8px 16px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: inherit;
  cursor: pointer;
}

.dialog__button--primary {
  border-color: rgba(0, 255, 194, 0.6);
  background: rgba(0, 255, 194, 0.18);
  color: #02100c;
  font-weight: 600;
}
</style>
