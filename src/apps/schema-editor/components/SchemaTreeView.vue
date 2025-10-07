<script setup lang="ts">
import type { EntityType } from '@/core/data/types'
import type { SchemaTreeNode } from '../types'
import SchemaTreeNodeItem from './SchemaTreeNodeItem.vue'

defineProps<{
  nodes: SchemaTreeNode[]
  selectedId: EntityType | null
  expandedIds: EntityType[]
  searchQuery: string
}>()

defineEmits<{
  (e: 'toggle', entityType: EntityType): void
  (e: 'select', entityType: EntityType): void
}>()
</script>

<template>
  <div class="schema-tree">
    <ul v-if="nodes.length" class="schema-tree__list">
      <SchemaTreeNodeItem
        v-for="node in nodes"
        :key="node.id"
        :node="node"
        :selected-id="selectedId"
        :expanded-ids="expandedIds"
        :search-query="searchQuery"
        :level="0"
        @toggle="$emit('toggle', $event)"
        @select="$emit('select', $event)"
      />
    </ul>
    <div v-else class="schema-tree__empty">No entity types match the current filter.</div>
  </div>
</template>

<style scoped>
.schema-tree {
  min-height: 0;
}

.schema-tree__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.schema-tree__empty {
  padding: 12px;
  text-align: center;
  color: var(--qui-text-secondary);
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
}
</style>
