<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import ComponentSampleRenderer from './ComponentSampleRenderer.vue';
import type {
  PaletteTemplate,
  PrimitiveDefinition,
  PrimitivePropertyDefinition,
  Vector2,
} from '../types';

type ComposerPayload = {
  label: string;
  description: string;
  icon: string;
  primitiveId: string;
  size: Vector2;
  props: Record<string, unknown>;
};

const props = defineProps<{
  primitives: PrimitiveDefinition[];
}>();

const emit = defineEmits<{
  (event: 'create-component', payload: ComposerPayload): void;
}>();

const activePrimitiveId = ref(props.primitives[0]?.id ?? '');
const componentLabel = ref('New Component');
const componentIcon = ref('✨');
const componentDescription = ref('Compose a component from low-level primitives.');
const size = reactive<Vector2>({ x: 240, y: 180 });
const propValues = reactive<Record<string, unknown>>({});

function resetForPrimitive(def: PrimitiveDefinition | undefined) {
  if (!def) {
    size.x = 240;
    size.y = 180;
    Object.keys(propValues).forEach((key) => delete propValues[key]);
    return;
  }

  size.x = def.defaultSize.x;
  size.y = def.defaultSize.y;
  Object.keys(propValues).forEach((key) => delete propValues[key]);
  for (const schema of def.propertySchema) {
    const fallback = schema.default ?? def.defaultProps[schema.key];
    propValues[schema.key] = fallback;
  }

  // Preserve user-friendly label defaults when available.
  if ('label' in propValues && typeof propValues.label === 'string') {
    propValues.label = componentLabel.value;
  }
  if ('text' in propValues && typeof propValues.text === 'string') {
    propValues.text = `${componentLabel.value} text`;
  }
}

watch(
  activePrimitiveId,
  (next) => {
    const def = props.primitives.find((item) => item.id === next);
    if (def) {
      componentLabel.value = def.label;
      componentIcon.value = def.icon;
      componentDescription.value = def.description;
    }
    resetForPrimitive(def);
  },
  { immediate: true },
);

watch(componentLabel, (value) => {
  if (value && typeof propValues.label === 'string') {
    propValues.label = value;
  }
});

const selectedPrimitive = computed(() =>
  props.primitives.find((item) => item.id === activePrimitiveId.value) ?? null,
);

const previewTemplate = computed<PaletteTemplate | null>(() => {
  if (!selectedPrimitive.value) return null;
  return {
    id: '__preview__',
    label: componentLabel.value || selectedPrimitive.value.label,
    description: componentDescription.value,
    icon: componentIcon.value || selectedPrimitive.value.icon,
    primitiveId: selectedPrimitive.value.id,
    defaults: {
      size: { x: size.x, y: size.y },
      props: { ...propValues },
    },
    propertySchema: selectedPrimitive.value.propertySchema,
    previewProps: selectedPrimitive.value.previewProps,
    source: 'custom',
  } satisfies PaletteTemplate;
});

function updatePropValue(schema: PrimitivePropertyDefinition, raw: unknown) {
  switch (schema.type) {
    case 'number':
      propValues[schema.key] = typeof raw === 'number' ? raw : Number(raw ?? 0);
      break;
    case 'boolean':
      propValues[schema.key] = Boolean(raw);
      break;
    default:
      propValues[schema.key] = raw ?? '';
      break;
  }
}

function handleSubmit() {
  const primitive = selectedPrimitive.value;
  if (!primitive) return;
  const label = componentLabel.value.trim();
  if (!label) return;

  emit('create-component', {
    label,
    description: componentDescription.value.trim() || primitive.description,
    icon: componentIcon.value.trim() || primitive.icon,
    primitiveId: primitive.id,
    size: { x: size.x, y: size.y },
    props: { ...propValues },
  });

  // Provide feedback by tweaking label for next component.
  componentLabel.value = `${label} Copy`;
}
</script>

<template>
  <section class="composer" v-if="props.primitives.length">
    <header class="composer__header">
      <h2>Build Component</h2>
      <p>Select a primitive, adjust defaults, and add it to the palette.</p>
    </header>

    <form class="composer__form" @submit.prevent="handleSubmit">
      <label class="composer__field">
        <span>Primitive</span>
        <select v-model="activePrimitiveId">
          <option v-for="primitive in props.primitives" :key="primitive.id" :value="primitive.id">
            {{ primitive.label }} · {{ primitive.category }}
          </option>
        </select>
      </label>

      <label class="composer__field">
        <span>Component Name</span>
        <input v-model="componentLabel" type="text" placeholder="Custom component name" />
      </label>

      <div class="composer__grid">
        <label class="composer__field">
          <span>Icon</span>
          <input v-model="componentIcon" type="text" maxlength="2" placeholder="Emoji or short icon" />
        </label>
        <label class="composer__field">
          <span>Width (px)</span>
          <input v-model.number="size.x" type="number" min="80" step="20" />
        </label>
        <label class="composer__field">
          <span>Height (px)</span>
          <input v-model.number="size.y" type="number" min="80" step="20" />
        </label>
      </div>

      <label class="composer__field">
        <span>Description</span>
        <textarea v-model="componentDescription" rows="3" placeholder="Palette description"></textarea>
      </label>

      <section class="composer__properties" v-if="selectedPrimitive">
        <header>
          <h3>Default Properties</h3>
          <p>These values seed new components and can be overridden per instance.</p>
        </header>
        <div class="composer__property-list">
          <div
            v-for="schema in selectedPrimitive.propertySchema"
            :key="schema.key"
            class="composer__property"
          >
            <label>
              <span>{{ schema.label }}</span>
              <template v-if="schema.type === 'boolean'">
                <input
                  type="checkbox"
                  :checked="Boolean(propValues[schema.key])"
                  @change="updatePropValue(schema, ($event.target as HTMLInputElement).checked)"
                />
              </template>
              <template v-else-if="schema.type === 'number'">
                <input
                  type="number"
                  :step="schema.key.includes('precision') ? 1 : 0.1"
                  :value="Number(propValues[schema.key] ?? schema.default ?? 0)"
                  @input="updatePropValue(schema, Number(($event.target as HTMLInputElement).value))"
                />
              </template>
              <template v-else-if="schema.type === 'option'">
                <select
                  :value="String(propValues[schema.key] ?? schema.default ?? '')"
                  @change="updatePropValue(schema, ($event.target as HTMLSelectElement).value)"
                >
                  <option v-for="option in schema.options || []" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
              </template>
              <template v-else>
                <input
                  type="text"
                  :value="String(propValues[schema.key] ?? '')"
                  @input="updatePropValue(schema, ($event.target as HTMLInputElement).value)"
                />
              </template>
            </label>
            <p v-if="schema.description" class="composer__hint">{{ schema.description }}</p>
          </div>
        </div>
      </section>

      <section v-if="previewTemplate" class="composer__preview">
        <header>
          <h3>Palette Preview</h3>
        </header>
        <div class="composer__preview-stage" role="presentation">
          <ComponentSampleRenderer
            :component-id="previewTemplate.id"
            :name="previewTemplate.label"
            :props="{ ...previewTemplate.defaults.props, ...propValues }"
            :template="previewTemplate"
          />
        </div>
      </section>

      <footer class="composer__actions">
        <button type="submit">Add to Palette</button>
      </footer>
    </form>
  </section>
</template>

<style scoped>
.composer {
  display: flex;
  flex-direction: column;
  margin-top: 16px;
  padding: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 18, 32, 0.66);
  border-radius: 0 0 16px 16px;
}

.composer__header h2 {
  margin: 0;
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.composer__header p {
  margin: 6px 0 0;
  font-size: 12px;
  opacity: 0.65;
}

.composer__form {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-top: 12px;
}

.composer__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.composer__field span {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  opacity: 0.7;
}

.composer__field input,
.composer__field select,
.composer__field textarea {
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.35);
  color: inherit;
  padding: 8px 10px;
}

.composer__field textarea {
  resize: vertical;
}

.composer__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.composer__properties {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border-radius: 12px;
  background: rgba(0, 22, 36, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.composer__properties header h3 {
  margin: 0;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.composer__properties header p {
  margin: 6px 0 0;
  font-size: 12px;
  opacity: 0.6;
}

.composer__property-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.composer__property label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
}

.composer__property input[type='checkbox'] {
  width: auto;
  align-self: flex-start;
}

.composer__hint {
  margin: 0;
  font-size: 11px;
  opacity: 0.55;
}

.composer__preview {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.composer__preview-stage {
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.24);
  padding: 12px;
}

.composer__actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 4px;
}

.composer__actions button {
  padding: 10px 18px;
  border-radius: 8px;
  border: none;
  background: linear-gradient(135deg, rgba(0, 255, 194, 0.82), rgba(0, 180, 255, 0.82));
  color: rgba(0, 0, 0, 0.85);
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.18s ease;
}

.composer__actions button:hover {
  transform: translateY(-1px);
}
</style>
