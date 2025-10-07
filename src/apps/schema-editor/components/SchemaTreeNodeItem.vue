<script setup lang="ts">
import { computed } from 'vue'
import type { EntityType } from '@/core/data/types'
import type { SchemaTreeNode } from '../types'

defineOptions({ name: 'SchemaTreeNodeItem' })

const props = defineProps<{
  node: SchemaTreeNode
  selectedId: EntityType | null
  expandedIds: EntityType[]
  searchQuery: string
  level: number
}>()

const emit = defineEmits<{
  (e: 'toggle', entityType: EntityType): void
  (e: 'select', entityType: EntityType): void
}>()

const isExpanded = computed(() => props.expandedIds.includes(props.node.id))
const hasChildren = computed(() => props.node.children.length > 0)
const matchesSearch = computed(() => {
  if (!props.searchQuery) return false
  return props.node.name.toLowerCase().includes(props.searchQuery.toLowerCase())
})

function handleToggle(event: MouseEvent) {
  event.stopPropagation()
  emit('toggle', props.node.id)
}

function handleSelect() {
  emit('select', props.node.id)
}
</script>

<template>
  <li class="schema-tree-node" :class="{ 'schema-tree-node--selected': node.id === selectedId }" :style="{ '--tree-level': level }">
    <div class="schema-tree-node__content" @click="handleSelect">
      <button
        v-if="hasChildren"
        class="schema-tree-node__toggle"
        type="button"
        :aria-expanded="isExpanded"
        @click="handleToggle"
      >
        <span v-if="isExpanded">▾</span>
        <span v-else>▸</span>
      </button>
      <span v-else class="schema-tree-node__spacer" />

      <div class="schema-tree-node__label" :class="{ 'schema-tree-node__label--match': matchesSearch }">
        <span class="schema-tree-node__name">{{ node.name }}</span>
        <span class="schema-tree-node__metrics">
          {{ node.directFieldCount }} / {{ node.totalFieldCount }}
        </span>
      </div>
    </div>

    <ul v-if="hasChildren && isExpanded" class="schema-tree-node__children">
      <SchemaTreeNodeItem
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :selected-id="selectedId"
        :expanded-ids="expandedIds"
        :search-query="searchQuery"
        :level="level + 1"
        @toggle="emit('toggle', $event)"
        @select="emit('select', $event)"
      />
    </ul>
  </li>
</template>

<style scoped>
.schema-tree-node {
  position: relative;
  padding-left: calc(12px + var(--tree-level) * 16px);
}

.schema-tree-node::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: calc(var(--tree-level) * 16px + 5px);
  width: 1px;
  background: rgba(255, 255, 255, 0.1);
}

.schema-tree-node--selected > .schema-tree-node__content {
  background: rgba(0, 255, 136, 0.1);
  border-color: rgba(0, 255, 136, 0.4);
}

.schema-tree-node__content {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border: 1px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease;
}

.schema-tree-node__content:hover {
  background: rgba(0, 0, 0, 0.25);
}

.schema-tree-node__toggle {
  border: none;
  background: none;
  color: inherit;
  cursor: pointer;
  font-size: 12px;
  padding: 0;
  width: 16px;
  height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.schema-tree-node__spacer {
  width: 16px;
  height: 16px;
  display: inline-block;
}

.schema-tree-node__label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.schema-tree-node__label--match {
  color: var(--qui-accent-color);
}

.schema-tree-node__name {
  font-weight: 500;
}

.schema-tree-node__metrics {
  font-size: 12px;
  color: var(--qui-text-secondary);
}

.schema-tree-node__children {
  list-style: none;
  margin: 4px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
</style>
