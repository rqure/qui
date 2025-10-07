<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { CompleteEntitySchema, EntitySchema, EntityType, FieldSchema, FieldType, Value } from '@/core/data/types'
import { FieldSchemaHelpers, ValueHelpers } from '@/core/data/types'
import { useDataStore } from '@/stores/data'

type FieldKind =
  | 'String'
  | 'Int'
  | 'Float'
  | 'Bool'
  | 'Timestamp'
  | 'EntityReference'
  | 'EntityList'
  | 'Choice'
  | 'Blob'

interface EditableField {
  fieldType: FieldType
  name: string
  rank: number
  storageScope: 'Runtime' | 'Configuration'
  kind: FieldKind
  schema: FieldSchema
}

const props = defineProps<{
  entityType: EntityType | null
  entityName: string
  schema: EntitySchema | null
  completeSchema: CompleteEntitySchema | null
  fieldNames: Record<number, string>
  parentNames: string[]
  saving: boolean
}>()

const emit = defineEmits<{
  (e: 'save', payload: { fields: Record<FieldType, FieldSchema> }): void
}>()

const dataStore = useDataStore()

const editableFields = ref<EditableField[]>([])
const dirty = ref(false)
const formError = ref<string | null>(null)

const newField = reactive({
  name: '',
  kind: 'String' as FieldKind,
  rank: 0,
  storageScope: 'Runtime' as 'Runtime' | 'Configuration',
  defaultValue: '',
  choices: '',
})

watch(
  () => ({ schema: props.schema, fieldNames: props.fieldNames }),
  ({ schema }) => {
    if (!schema) {
      editableFields.value = []
      dirty.value = false
      formError.value = null
      return
    }

    const rows: EditableField[] = []
    for (const [key, value] of Object.entries(schema.fields || {})) {
      const fieldType = Number(key) as FieldType
      const schemaValue = cloneSchema(value as FieldSchema)
      rows.push({
        fieldType,
        name: props.fieldNames[fieldType] ?? `Field ${fieldType}`,
        rank: FieldSchemaHelpers.getRank(schemaValue),
        storageScope: FieldSchemaHelpers.getStorageScope(schemaValue),
        kind: detectKind(schemaValue),
        schema: schemaValue,
      })
    }
    editableFields.value = rows.sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name))
    dirty.value = false
    formError.value = null
  },
  { immediate: true }
)

const hasChanges = computed(() => dirty.value && editableFields.value.length > 0)

const inheritedFields = computed(() => {
  if (!props.completeSchema || !props.schema) return [] as Array<{ fieldType: FieldType; name: string; rank: number; kind: FieldKind }>
  const direct = new Set<number>(Object.keys(props.schema.fields || {}).map(Number))
  const inherited: Array<{ fieldType: FieldType; name: string; rank: number; kind: FieldKind }> = []
  for (const [key, value] of Object.entries(props.completeSchema.fields || {})) {
    const fieldType = Number(key) as FieldType
    if (direct.has(fieldType)) continue
    const schemaValue = value as FieldSchema
    inherited.push({
      fieldType,
      name: props.fieldNames[fieldType] ?? `Field ${fieldType}`,
      rank: FieldSchemaHelpers.getRank(schemaValue),
      kind: detectKind(schemaValue),
    })
  }
  return inherited.sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name))
})

const kindOptions: Array<{ label: string; value: FieldKind }> = [
  { label: 'String', value: 'String' },
  { label: 'Integer', value: 'Int' },
  { label: 'Float', value: 'Float' },
  { label: 'Boolean', value: 'Bool' },
  { label: 'Timestamp', value: 'Timestamp' },
  { label: 'Entity Reference', value: 'EntityReference' },
  { label: 'Entity List', value: 'EntityList' },
  { label: 'Choice', value: 'Choice' },
  { label: 'Binary (Blob)', value: 'Blob' },
]

const storageOptions: Array<'Runtime' | 'Configuration'> = ['Runtime', 'Configuration']

function detectKind(schema: FieldSchema): FieldKind {
  if ('String' in schema) return 'String'
  if ('Int' in schema) return 'Int'
  if ('Float' in schema) return 'Float'
  if ('Bool' in schema) return 'Bool'
  if ('Timestamp' in schema) return 'Timestamp'
  if ('EntityReference' in schema) return 'EntityReference'
  if ('EntityList' in schema) return 'EntityList'
  if ('Choice' in schema) return 'Choice'
  return 'Blob'
}

function cloneSchema(schema: FieldSchema): FieldSchema {
  return JSON.parse(JSON.stringify(schema)) as FieldSchema
}

function handleRankCommit(field: EditableField) {
  field.rank = Number.isFinite(field.rank) ? field.rank : 0
  field.schema = FieldSchemaHelpers.setRank(field.schema, field.rank)
  sortEditableFields()
  dirty.value = true
}

function handleScopeChange(field: EditableField, scope: 'Runtime' | 'Configuration') {
  field.storageScope = scope
  field.schema = applyStorageScope(field.schema, scope)
  dirty.value = true
}

function removeField(fieldType: FieldType) {
  editableFields.value = editableFields.value.filter(field => field.fieldType !== fieldType)
  dirty.value = true
}

function sortEditableFields() {
  editableFields.value = editableFields.value
    .slice()
    .sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name))
}

function resetChanges() {
  if (props.schema) {
    const snapshot = JSON.parse(JSON.stringify(props.schema.fields || {}))
    const rows: EditableField[] = []
    for (const [key, value] of Object.entries(snapshot)) {
      const fieldType = Number(key) as FieldType
      const schemaValue = value as FieldSchema
      rows.push({
        fieldType,
        name: props.fieldNames[fieldType] ?? `Field ${fieldType}`,
        rank: FieldSchemaHelpers.getRank(schemaValue),
        storageScope: FieldSchemaHelpers.getStorageScope(schemaValue),
        kind: detectKind(schemaValue),
        schema: schemaValue,
      })
    }
    editableFields.value = rows.sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name))
  } else {
    editableFields.value = []
  }
  dirty.value = false
  formError.value = null
}

async function addField() {
  if (!props.entityType) return

  const name = newField.name.trim()
  if (!name) {
    formError.value = 'Field name is required.'
    return
  }

  try {
    const fieldType = await dataStore.getFieldType(name)

    if (editableFields.value.some(field => field.fieldType === fieldType)) {
      formError.value = 'Field already exists in this schema.'
      return
    }

    let schema: FieldSchema
    if (newField.kind === 'Choice') {
      const choices = newField.choices
        .split(',')
        .map(item => item.trim())
        .filter(Boolean)
      if (choices.length === 0) {
        formError.value = 'Provide at least one choice option.'
        return
      }
      const defaultIndex = Math.max(0, Math.min(Number(newField.defaultValue) || 0, choices.length - 1))
      schema = {
        Choice: {
          field_type: fieldType,
          default_value: defaultIndex,
          rank: newField.rank,
          choices,
          storage_scope: newField.storageScope,
        },
      }
    } else {
      const defaultValue = buildDefaultValue(newField.kind, newField.defaultValue)
      schema = FieldSchemaHelpers.createFromValue(fieldType, defaultValue, newField.rank, newField.storageScope)
    }

    editableFields.value = [
      ...editableFields.value,
      {
        fieldType,
        name,
        rank: newField.rank,
        storageScope: newField.storageScope,
        kind: newField.kind,
        schema,
      },
    ].sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name))

    newField.name = ''
    newField.rank = 0
    newField.defaultValue = ''
    newField.choices = ''
    newField.kind = 'String'
    newField.storageScope = 'Runtime'
    formError.value = null
    dirty.value = true
  } catch (error) {
    console.error('Failed to resolve field type', error)
    formError.value = error instanceof Error ? error.message : String(error)
  }
}

function buildDefaultValue(kind: FieldKind, raw: string): Value {
  switch (kind) {
    case 'Int':
      return ValueHelpers.int(Number.isFinite(Number(raw)) ? Number(raw) : 0)
    case 'Float':
      return ValueHelpers.float(Number.isFinite(Number(raw)) ? Number(raw) : 0)
    case 'Bool':
      return ValueHelpers.bool(raw.trim().toLowerCase() === 'true')
    case 'Timestamp': {
      const parsed = raw ? Date.parse(raw) : Date.now()
      return ValueHelpers.timestamp(Number.isFinite(parsed) ? parsed : Date.now())
    }
    case 'EntityReference': {
      const parsed = Number(raw)
      return ValueHelpers.entityRef(Number.isFinite(parsed) ? parsed : null)
    }
    case 'EntityList': {
      const list = raw
        .split(',')
        .map(item => Number(item.trim()))
        .filter(Number.isFinite)
      return ValueHelpers.entityList(list as number[])
    }
    case 'Choice':
      return ValueHelpers.choice(Number.isFinite(Number(raw)) ? Number(raw) : 0)
    case 'Blob':
      return ValueHelpers.blob([])
    default:
      return ValueHelpers.string(raw)
  }
}

function applyStorageScope(schema: FieldSchema, scope: 'Runtime' | 'Configuration'): FieldSchema {
  if ('String' in schema) return { String: { ...schema.String, storage_scope: scope } }
  if ('Int' in schema) return { Int: { ...schema.Int, storage_scope: scope } }
  if ('Float' in schema) return { Float: { ...schema.Float, storage_scope: scope } }
  if ('Bool' in schema) return { Bool: { ...schema.Bool, storage_scope: scope } }
  if ('Timestamp' in schema) return { Timestamp: { ...schema.Timestamp, storage_scope: scope } }
  if ('EntityReference' in schema) return { EntityReference: { ...schema.EntityReference, storage_scope: scope } }
  if ('EntityList' in schema) return { EntityList: { ...schema.EntityList, storage_scope: scope } }
  if ('Choice' in schema) return { Choice: { ...schema.Choice, storage_scope: scope } }
  return { Blob: { ...schema.Blob, storage_scope: scope } }
}

function formatDefault(schema: FieldSchema): string {
  if ('String' in schema) return schema.String.default_value || 'Empty string'
  if ('Int' in schema) return schema.Int.default_value.toString()
  if ('Float' in schema) return schema.Float.default_value.toString()
  if ('Bool' in schema) return schema.Bool.default_value ? 'true' : 'false'
  if ('Timestamp' in schema) return new Date(schema.Timestamp.default_value).toISOString()
  if ('EntityReference' in schema) return schema.EntityReference.default_value !== null ? String(schema.EntityReference.default_value) : 'null'
  if ('EntityList' in schema) return schema.EntityList.default_value.length ? schema.EntityList.default_value.join(', ') : '[]'
  if ('Choice' in schema) {
    const { default_value: index, choices } = schema.Choice
    return choices[index] ?? `Choice #${index}`
  }
  return schema.Blob.default_value.length ? `${schema.Blob.default_value.length} bytes` : 'Empty blob'
}

function saveChanges() {
  if (!props.schema) return
  const fields: Record<FieldType, FieldSchema> = {}
  for (const field of editableFields.value) {
    const updated = applyStorageScope(FieldSchemaHelpers.setRank(field.schema, field.rank), field.storageScope)
    fields[field.fieldType] = updated
  }
  emit('save', { fields })
}
</script>

<template>
  <div class="schema-field-editor">
    <div class="schema-field-editor__section">
      <div class="schema-field-editor__section-title">Direct Fields</div>
      <div v-if="editableFields.length === 0" class="schema-field-editor__empty">
        This schema has no direct fields. Add a field below to begin.
      </div>
      <table v-else class="schema-field-editor__table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Rank</th>
            <th>Storage</th>
            <th>Default</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="field in editableFields" :key="field.fieldType">
            <td>{{ field.name }}</td>
            <td>{{ field.kind }}</td>
            <td>
              <input
                v-model.number="field.rank"
                type="number"
                class="schema-field-editor__input"
                @change="handleRankCommit(field)"
              />
            </td>
            <td>
              <select
                v-model="field.storageScope"
                class="schema-field-editor__select"
                @change="handleScopeChange(field, field.storageScope)"
              >
                <option v-for="option in storageOptions" :key="option" :value="option">{{ option }}</option>
              </select>
            </td>
            <td>{{ formatDefault(field.schema) }}</td>
            <td>
              <button type="button" class="schema-field-editor__remove" @click="removeField(field.fieldType)">
                Remove
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="inheritedFields.length" class="schema-field-editor__section">
      <div class="schema-field-editor__section-title">Inherited Fields</div>
      <table class="schema-field-editor__table schema-field-editor__table--compact">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Rank</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="field in inheritedFields" :key="field.fieldType">
            <td>{{ field.name }}</td>
            <td>{{ field.kind }}</td>
            <td>{{ field.rank }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="schema-field-editor__section">
      <div class="schema-field-editor__section-title">Add Field</div>
      <div class="schema-field-editor__form">
        <div class="schema-field-editor__form-row">
          <label class="schema-field-editor__label">Name</label>
          <input v-model="newField.name" type="text" class="schema-field-editor__input" placeholder="Field name" />
        </div>
        <div class="schema-field-editor__form-row">
          <label class="schema-field-editor__label">Type</label>
          <select v-model="newField.kind" class="schema-field-editor__select">
            <option v-for="option in kindOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </div>
        <div class="schema-field-editor__form-row">
          <label class="schema-field-editor__label">Rank</label>
          <input v-model.number="newField.rank" type="number" class="schema-field-editor__input" />
        </div>
        <div class="schema-field-editor__form-row">
          <label class="schema-field-editor__label">Storage</label>
          <select v-model="newField.storageScope" class="schema-field-editor__select">
            <option v-for="option in storageOptions" :key="option" :value="option">{{ option }}</option>
          </select>
        </div>
        <div v-if="newField.kind === 'Choice'" class="schema-field-editor__form-row">
          <label class="schema-field-editor__label">Choices (comma separated)</label>
          <input v-model="newField.choices" type="text" class="schema-field-editor__input" placeholder="Option A, Option B" />
        </div>
        <div class="schema-field-editor__form-row">
          <label class="schema-field-editor__label">Default Value</label>
          <input v-model="newField.defaultValue" type="text" class="schema-field-editor__input" placeholder="Depends on type" />
        </div>
        <div class="schema-field-editor__form-actions">
          <button type="button" class="schema-field-editor__add" @click="addField">Add Field</button>
        </div>
        <div v-if="formError" class="schema-field-editor__form-error">{{ formError }}</div>
      </div>
    </div>

    <div class="schema-field-editor__footer">
      <button
        type="button"
        class="schema-field-editor__reset"
        :disabled="props.saving || !dirty"
        @click="resetChanges"
      >
        Reset
      </button>
      <button
        type="button"
        class="schema-field-editor__save"
        :disabled="props.saving || !hasChanges"
        @click="saveChanges"
      >
        <span v-if="props.saving">Saving…</span>
        <span v-else>Save Changes</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.schema-field-editor {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.schema-field-editor__section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.schema-field-editor__section-title {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  color: var(--qui-text-secondary);
}

.schema-field-editor__empty {
  padding: 12px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.2);
  text-align: center;
  color: var(--qui-text-secondary);
}

.schema-field-editor__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  background: rgba(0, 0, 0, 0.15);
  border-radius: 8px;
  overflow: hidden;
}

.schema-field-editor__table th,
.schema-field-editor__table td {
  padding: 8px 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.schema-field-editor__table thead {
  background: rgba(0, 0, 0, 0.3);
}

.schema-field-editor__table tbody tr:hover {
  background: rgba(0, 0, 0, 0.25);
}

.schema-field-editor__table--compact td,
.schema-field-editor__table--compact th {
  padding: 6px 8px;
}

.schema-field-editor__input,
.schema-field-editor__select {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid var(--qui-hover-border);
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.25);
  color: inherit;
}

.schema-field-editor__input:focus,
.schema-field-editor__select:focus {
  outline: none;
  border-color: var(--qui-accent-color);
}

.schema-field-editor__remove {
  border: none;
  background: rgba(255, 69, 58, 0.2);
  color: #ff8a80;
  padding: 4px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.schema-field-editor__remove:hover {
  background: rgba(255, 69, 58, 0.35);
}

.schema-field-editor__form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  background: rgba(0, 0, 0, 0.15);
  padding: 16px;
  border-radius: 8px;
}

.schema-field-editor__form-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.schema-field-editor__label {
  font-size: 12px;
  color: var(--qui-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.schema-field-editor__form-actions {
  display: flex;
  align-items: flex-end;
}

.schema-field-editor__add {
  padding: 8px 16px;
  border-radius: 6px;
  border: 1px solid var(--qui-hover-border);
  background: rgba(0, 0, 0, 0.25);
  color: inherit;
  cursor: pointer;
}

.schema-field-editor__add:hover {
  background: rgba(0, 0, 0, 0.4);
}

.schema-field-editor__form-error {
  grid-column: 1 / -1;
  padding: 8px 12px;
  border-radius: 6px;
  background: rgba(255, 69, 58, 0.15);
  color: #ff8a80;
}

.schema-field-editor__footer {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.schema-field-editor__save,
.schema-field-editor__reset {
  padding: 8px 16px;
  border-radius: 6px;
  border: 1px solid var(--qui-hover-border);
  background: rgba(0, 0, 0, 0.25);
  color: inherit;
  cursor: pointer;
  transition: background 0.2s ease;
}

.schema-field-editor__save[disabled],
.schema-field-editor__reset[disabled] {
  opacity: 0.5;
  cursor: not-allowed;
}

.schema-field-editor__save:not([disabled]):hover,
.schema-field-editor__reset:not([disabled]):hover {
  background: rgba(0, 0, 0, 0.4);
}

.schema-field-editor__save {
  background: rgba(0, 255, 136, 0.1);
  border-color: rgba(0, 255, 136, 0.4);
}

.schema-field-editor__save:not([disabled]):hover {
  background: rgba(0, 255, 136, 0.2);
}
</style>
