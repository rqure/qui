<script setup lang="ts">
import { computed } from 'vue';
import { ValueType } from '@/core/data/types';

const props = defineProps<{
  type: ValueType;
  size?: 'sm' | 'md' | 'lg';
}>();

const displayName = computed(() => {
  return props.type;
});

const badgeClass = computed(() => {
  return {
    'schema-editor-type-badge': true,
    [`schema-editor-type-badge-${props.type.toLowerCase()}`]: true,
    [`size-${props.size || 'md'}`]: true
  };
});
</script>

<template>
  <span :class="badgeClass">{{ displayName }}</span>
</template>

<style scoped>
.schema-editor-type-badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: var(--qui-font-weight-bold, 700);
  box-shadow: var(--qui-shadow-default);
}

.schema-editor-type-badge-string {
  background: var(--qui-bg-secondary);
  color: var(--qui-text-primary);
  border: 1px solid var(--qui-hover-border);
}

.schema-editor-type-badge-int, 
.schema-editor-type-badge-float {
  background: var(--qui-overlay-accent);
  color: var(--qui-accent-deep);
  border: 1px solid var(--qui-accent-color);
}

.schema-editor-type-badge-bool {
  background: var(--qui-overlay-primary);
  color: var(--qui-text-primary);
  border: 1px solid var(--qui-hover-border);
}

.schema-editor-type-badge-entityreference, 
.schema-editor-type-badge-entitylist {
  background: var(--qui-accent-deep);
  color: white;
  border: 1px solid var(--qui-accent-color);
}

.schema-editor-type-badge-timestamp {
  background: var(--qui-bg-secondary);
  color: var(--qui-text-primary);
  border: 1px solid var(--qui-hover-border);
}

.schema-editor-type-badge-choice {
  background: var(--qui-danger-bg);
  color: var(--qui-danger-color);
  border: 1px solid var(--qui-danger-border);
}

.schema-editor-type-badge-binaryfile {
  background: var(--qui-overlay-secondary);
  color: var(--qui-text-secondary);
  border: 1px solid var(--qui-hover-border);
}

.size-sm {
  padding: 2px 8px;
  font-size: 11px;
  border-radius: 10px;
}

.size-lg {
  padding: 4px 12px;
  font-size: 13px;
  border-radius: 14px;
}
</style>
