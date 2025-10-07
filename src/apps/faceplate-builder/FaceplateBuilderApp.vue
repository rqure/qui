<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import type { EntityId, EntityType } from '@/core/data/types';
import { ValueHelpers } from '@/core/data/types';
import { useDataStore } from '@/stores/data';
import FaceplateRuntime from './components/FaceplateRuntime.vue';
import { FaceplateDataService, type FaceplateComponentRecord, type FaceplateRecord, type FaceplateBindingLibraryRecord, type FaceplateBindingDefinition, type FaceplateConfiguration } from '@/apps/faceplate-builder/utils/faceplate-data';

interface FaceplateFolders {
  root: EntityId | null;
  components: EntityId | null;
  bindings: EntityId | null;
  faceplates: EntityId | null;
}

const props = defineProps<{
  initialFaceplateId?: EntityId | null;
  initialEntityId?: EntityId | null;
}>();

const dataStore = useDataStore();
const service = new FaceplateDataService(dataStore);

const faceplateEntityTypeId = ref<EntityType | null>(null);
const componentEntityTypeId = ref<EntityType | null>(null);
const bindingEntityTypeId = ref<EntityType | null>(null);
const folderEntityTypeId = ref<EntityType | null>(null);

const folders = reactive<FaceplateFolders>({
  root: null,
  components: null,
  bindings: null,
  faceplates: null,
});

const faceplates = ref<FaceplateRecord[]>([]);
const componentsLibrary = ref<FaceplateComponentRecord[]>([]);
const bindingsLibrary = ref<FaceplateBindingLibraryRecord[]>([]);
const availableEntityTypes = ref<string[]>([]);

const selectedFaceplateId = ref<EntityId | null>(props.initialFaceplateId ?? null);
const editingFaceplate = ref<FaceplateRecord | null>(null);
const componentSelection = ref<EntityId[]>([]);
const previewEntityId = ref<EntityId | null>(props.initialEntityId ?? null);
const associationTargetEntityId = ref<EntityId | null>(props.initialEntityId ?? null);

const configurationEditor = ref<string>('{}');
const bindingsEditor = ref<string>('[]');
const notificationEditor = ref<string>('[]');

const configurationError = ref<string | null>(null);
const bindingsError = ref<string | null>(null);
const notificationError = ref<string | null>(null);

const parsedConfiguration = ref<FaceplateConfiguration>({ layout: [], bindings: [] });
const parsedBindings = ref<FaceplateBindingDefinition[]>([]);
const parsedNotifications = ref<any[]>([]);

const loading = ref(true);
const saving = ref(false);
const message = ref<string>('');
const errorMessage = ref<string>('');

const previewFaceplate = computed<FaceplateRecord | null>(() => {
  if (!editingFaceplate.value) return null;
  return {
    ...editingFaceplate.value,
    components: [...componentSelection.value],
    configurationRaw: configurationEditor.value,
    configuration: parsedConfiguration.value,
    bindingsRaw: bindingsEditor.value,
    bindings: parsedBindings.value,
    notificationChannelsRaw: notificationEditor.value,
    notificationChannels: parsedNotifications.value,
  };
});

watch(configurationEditor, (text) => {
  try {
    const parsed = JSON.parse(text || '{}');
    parsedConfiguration.value = normalizeConfiguration(parsed);
    configurationError.value = null;
  } catch (err) {
    configurationError.value = err instanceof Error ? err.message : 'Invalid JSON';
  }
}, { immediate: true });

watch(bindingsEditor, (text) => {
  try {
    const parsed = JSON.parse(text || '[]');
    parsedBindings.value = Array.isArray(parsed) ? parsed : [];
    bindingsError.value = null;
  } catch (err) {
    bindingsError.value = err instanceof Error ? err.message : 'Invalid bindings JSON';
  }
}, { immediate: true });

watch(notificationEditor, (text) => {
  try {
    const parsed = JSON.parse(text || '[]');
    parsedNotifications.value = Array.isArray(parsed) ? parsed : [];
    notificationError.value = null;
  } catch (err) {
    notificationError.value = err instanceof Error ? err.message : 'Invalid notification JSON';
  }
}, { immediate: true });

async function initialize() {
  loading.value = true;
  errorMessage.value = '';

  try {
    await resolveEntityTypeIds();
    await resolveFolders();
    await loadEntityTypes();
    await loadComponentLibrary();
    await loadBindingLibrary();
    await loadFaceplates();

    if (selectedFaceplateId.value && faceplates.value.some((fp) => fp.id === selectedFaceplateId.value)) {
      await selectFaceplate(selectedFaceplateId.value);
    } else if (faceplates.value.length > 0) {
      await selectFaceplate(faceplates.value[0].id);
    }
  } catch (err) {
    console.error('Failed to initialize faceplate builder', err);
    errorMessage.value = err instanceof Error ? err.message : 'Initialization failed';
  } finally {
    loading.value = false;
  }
}

async function resolveEntityTypeIds() {
  faceplateEntityTypeId.value = await service.getEntityType('Faceplate');
  componentEntityTypeId.value = await service.getEntityType('FaceplateComponent');
  bindingEntityTypeId.value = await service.getEntityType('FaceplateBinding');
  folderEntityTypeId.value = await service.getEntityType('Folder');
}

async function resolveFolders() {
  if (!folderEntityTypeId.value) return;

  const folderIds = await dataStore.findEntities(folderEntityTypeId.value, 'Name == "Faceplate Builder"');
  folders.root = folderIds[0] ?? null;

  if (folders.root) {
    const componentFolders = await dataStore.findEntities(folderEntityTypeId.value, `Name == "Component Library" && Parent == ${folders.root}`);
    folders.components = componentFolders[0] ?? null;

    const bindingFolders = await dataStore.findEntities(folderEntityTypeId.value, `Name == "Bindings" && Parent == ${folders.root}`);
    folders.bindings = bindingFolders[0] ?? null;

    const faceplateFolders = await dataStore.findEntities(folderEntityTypeId.value, `Name == "Faceplates" && Parent == ${folders.root}`);
    folders.faceplates = faceplateFolders[0] ?? null;
  }
}

async function loadEntityTypes() {
  const typeIds = await dataStore.getEntityTypes();
  const names = await Promise.all(typeIds.map((id) => dataStore.resolveEntityType(id).catch(() => null)));
  availableEntityTypes.value = names.filter((name): name is string => Boolean(name)).sort((a, b) => a.localeCompare(b));
}

async function loadFaceplates() {
  if (!faceplateEntityTypeId.value) return;
  const ids = await dataStore.findEntities(faceplateEntityTypeId.value, folders.faceplates ? `Parent == ${folders.faceplates}` : undefined);
  faceplates.value = (await service.readFaceplates(ids)).sort((a, b) => a.name.localeCompare(b.name));
}

async function loadComponentLibrary() {
  if (!componentEntityTypeId.value) return;
  const ids = await dataStore.findEntities(componentEntityTypeId.value, folders.components ? `Parent == ${folders.components}` : undefined);
  componentsLibrary.value = (await Promise.all(ids.map((id) => service.readComponent(id)))).sort((a, b) => a.name.localeCompare(b.name));
}

async function loadBindingLibrary() {
  if (!bindingEntityTypeId.value) return;
  const ids = await dataStore.findEntities(bindingEntityTypeId.value, folders.bindings ? `Parent == ${folders.bindings}` : undefined);
  bindingsLibrary.value = (await Promise.all(ids.map((id) => service.readBinding(id)))).sort((a, b) => a.name.localeCompare(b.name));
}

async function selectFaceplate(faceplateId: EntityId) {
  const record = faceplates.value.find((fp) => fp.id === faceplateId) ?? await service.readFaceplate(faceplateId);
  editingFaceplate.value = {
    ...record,
    configuration: normalizeConfiguration(record.configuration),
  };
  selectedFaceplateId.value = faceplateId;
  componentSelection.value = [...record.components];
  configurationEditor.value = JSON.stringify(record.configuration, null, 2);
  bindingsEditor.value = JSON.stringify(record.bindings, null, 2);
  notificationEditor.value = JSON.stringify(record.notificationChannels, null, 2);
  message.value = '';
}

function normalizeConfiguration(config: any): FaceplateConfiguration {
  const layout = Array.isArray(config?.layout) ? config.layout : [];
  const bindings = Array.isArray(config?.bindings) ? config.bindings : [];
  return {
    layout,
    bindings,
    metadata: typeof config?.metadata === 'object' && config.metadata ? config.metadata : {},
  };
}

async function createFaceplate() {
  if (!faceplateEntityTypeId.value) return;
  saving.value = true;
  errorMessage.value = '';
  message.value = '';

  try {
    const name = `Faceplate ${faceplates.value.length + 1}`;
    const newId = await dataStore.createEntity(faceplateEntityTypeId.value, folders.faceplates, name);

    const defaultConfig = {
      layout: [],
      bindings: [],
    };

    await service.writeString(newId, 'Configuration', JSON.stringify(defaultConfig, null, 2));
    await service.writeString(newId, 'Bindings', '[]');
    await service.writeString(newId, 'NotificationChannels', '[]');
    await service.writeString(newId, 'TargetEntityType', '');

    await loadFaceplates();
    await selectFaceplate(newId);
    message.value = 'Faceplate created successfully.';
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Failed to create faceplate';
  } finally {
    saving.value = false;
  }
}

async function saveFaceplate() {
  if (!editingFaceplate.value || !selectedFaceplateId.value) return;

  if (configurationError.value || bindingsError.value || notificationError.value) {
    errorMessage.value = 'Please resolve configuration errors before saving.';
    return;
  }

  saving.value = true;
  errorMessage.value = '';
  message.value = '';

  try {
    const faceplateId = selectedFaceplateId.value;
    const targetEntityType = editingFaceplate.value.targetEntityType || '';

    await service.writeString(faceplateId, 'Name', editingFaceplate.value.name || `Faceplate ${faceplateId}`);
    await service.writeString(faceplateId, 'TargetEntityType', targetEntityType);
    await service.writeString(faceplateId, 'Configuration', JSON.stringify(parsedConfiguration.value, null, 2));
    await service.writeString(faceplateId, 'Bindings', JSON.stringify(parsedBindings.value, null, 2));
    await service.writeString(faceplateId, 'NotificationChannels', JSON.stringify(parsedNotifications.value, null, 2));
    await service.writeEntityList(faceplateId, 'Components', [...componentSelection.value]);

    await loadFaceplates();
    await selectFaceplate(faceplateId);
    message.value = 'Faceplate saved successfully.';
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Failed to save faceplate';
  } finally {
    saving.value = false;
  }
}

async function attachFaceplateToEntity() {
  if (!selectedFaceplateId.value || !associationTargetEntityId.value) {
    errorMessage.value = 'Select a faceplate and target entity before attaching.';
    return;
  }

  try {
    const faceplatesFieldType = await service.getFieldType('Faceplates');
    const [value] = await dataStore.read(associationTargetEntityId.value, [faceplatesFieldType]);
    let current: EntityId[] = [];
    if (value && ValueHelpers.isEntityList(value)) {
      current = value.EntityList;
    }

    if (!current.includes(selectedFaceplateId.value)) {
      current = [...current, selectedFaceplateId.value];
      await dataStore.write(associationTargetEntityId.value, [faceplatesFieldType], ValueHelpers.entityList(current));
      message.value = 'Faceplate attached to entity.';
    } else {
      message.value = 'Entity already references this faceplate.';
    }
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Failed to attach faceplate';
  }
}

async function detachFaceplateFromEntity() {
  if (!selectedFaceplateId.value || !associationTargetEntityId.value) {
    errorMessage.value = 'Select a faceplate and target entity before detaching.';
    return;
  }

  try {
    const faceplatesFieldType = await service.getFieldType('Faceplates');
    const [value] = await dataStore.read(associationTargetEntityId.value, [faceplatesFieldType]);
    let current: EntityId[] = [];
    if (value && ValueHelpers.isEntityList(value)) {
      current = value.EntityList;
    }

    if (current.includes(selectedFaceplateId.value)) {
      const updated = current.filter((id) => id !== selectedFaceplateId.value);
      await dataStore.write(associationTargetEntityId.value, [faceplatesFieldType], ValueHelpers.entityList(updated));
      message.value = 'Faceplate detached from entity.';
    } else {
      message.value = 'Entity was not associated with this faceplate.';
    }
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Failed to detach faceplate';
  }
}

async function addBindingFromLibrary(binding: FaceplateBindingLibraryRecord) {
  try {
    const bindingsArray = JSON.parse(bindingsEditor.value || '[]');
    if (!Array.isArray(bindingsArray)) {
      throw new Error('Bindings JSON must be an array.');
    }
    const componentName = binding.targetComponent
      ? componentsLibrary.value.find((component) => component.id === binding.targetComponent)?.name
      : null;
    if (!componentName) {
      throw new Error('Binding library entry does not reference a loaded component.');
    }
    bindingsArray.push({
      component: componentName,
      property: binding.targetProperty || 'value',
      expression: binding.expression,
      transform: binding.valueTransform || undefined,
    });
    bindingsEditor.value = JSON.stringify(bindingsArray, null, 2);
    message.value = 'Binding added from library.';
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Failed to apply binding';
  }
}

onMounted(async () => {
  await initialize();
});
</script>

<template>
  <div class="faceplate-builder">
    <div v-if="loading" class="builder-state">Loading Faceplate Builder…</div>
    <div v-else class="builder-grid">
      <aside class="panel faceplate-list">
        <header>
          <h2>Faceplates</h2>
          <button type="button" class="primary" @click="createFaceplate" :disabled="saving">New Faceplate</button>
        </header>
        <ul>
          <li
            v-for="faceplate in faceplates"
            :key="faceplate.id"
            :class="{ active: faceplate.id === selectedFaceplateId }"
            @click="selectFaceplate(faceplate.id)"
          >
            <strong>{{ faceplate.name }}</strong>
            <span>{{ faceplate.targetEntityType || 'Unbound' }}</span>
          </li>
        </ul>
      </aside>

      <section class="panel editor" v-if="editingFaceplate">
        <header class="editor-header">
          <div>
            <h2>{{ editingFaceplate.name }}</h2>
            <p>Faceplate ID {{ editingFaceplate.id }}</p>
          </div>
          <div class="actions">
            <button type="button" class="secondary" @click="saveFaceplate" :disabled="saving || !!configurationError || !!bindingsError || !!notificationError">
              {{ saving ? 'Saving…' : 'Save Changes' }}
            </button>
          </div>
        </header>

        <div class="editor-body">
          <div class="field-group">
            <label>Name</label>
            <input v-model="editingFaceplate.name" type="text" />
          </div>

          <div class="field-group">
            <label>Target Entity Type</label>
            <input list="entity-types" v-model="editingFaceplate.targetEntityType" placeholder="PerfTestEntity" />
            <datalist id="entity-types">
              <option v-for="type in availableEntityTypes" :key="type" :value="type"></option>
            </datalist>
          </div>

          <div class="field-group">
            <label>Components</label>
            <div class="component-picker">
              <label v-for="component in componentsLibrary" :key="component.id">
                <input type="checkbox" :value="component.id" v-model="componentSelection" />
                <span>{{ component.name }}</span>
              </label>
            </div>
          </div>

          <div class="field-group column">
            <label>Layout &amp; Visual Configuration</label>
            <textarea v-model="configurationEditor" rows="10"></textarea>
            <span v-if="configurationError" class="field-error">{{ configurationError }}</span>
          </div>

          <div class="field-group column">
            <label>Bindings</label>
            <textarea v-model="bindingsEditor" rows="8"></textarea>
            <span v-if="bindingsError" class="field-error">{{ bindingsError }}</span>
          </div>

          <div class="field-group column">
            <label>Notification Channels</label>
            <textarea v-model="notificationEditor" rows="6"></textarea>
            <span v-if="notificationError" class="field-error">{{ notificationError }}</span>
          </div>

          <div class="field-group attach">
            <label>Entity Association</label>
            <div class="attach-controls">
              <input type="number" v-model.number="associationTargetEntityId" placeholder="Entity ID" />
              <button type="button" @click="attachFaceplateToEntity">Attach</button>
              <button type="button" class="secondary" @click="detachFaceplateFromEntity">Detach</button>
            </div>
            <small>Attached faceplates appear in the Database Browser context menu.</small>
          </div>
        </div>
      </section>

      <aside class="panel library">
        <div class="library-section">
          <header>
            <h3>Component Library</h3>
          </header>
          <ul>
            <li v-for="component in componentsLibrary" :key="component.id">
              <div class="library-card">
                <div>
                  <strong>{{ component.name }}</strong>
                  <span>{{ component.configuration.type || component.componentType }}</span>
                </div>
                <button type="button" @click="componentSelection = componentSelection.includes(component.id) ? componentSelection.filter(id => id !== component.id) : [...componentSelection, component.id]">
                  {{ componentSelection.includes(component.id) ? 'Remove' : 'Add' }}
                </button>
              </div>
            </li>
          </ul>
        </div>

        <div class="library-section">
          <header>
            <h3>Binding Library</h3>
          </header>
          <ul>
            <li v-for="binding in bindingsLibrary" :key="binding.id">
              <div class="library-card">
                <div>
                  <strong>{{ binding.name }}</strong>
                  <span>{{ binding.expression }}</span>
                </div>
                <button type="button" @click="addBindingFromLibrary(binding)">Apply</button>
              </div>
            </li>
          </ul>
        </div>
      </aside>

      <section class="panel preview">
        <header>
          <h2>Live Preview</h2>
          <div class="preview-controls">
            <label>
              Entity ID
              <input type="number" v-model.number="previewEntityId" placeholder="Entity ID" />
            </label>
          </div>
        </header>
        <div class="preview-body">
          <FaceplateRuntime
            v-if="previewFaceplate"
            :faceplate-data="previewFaceplate"
            :entity-id="previewEntityId"
            :live="true"
          />
          <div v-else class="preview-placeholder">Select or create a faceplate to preview.</div>
        </div>
      </section>
    </div>

    <footer class="builder-footer">
      <span v-if="message" class="message">{{ message }}</span>
      <span v-if="errorMessage" class="error">{{ errorMessage }}</span>
    </footer>
  </div>
</template>

<style scoped>
.faceplate-builder {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: radial-gradient(circle at top, rgba(0, 12, 18, 0.7), rgba(0, 0, 0, 0.82));
  color: var(--qui-text-primary);
}

.builder-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  letter-spacing: 0.06em;
  opacity: 0.75;
}

.builder-grid {
  flex: 1;
  display: grid;
  grid-template-columns: 260px 1.2fr 0.8fr;
  grid-template-rows: 100%;
  gap: 16px;
  padding: 18px;
  overflow: hidden;
}

.panel {
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.4);
}

.faceplate-list ul,
.library ul {
  list-style: none;
  margin: 0;
  padding: 0;
  overflow: auto;
}

.faceplate-list li {
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 4px;
  transition: background 0.2s ease;
}

.faceplate-list li.active,
.faceplate-list li:hover {
  background: rgba(0, 200, 160, 0.18);
}

.faceplate-list li span {
  font-size: 12px;
  opacity: 0.7;
}

.editor {
  overflow: auto;
}

.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.editor-header h2 {
  margin: 0;
  font-size: 20px;
  letter-spacing: 0.06em;
}

.editor-header p {
  margin: 4px 0 0;
  font-size: 12px;
  opacity: 0.7;
}

.actions {
  display: flex;
  gap: 10px;
}

.editor-body {
  padding: 16px;
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field-group.column textarea {
  width: 100%;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(0, 0, 0, 0.35);
  color: inherit;
  padding: 10px;
  font-family: 'Fira Code', monospace;
  font-size: 13px;
}

.field-group input {
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(0, 0, 0, 0.35);
  color: inherit;
}

.field-group label {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  opacity: 0.75;
}

.field-error {
  color: var(--qui-danger-color);
  font-size: 12px;
}

.component-picker {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 160px;
  overflow: auto;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.component-picker label {
  display: flex;
  gap: 8px;
  align-items: center;
  cursor: pointer;
}

.attach-controls {
  display: flex;
  gap: 10px;
  align-items: center;
}

.attach-controls button {
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(0, 0, 0, 0.45);
  color: inherit;
  cursor: pointer;
}

.attach-controls button.secondary {
  background: rgba(180, 60, 60, 0.3);
}

.library {
  overflow: hidden;
}

.library-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.library-section + .library-section {
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.library-section ul {
  padding: 0 0 12px 0;
  overflow: auto;
}

.library-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.library-card strong {
  display: block;
  margin-bottom: 3px;
}

.library-card span {
  font-size: 12px;
  opacity: 0.7;
}

.library-card button {
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(0, 255, 170, 0.2);
  color: inherit;
  cursor: pointer;
}

.preview {
  overflow: hidden;
}

.preview .preview-body {
  flex: 1;
  overflow: hidden;
  display: flex;
}

.preview-body .preview-placeholder {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  opacity: 0.7;
}

.primary {
  padding: 6px 12px;
  border-radius: 6px;
  border: none;
  background: var(--qui-accent-color);
  color: #061017;
  font-weight: 600;
  cursor: pointer;
}

.secondary {
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: inherit;
}

.builder-footer {
  padding: 10px 18px;
  display: flex;
  justify-content: space-between;
  font-size: 13px;
}

.builder-footer .message {
  color: var(--qui-accent-color);
}

.builder-footer .error {
  color: var(--qui-danger-color);
}
</style>
