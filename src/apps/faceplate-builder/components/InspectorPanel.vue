<script setup lang="ts">
import { computed } from 'vue';
import type { CanvasNode, PaletteTemplate, PrimitivePropertyDefinition } from '../types';

const props = defineProps<{
  node: CanvasNode | null;
  template: PaletteTemplate | null;
}>();

const emit = defineEmits<{
  (event: 'rename', payload: { nodeId: string; name: string }): void;
  (event: 'resize', payload: { nodeId: string; size: { x: number; y: number } }): void;
  (event: 'prop-updated', payload: { nodeId: string; key: string; value: unknown }): void;
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

function handleRename(event: Event) {
  if (!props.node) return;
  const value = (event.target as HTMLInputElement | null)?.value ?? '';
  emit('rename', { nodeId: props.node.id, name: value });
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
        <label class="inspector__field">
          <span>Display Name</span>
          <input type="text" :value="node.name" @input="handleRename" />
        </label>
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
      </section>

      <section class="inspector__section">
        <header><h3>Properties</h3></header>
        <p v-if="!propertySchema.length" class="inspector__hint">This component has no configurable properties yet.</p>
        <div v-else class="inspector__list">
          <label v-for="item in propertySchema" :key="item.key" class="inspector__field">
            <span>{{ item.label }}</span>
            <template v-if="item.type === 'boolean'">
              <input
                type="checkbox"
                :checked="Boolean(node?.props?.[item.key])"
                @change="handlePropInput(item, $event)"
              />
            </template>
            <template v-else-if="item.type === 'number'">
              <input
                type="number"
                :value="Number(node?.props?.[item.key] ?? item.default ?? 0)"
                @input="handlePropInput(item, $event)"
              />
            </template>
            <template v-else-if="item.type === 'option'">
              <select
                :value="String(node?.props?.[item.key] ?? item.default ?? '')"
                @change="handlePropInput(item, $event)"
              >
                <option v-for="option in item.options || []" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </template>
            <template v-else>
              <input
                type="text"
                :value="String(node?.props?.[item.key] ?? '')"
                @input="handlePropInput(item, $event)"
              />
            </template>
          </label>
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
</style>
