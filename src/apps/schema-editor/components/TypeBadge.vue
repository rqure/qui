<script setup lang="ts">
import { computed } from 'vue';
import { ValueType } from '@/core/data/types';

const props = defineProps<{
  type: ValueType;
  size?: 'sm' | 'md' | 'lg';
}>();

const displayName = computed(() => {
  switch (props.type) {
    case ValueType.Int: return 'Integer';
    case ValueType.Float: return 'Decimal';
    case ValueType.String: return 'Text';
    case ValueType.Bool: return 'Boolean';
    case ValueType.BinaryFile: return 'File';
    case ValueType.EntityReference: return 'Reference';
    case ValueType.Timestamp: return 'Date & Time';
    case ValueType.Choice: return 'Choice';
    case ValueType.EntityList: return 'List';
    default: return props.type;
  }
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
  font-weight: var(--qui-font-weight-medium);
  background: var(--qui-overlay-primary);
  color: var(--qui-text-secondary);
}

.schema-editor-type-badge-string {
  background: var(--qui-overlay-primary);
  color: var(--qui-text-primary);
}

.schema-editor-type-badge-int, 
.schema-editor-type-badge-float {
  background: var(--qui-overlay-accent);
  color: var(--qui-accent-color);
}

.schema-editor-type-badge-bool {
  background: rgba(76, 175, 80, 0.1);
  color: #4CAF50;
}

.schema-editor-type-badge-entityreference, 
.schema-editor-type-badge-entitylist {
  background: var(--qui-overlay-secondary);
  color: var(--qui-accent-deep);
}

.schema-editor-type-badge-timestamp {
  background: rgba(0, 188, 212, 0.1);
  color: #00BCD4;
}

.schema-editor-type-badge-choice {
  background: rgba(233, 30, 99, 0.1);
  color: #E91E63;
}

.schema-editor-type-badge-binaryfile {
  background: rgba(158, 158, 158, 0.1);
  color: #9E9E9E;
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
