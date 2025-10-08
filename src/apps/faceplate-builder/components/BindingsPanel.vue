<script setup lang="ts">
interface BindingItem {
  id: string;
  componentName: string;
  property: string;
  expression: string;
  mode?: string;
  transform?: string | null;
}

const props = defineProps<{
  items: BindingItem[];
}>();

const emit = defineEmits<{
  (event: 'edit', bindingId: string): void;
  (event: 'remove', bindingId: string): void;
  (event: 'create'): void;
}>();
</script>

<template>
  <section class="bindings">
    <header class="bindings__header">
      <div>
        <h2>Bindings</h2>
        <p>Link component properties to entity data or expressions.</p>
      </div>
      <button type="button" class="bindings__add" @click="emit('create')">Add Binding</button>
    </header>

    <div v-if="!props.items.length" class="bindings__empty">
      No bindings defined yet. Create a binding to connect a component to live data.
    </div>

    <ul v-else class="bindings__list">
      <li v-for="binding in props.items" :key="binding.id" class="bindings__item">
        <div class="bindings__primary">
          <div class="bindings__title">
            <strong>{{ binding.componentName }} · {{ binding.property }}</strong>
            <span v-if="binding.mode" class="bindings__badge">{{ binding.mode }}</span>
          </div>
          <code>{{ binding.expression }}</code>
          <small v-if="binding.transform" class="bindings__transform">transform: {{ binding.transform }}</small>
        </div>
        <div class="bindings__actions">
          <button type="button" @click="emit('edit', binding.id)">Edit</button>
          <button type="button" class="danger" @click="emit('remove', binding.id)">Remove</button>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.bindings {
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding-top: 18px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.bindings__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.bindings__header h2 {
  margin: 0;
  font-size: 16px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.bindings__header p {
  margin: 4px 0 0;
  font-size: 12px;
  opacity: 0.65;
}

.bindings__add {
  border-radius: 8px;
  padding: 8px 16px;
  border: 1px solid rgba(0, 255, 194, 0.35);
  background: rgba(0, 255, 194, 0.12);
  color: inherit;
  cursor: pointer;
}

.bindings__empty {
  border-radius: 12px;
  border: 1px dashed rgba(255, 255, 255, 0.14);
  padding: 18px;
  text-align: center;
  font-size: 13px;
  opacity: 0.7;
}

.bindings__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bindings__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border-radius: 12px;
  padding: 14px 16px;
  background: rgba(0, 18, 32, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.bindings__primary strong {
  display: block;
  font-size: 14px;
}

.bindings__title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.bindings__badge {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  background: rgba(0, 255, 194, 0.14);
  color: rgba(0, 255, 194, 0.8);
}

.bindings__primary code {
  font-size: 12px;
  opacity: 0.65;
}

.bindings__transform {
  display: block;
  margin-top: 4px;
  font-size: 11px;
  opacity: 0.5;
}

.bindings__actions {
  display: flex;
  gap: 10px;
}

.bindings__actions button {
  border-radius: 8px;
  padding: 6px 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.bindings__actions button.danger {
  border-color: rgba(240, 98, 98, 0.3);
  color: rgba(240, 168, 168, 0.9);
}
</style>
