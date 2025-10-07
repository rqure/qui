<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { CompleteEntitySchema, EntitySchema, EntityType, FieldSchema, FieldType } from '@/core/data/types'
import { useDataStore } from '@/stores/data'
import SchemaTreeView from './components/SchemaTreeView.vue'
import SchemaFieldEditor from './components/SchemaFieldEditor.vue'
import type { SchemaTreeNode } from './types'

const dataStore = useDataStore()

const loading = ref(true)
const loadError = ref<string | null>(null)
const detailError = ref<string | null>(null)
const saving = ref(false)
const statusMessage = ref<string | null>(null)
const statusTimer = ref<number | null>(null)
const searchQuery = ref('')

const entityNameMap = ref<Map<EntityType, string>>(new Map())
const directSchemaMap = ref<Map<EntityType, EntitySchema>>(new Map())
const completeSchemaMap = ref<Map<EntityType, CompleteEntitySchema>>(new Map())
const parentLookup = ref<Map<EntityType, EntityType[]>>(new Map())
const fieldNameMap = ref<Map<FieldType, string>>(new Map())
const treeNodes = ref<SchemaTreeNode[]>([])
const expandedNodes = ref<Set<EntityType>>(new Set())
const selectedEntityType = ref<EntityType | null>(null)

type PipelineResult = { type: string; entity_types?: EntityType[] }

const expandedIds = computed(() => Array.from(expandedNodes.value))

const fieldNameLookup = computed(() => {
  const record: Record<number, string> = {}
  for (const [key, value] of fieldNameMap.value.entries()) {
    record[Number(key)] = value
  }
  return record
})

const filteredTree = computed<SchemaTreeNode[]>(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) {
    return treeNodes.value
  }

  const filterNodes = (nodes: SchemaTreeNode[]): SchemaTreeNode[] => {
    const result: SchemaTreeNode[] = []
    for (const node of nodes) {
      const matches = node.name.toLowerCase().includes(query)
      const children = filterNodes(node.children)
      if (matches || children.length) {
        result.push({
          id: node.id,
          name: node.name,
          parentId: node.parentId,
          children,
          directFieldCount: node.directFieldCount,
          totalFieldCount: node.totalFieldCount,
        })
      }
    }
    return result
  }

  return filterNodes(treeNodes.value)
})

const selectedSchema = computed(() => {
  if (selectedEntityType.value === null) return null
  return directSchemaMap.value.get(selectedEntityType.value) ?? null
})

const selectedCompleteSchema = computed(() => {
  if (selectedEntityType.value === null) return null
  return completeSchemaMap.value.get(selectedEntityType.value) ?? null
})

const selectedEntityName = computed(() => {
  if (selectedEntityType.value === null) return ''
  return getEntityName(selectedEntityType.value)
})

const selectedParentNames = computed(() => {
  if (!selectedSchema.value) return [] as string[]
  return selectedSchema.value.inherit.map(parentId => getEntityName(parentId))
})

onMounted(async () => {
  await loadAll()
})

onUnmounted(() => {
  if (statusTimer.value) {
    clearTimeout(statusTimer.value)
    statusTimer.value = null
  }
})

function setStatus(message: string | null) {
  statusMessage.value = message
  if (statusTimer.value) {
    clearTimeout(statusTimer.value)
    statusTimer.value = null
  }
  if (message) {
    statusTimer.value = window.setTimeout(() => {
      statusMessage.value = null
      statusTimer.value = null
    }, 4000)
  }
}

async function loadAll() {
  loading.value = true
  loadError.value = null
  detailError.value = null
  try {
    const entityTypes = await fetchEntityTypes()
    await fetchSchemas(entityTypes)
    rebuildTree()

    if (entityTypes.length === 0) {
      selectedEntityType.value = null
      return
    }

    const preferred =
      selectedEntityType.value && directSchemaMap.value.has(selectedEntityType.value)
        ? selectedEntityType.value
        : entityTypes[0]

    await selectEntityType(preferred)
  } catch (error) {
    console.error('Failed to load schema editor data', error)
    loadError.value = error instanceof Error ? error.message : String(error)
  } finally {
    loading.value = false
  }
}

async function fetchEntityTypes(): Promise<EntityType[]> {
  const results = (await dataStore.executePipeline([{ type: 'GetEntityTypes' }])) as PipelineResult[]
  const entry = results.find(result => result.type === 'GetEntityTypes')
  if (!entry || !Array.isArray(entry.entity_types)) {
    throw new Error('Unable to load entity types from store')
  }

  const names = await Promise.all(entry.entity_types.map(id => dataStore.resolveEntityType(id)))
  const nameMap = new Map<EntityType, string>()
  entry.entity_types.forEach((id, index) => {
    nameMap.set(id, names[index])
  })
  entityNameMap.value = nameMap
  return entry.entity_types
}

async function fetchSchemas(entityTypes: EntityType[]) {
  const schemaEntries = await Promise.all(
    entityTypes.map(async id => {
      const [schema, complete] = await Promise.all([
        dataStore.getEntitySchema(id),
        dataStore.getCompleteEntitySchema(id),
      ])
      return { id, schema, complete }
    })
  )

  const directMap = new Map<EntityType, EntitySchema>()
  const completeMap = new Map<EntityType, CompleteEntitySchema>()
  const parentMap = new Map<EntityType, EntityType[]>()
  const allFieldTypes = new Set<FieldType>()

  for (const entry of schemaEntries) {
    directMap.set(entry.id, entry.schema)
    completeMap.set(entry.id, entry.complete)
    parentMap.set(entry.id, entry.schema.inherit || [])

    for (const key of Object.keys(entry.complete.fields || {})) {
      allFieldTypes.add(Number(key) as FieldType)
    }
  }

  directSchemaMap.value = directMap
  completeSchemaMap.value = completeMap
  parentLookup.value = parentMap

  if (allFieldTypes.size > 0) {
    await ensureFieldNames(Array.from(allFieldTypes))
  }
}

function rebuildTree() {
  const directMap = directSchemaMap.value
  const completeMap = completeSchemaMap.value
  const nameMap = entityNameMap.value
  const parentMap = parentLookup.value

  const childrenMap = new Map<EntityType, EntityType[]>()
  for (const [childId, parents] of parentMap.entries()) {
    for (const parentId of parents) {
      const list = childrenMap.get(parentId) ?? []
      list.push(childId)
      childrenMap.set(parentId, list)
    }
  }

  const typeIds = Array.from(directMap.keys())
  const roots = typeIds.filter(id => (parentMap.get(id) ?? []).length === 0)
  const rootIds = roots.length > 0 ? roots : typeIds

  const buildNode = (entityType: EntityType, parentId: EntityType | null, path: Set<EntityType>): SchemaTreeNode => {
    if (path.has(entityType)) {
      return {
        id: entityType,
        name: getEntityName(entityType),
        parentId,
        children: [],
        directFieldCount: Object.keys(directMap.get(entityType)?.fields || {}).length,
        totalFieldCount: Object.keys(completeMap.get(entityType)?.fields || {}).length,
      }
    }

    const nextPath = new Set(path)
    nextPath.add(entityType)

    const childIds = (childrenMap.get(entityType) ?? []).slice().sort((a, b) => {
      const left = nameMap.get(a) ?? `Entity ${a}`
      const right = nameMap.get(b) ?? `Entity ${b}`
      return left.localeCompare(right)
    })

    const children = childIds.map(childId => buildNode(childId, entityType, nextPath))

    return {
      id: entityType,
      name: getEntityName(entityType),
      parentId,
      children,
      directFieldCount: Object.keys(directMap.get(entityType)?.fields || {}).length,
      totalFieldCount: Object.keys(completeMap.get(entityType)?.fields || {}).length,
    }
  }

  const nodes = rootIds
    .slice()
    .sort((a, b) => getEntityName(a).localeCompare(getEntityName(b)))
    .map(id => buildNode(id, null, new Set()))

  if (expandedNodes.value.size === 0) {
    expandedNodes.value = new Set(rootIds)
  }

  treeNodes.value = nodes
}

function getEntityName(entityType: EntityType): string {
  return entityNameMap.value.get(entityType) ?? `Entity ${entityType}`
}

async function ensureFieldNames(fieldTypes: FieldType[]) {
  const missing = fieldTypes.filter(type => !fieldNameMap.value.has(type))
  if (missing.length === 0) return

  const names = await Promise.all(missing.map(type => dataStore.resolveFieldType(type)))
  const updated = new Map(fieldNameMap.value)
  missing.forEach((type, index) => {
    updated.set(type, names[index])
  })
  fieldNameMap.value = updated
}

async function selectEntityType(entityType: EntityType) {
  if (!directSchemaMap.value.has(entityType)) {
    await refreshEntitySchema(entityType)
  }

  selectedEntityType.value = entityType
  detailError.value = null
  await ensureFieldNamesForEntity(entityType)
  expandAncestors(entityType)
}

async function ensureFieldNamesForEntity(entityType: EntityType) {
  const fieldTypes = new Set<FieldType>()
  const direct = directSchemaMap.value.get(entityType)
  const complete = completeSchemaMap.value.get(entityType)

  if (direct) {
    Object.keys(direct.fields || {}).forEach(key => fieldTypes.add(Number(key) as FieldType))
  }
  if (complete) {
    Object.keys(complete.fields || {}).forEach(key => fieldTypes.add(Number(key) as FieldType))
  }

  if (fieldTypes.size > 0) {
    await ensureFieldNames(Array.from(fieldTypes))
  }
}

async function refreshEntitySchema(entityType: EntityType) {
  const [schema, complete] = await Promise.all([
    dataStore.getEntitySchema(entityType),
    dataStore.getCompleteEntitySchema(entityType),
  ])

  const updatedDirect = new Map(directSchemaMap.value)
  updatedDirect.set(entityType, schema)
  directSchemaMap.value = updatedDirect

  const updatedComplete = new Map(completeSchemaMap.value)
  updatedComplete.set(entityType, complete)
  completeSchemaMap.value = updatedComplete

  const updatedParents = new Map(parentLookup.value)
  updatedParents.set(entityType, schema.inherit || [])
  parentLookup.value = updatedParents

  const allFieldTypes = new Set<FieldType>()
  Object.keys(complete.fields || {}).forEach(key => allFieldTypes.add(Number(key) as FieldType))
  if (allFieldTypes.size > 0) {
    await ensureFieldNames(Array.from(allFieldTypes))
  }
}

function expandAncestors(entityType: EntityType, visited: Set<EntityType> = new Set()) {
  if (visited.has(entityType)) return
  visited.add(entityType)

  const parents = parentLookup.value.get(entityType) ?? []
  if (parents.length === 0) return

  const next = new Set(expandedNodes.value)
  for (const parentId of parents) {
    next.add(parentId)
    expandAncestors(parentId, visited)
  }
  expandedNodes.value = next
}

function toggleExpanded(entityType: EntityType) {
  const next = new Set(expandedNodes.value)
  if (next.has(entityType)) {
    next.delete(entityType)
  } else {
    next.add(entityType)
  }
  expandedNodes.value = next
}

async function handleTreeSelect(entityType: EntityType) {
  await selectEntityType(entityType)
}

async function handleSchemaSave(payload: { fields: Record<FieldType, FieldSchema> }) {
  if (selectedEntityType.value === null) return

  const schema = directSchemaMap.value.get(selectedEntityType.value)
  if (!schema) {
    detailError.value = 'Schema data is no longer available. Please reload.'
    return
  }

  saving.value = true
  detailError.value = null
  setStatus(null)

  try {
    await dataStore.updateSchema({
      entity_type: selectedEntityType.value,
      inherit: schema.inherit,
      fields: payload.fields,
    })

    await refreshEntitySchema(selectedEntityType.value)
    rebuildTree()
    setStatus('Schema updated successfully')
  } catch (error) {
    console.error('Failed to update entity schema', error)
    detailError.value = error instanceof Error ? error.message : String(error)
  } finally {
    saving.value = false
  }
}

function handleRefresh() {
  loadAll()
}
</script>

<template>
  <div class="schema-editor">
    <div class="schema-editor__header">
      <div class="schema-editor__title">Schema Editor</div>
      <div class="schema-editor__actions">
        <input
          v-model="searchQuery"
          class="schema-editor__search"
          type="search"
          placeholder="Search entity types"
        />
        <button class="schema-editor__refresh" type="button" @click="handleRefresh">
          Refresh
        </button>
      </div>
    </div>

    <div v-if="loadError" class="schema-editor__error">
      {{ loadError }}
    </div>

    <div v-if="statusMessage" class="schema-editor__status">
      {{ statusMessage }}
    </div>

    <div class="schema-editor__body">
      <div class="schema-editor__tree">
        <div class="schema-editor__panel-title">Entity Types</div>
        <div v-if="loading" class="schema-editor__loading">Loading schemas…</div>
        <div v-else class="schema-editor__tree-container">
          <SchemaTreeView
            :nodes="filteredTree"
            :selected-id="selectedEntityType"
            :expanded-ids="expandedIds"
            :search-query="searchQuery"
            @toggle="toggleExpanded"
            @select="handleTreeSelect"
          />
        </div>
      </div>

      <div class="schema-editor__details">
        <div class="schema-editor__panel-title">Entity Details</div>

        <div v-if="detailError" class="schema-editor__error">
          {{ detailError }}
        </div>

        <div v-if="!selectedSchema" class="schema-editor__empty">
          <p>Select an entity type to inspect and edit its schema.</p>
        </div>

        <div v-else class="schema-editor__entity">
          <div class="schema-editor__entity-header">
            <h2 class="schema-editor__entity-name">{{ selectedEntityName }}</h2>
            <span class="schema-editor__entity-id">ID: {{ selectedEntityType }}</span>
          </div>
          <div class="schema-editor__entity-meta">
            <div>
              <span class="schema-editor__meta-label">Parents:</span>
              <span v-if="selectedParentNames.length === 0">None</span>
              <span v-else>{{ selectedParentNames.join(', ') }}</span>
            </div>
            <div>
              <span class="schema-editor__meta-label">Direct Fields:</span>
              {{ Object.keys(selectedSchema.fields || {}).length }}
            </div>
            <div>
              <span class="schema-editor__meta-label">Total Fields:</span>
              {{ Object.keys(selectedCompleteSchema?.fields || {}).length }}
            </div>
          </div>

          <SchemaFieldEditor
            :entity-type="selectedEntityType"
            :entity-name="selectedEntityName"
            :schema="selectedSchema"
            :complete-schema="selectedCompleteSchema"
            :field-names="fieldNameLookup"
            :parent-names="selectedParentNames"
            :saving="saving"
            @save="handleSchemaSave"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.schema-editor {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  padding: 16px;
  background: rgba(0, 0, 0, 0.35);
  color: var(--qui-text-primary);
}

.schema-editor__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.schema-editor__title {
  font-size: 20px;
  font-weight: 600;
}

.schema-editor__actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.schema-editor__search {
  padding: 6px 10px;
  border: 1px solid var(--qui-hover-border);
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.25);
  color: inherit;
}

.schema-editor__search:focus {
  outline: none;
  border-color: var(--qui-accent-color);
}

.schema-editor__refresh {
  padding: 6px 12px;
  border: 1px solid var(--qui-hover-border);
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.25);
  color: inherit;
  cursor: pointer;
  transition: background 0.2s ease;
}

.schema-editor__refresh:hover {
  background: rgba(0, 0, 0, 0.4);
}

.schema-editor__error {
  padding: 8px 12px;
  border-radius: 6px;
  background: rgba(255, 69, 58, 0.15);
  color: #ff8a80;
}

.schema-editor__status {
  padding: 8px 12px;
  border-radius: 6px;
  background: rgba(0, 255, 136, 0.12);
  color: #7dffbe;
}

.schema-editor__body {
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: 16px;
  flex: 1;
  min-height: 0;
}

.schema-editor__tree,
.schema-editor__details {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: rgba(0, 0, 0, 0.25);
  border-radius: 12px;
  min-height: 0;
}

.schema-editor__tree {
  overflow: hidden;
}

.schema-editor__details {
  overflow: auto;
}

.schema-editor__panel-title {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: var(--qui-text-secondary);
}

.schema-editor__loading {
  padding: 12px;
  text-align: center;
  color: var(--qui-text-secondary);
}

.schema-editor__tree-container {
  flex: 1;
  overflow: auto;
  padding-right: 8px;
}

.schema-editor__entity {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 0;
}

.schema-editor__entity-header {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.schema-editor__entity-name {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}

.schema-editor__entity-id {
  font-size: 13px;
  color: var(--qui-text-secondary);
}

.schema-editor__entity-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 13px;
  color: var(--qui-text-secondary);
}

.schema-editor__meta-label {
  font-weight: 600;
  margin-right: 4px;
  color: var(--qui-text-primary);
}

.schema-editor__empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--qui-text-secondary);
  text-align: center;
}

@media (max-width: 1280px) {
  .schema-editor__body {
    grid-template-columns: 1fr;
  }

  .schema-editor__tree {
    max-height: 280px;
  }
}
</style>
