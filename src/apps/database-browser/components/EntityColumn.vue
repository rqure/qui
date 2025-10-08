<script setup lang="ts">
import { ref, computed, onMounted, watch, markRaw } from 'vue';
import type { EntityId, FieldType, Value } from '@/core/data/types';
import { extractEntityType, ValueHelpers } from '@/core/data/types';
import { useDataStore } from '@/stores/data';
import { useEntityDrag } from '@/core/utils/composables';
import { useWindowStore } from '@/stores/windows';
import faceplateBuilderApp from '@/apps/faceplate-builder';
import FaceplateViewerWindow from '@/apps/faceplate-builder/components/FaceplateViewerWindow.vue';
import type { MenuItem } from '@/core/menu/types';

// Define EntityItem interface
interface EntityItem {
  id: EntityId;
  name: string;
  type: string;
  children: EntityId[];
  faceplates: EntityFaceplateRef[];
}

interface EntityFaceplateRef {
  id: EntityId;
  name: string;
}

const props = defineProps<{
  columnId: string;
  parentId?: EntityId;
  selectedId?: EntityId;
}>();

const emit = defineEmits<{
  (e: 'entity-select', entityId: EntityId): void;
  (e: 'scroll', event: Event): void;
  (e: 'open-in-window', data: { entityId: EntityId, entityName: string }): void;
  (e: 'context-menu', data: { x: number, y: number, items: any[] }): void; // Add new emit
}>();

const dataStore = useDataStore();
const windowStore = useWindowStore();
const loading = ref(true);
const error = ref<string | null>(null);
const entities = ref<EntityItem[]>([]);
const searchQuery = ref('');

const fieldTypeCache = new Map<string, FieldType>();
const faceplateNameCache = new Map<EntityId, string>();

async function getFieldTypeId(fieldName: string): Promise<FieldType> {
  if (!fieldTypeCache.has(fieldName)) {
    const fieldType = await dataStore.getFieldType(fieldName);
    fieldTypeCache.set(fieldName, fieldType);
  }
  return fieldTypeCache.get(fieldName)!;
}

async function getFaceplateReferences(entityId: EntityId, faceplatesFieldType: FieldType, nameFieldType: FieldType): Promise<EntityFaceplateRef[]> {
  try {
    const [faceplatesValue] = await dataStore.read(entityId, [faceplatesFieldType]);
    if (faceplatesValue && ValueHelpers.isEntityList(faceplatesValue)) {
      const refs = await Promise.all(faceplatesValue.EntityList.map(async (faceplateId) => {
        if (!faceplateNameCache.has(faceplateId)) {
          const [nameValue] = await dataStore.read(faceplateId, [nameFieldType]);
          let faceplateName = `Faceplate ${faceplateId}`;
          if (nameValue && ValueHelpers.isString(nameValue)) {
            faceplateName = nameValue.String || faceplateName;
          }
          faceplateNameCache.set(faceplateId, faceplateName);
        }
        return {
          id: faceplateId,
          name: faceplateNameCache.get(faceplateId) || `Faceplate ${faceplateId}`,
        } as EntityFaceplateRef;
      }));
      return refs;
    }
  } catch (error) {
    console.warn(`Failed to load faceplates for entity ${entityId}`, error);
  }
  return [];
}

// Inline create entity state
const isCreating = ref(false);
const createEntityName = ref('');
const createEntityType = ref<string>('');
const availableEntityTypes = ref<Array<{ id: number, name: string }>>([]);
const creatingEntity = ref(false);
const createInputRef = ref<HTMLInputElement | null>(null);

// Delete entity dialog state
const showDeleteDialog = ref(false);
const entityToDelete = ref<EntityItem | null>(null);
const deletingEntity = ref(false);

// Setup context menu - updated to include faceplate actions
async function handleContextMenu(event: MouseEvent, entity: EntityItem) {
  event.preventDefault();
  event.stopPropagation();

  try {
    // Ensure faceplate references are up to date before building menu
    const nameFieldType = await getFieldTypeId('Name');
    const faceplatesFieldType = await getFieldTypeId('Faceplates');
    entity.faceplates = await getFaceplateReferences(entity.id, faceplatesFieldType, nameFieldType);
  } catch (error) {
    console.warn('Failed to refresh faceplate references for context menu', error);
  }

  const faceplateRefs = entity.faceplates || [];

  const faceplateItems: MenuItem[] = faceplateRefs.map((faceplate) => ({
    id: `faceplate-open-${faceplate.id}`,
    label: faceplate.name,
    action: () => openFaceplateWindow(entity, faceplate)
  }));

  const builderChildren: MenuItem[] = [
    {
      id: 'launch-faceplate-builder',
      label: 'Launch Builder…',
      action: () => openFaceplateBuilder(entity)
    },
    ...faceplateRefs.map((faceplate) => ({
      id: `builder-edit-${faceplate.id}`,
      label: `Edit ${faceplate.name}`,
      action: () => openFaceplateBuilder(entity, faceplate.id)
    }))
  ];

  const items: MenuItem[] = [
    {
      id: 'open-in-window',
      label: 'Open in Window',
      action: () => openEntityInWindow(entity.id, entity.name)
    },
    {
      id: 'delete-entity',
      label: 'Delete Entity',
      action: () => confirmDeleteEntity(entity)
    }
  ];

  if (faceplateItems.length) {
    items.push({ id: 'faceplate-separator', label: '', separator: true });
    items.push({
      id: 'open-faceplate-group',
      label: 'Open Faceplate',
      children: faceplateItems
    });
  } else {
    items.push({
      id: 'open-faceplate-disabled',
      label: 'Open Faceplate',
      disabled: true
    });
  }

  items.push({
    id: 'faceplate-builder-group',
    label: 'Faceplate Builder',
    children: builderChildren
  });
  
  // Emit the context menu event to parent components
  emit('context-menu', {
    x: event.clientX,
    y: event.clientY,
    items
  });
}

// Add function to open entity in window
function openEntityInWindow(entityId: EntityId, entityName: string) {
  // Emit a custom event to be handled by parent components
  emit('open-in-window', { entityId, entityName });
}

function openFaceplateWindow(entity: EntityItem, faceplate: EntityFaceplateRef) {
  windowStore.createWindow({
    title: `${faceplate.name} · ${entity.name}`,
    component: markRaw(FaceplateViewerWindow),
    icon: faceplateBuilderApp.manifest.icon,
    width: 960,
    height: 720,
    props: {
      faceplateId: faceplate.id,
      entityId: entity.id
    }
  });
}

function openFaceplateBuilder(entity: EntityItem, faceplateId?: EntityId) {
  const defaultSize = faceplateBuilderApp.manifest.defaultWindowSize || { width: 1200, height: 800 };
  windowStore.createWindow({
    title: 'Faceplate Builder',
    component: faceplateBuilderApp.component.default,
    icon: faceplateBuilderApp.manifest.icon,
    width: defaultSize.width,
    height: defaultSize.height,
    props: {
      entityId: entity.id,
      faceplateId: faceplateId ?? null
    }
  });
}

// Group entities by their type
const groupedEntities = computed(() => {
  const filtered = searchQuery.value 
    ? entities.value.filter(entity => entity.name.toLowerCase().includes(searchQuery.value.toLowerCase()))
    : entities.value;

  const groups: Record<string, EntityItem[]> = {}; // Group by entity type name (string)
  
  filtered.forEach(entity => {
    if (!groups[entity.type]) {
      groups[entity.type] = [];
    }
    groups[entity.type].push(entity);
  });

  // Sort entities in each group by name
  Object.keys(groups).forEach(type => {
    groups[type].sort((a, b) => a.name.localeCompare(b.name));
  });

  // Sort the group keys alphabetically
  const sortedGroups: [string, EntityItem[]][] = Object.entries(groups)
    .sort(([typeA], [typeB]) => typeA.localeCompare(typeB));

  return sortedGroups;
});

// Count of all filtered entities
const totalFilteredCount = computed(() => {
  return groupedEntities.value.reduce((count, [_, entities]) => count + entities.length, 0);
});

// Load entities when column mounts or parent changes
onMounted(async () => {
  await loadEntities();
});

watch(() => props.parentId, async () => {
  await loadEntities();
});

// Load child entities of the parent
async function loadEntities() {
  loading.value = true;
  error.value = null;
  entities.value = [];
  
  try {
    // Get field type IDs
  const NameFieldType = await getFieldTypeId('Name');
  const ChildrenFieldType = await getFieldTypeId('Children');
  const FaceplatesFieldType = await getFieldTypeId('Faceplates');

    if (!props.parentId) {
      // Load root entities
      const rootEntityType = await dataStore.getEntityType("Root");
      const rootIds = await dataStore.findEntities(rootEntityType);
      
      if (rootIds.length > 0) {
        const rootId = rootIds[0];
        
        // Read name and children
        const [nameValue] = await dataStore.read(rootId, [NameFieldType]);
        const [childrenValue] = await dataStore.read(rootId, [ChildrenFieldType]);
        
        let rootName = 'Root';
        if (ValueHelpers.isString(nameValue)) {
          rootName = nameValue.String.trim() || 'Root';
        }
        
        let childrenList: EntityId[] = [];
        if (ValueHelpers.isEntityList(childrenValue)) {
          childrenList = childrenValue.EntityList;
        }
        
        entities.value.push({
          id: rootId,
          name: rootName,
          type: "Root",
          children: childrenList,
          faceplates: await getFaceplateReferences(rootId, FaceplatesFieldType, NameFieldType)
        });
      }
      loading.value = false;
      return;
    }

    // Read the Children field from the parent entity
    const [childrenValue] = await dataStore.read(props.parentId, [ChildrenFieldType]);
    
    let childrenIds: EntityId[] = [];
    if (childrenValue != null && ValueHelpers.isEntityList(childrenValue)) {
      childrenIds = childrenValue.EntityList;
    }
    
    // Load all children entities with their basic info
    await Promise.all(childrenIds.map(async (childId: EntityId) => {
      try {
        // Read name and children fields
        const [nameValue] = await dataStore.read(childId, [NameFieldType]);
        const [childrenFieldValue] = await dataStore.read(childId, [ChildrenFieldType]);
        
        // Get entity type from ID and resolve it to a name
        const entityTypeNumber = extractEntityType(childId);
        const entityType = await dataStore.resolveEntityType(entityTypeNumber);
        
        // Get the name and ensure it's never empty
        let name = 'Unnamed';
        if (nameValue != null && ValueHelpers.isString(nameValue)) {
          name = nameValue.String.trim() || 'Unnamed';
        }
        
        let childrenList: EntityId[] = [];
        if (childrenFieldValue != null && ValueHelpers.isEntityList(childrenFieldValue)) {
          childrenList = childrenFieldValue.EntityList;
        }
        
        entities.value.push({
          id: childId,
          name: name,
          type: entityType,
          children: childrenList,
          faceplates: await getFaceplateReferences(childId, FaceplatesFieldType, NameFieldType)
        });
      } catch (err) {
        // Only log detailed errors in development
        if (import.meta.env.DEV && err instanceof Error && 
            !err.message.includes('timeout') && 
            !err.message.includes('not connected')) {
          console.error(`Error loading child entity ${childId}:`, err);
        }
      }
    }));
    
    loading.value = false;
  } catch (err) {
    console.error(`Error in loadEntities for ${props.parentId}:`, err);
    error.value = 'Failed to load entities';
    loading.value = false;
  }
}

// Select an entity in this column
function selectEntity(entityId: EntityId) {
  emit('entity-select', entityId);
}

// Handle column scroll events for syncing
function handleScroll(event: Event) {
  emit('scroll', event);
}

// Add drag functionality with the composable
const { startEntityDrag } = useEntityDrag();

// Start dragging an entity
// Start dragging an entity
function handleDragStart(event: DragEvent, entity: EntityItem) {
  startEntityDrag(event, entity.id);
}

// Load available entity types for creation
async function loadEntityTypes(retryCount = 0) {
  const maxRetries = 3;
  const retryDelay = 1000; // 1 second
  
  try {
    const entityTypes = await dataStore.getEntityTypes();
    const typeNames = await Promise.all(
      entityTypes.map(async (typeId) => {
        const name = await dataStore.resolveEntityType(typeId);
        return { id: typeId, name };
      })
    );
    // Filter out system types that shouldn't be created directly
    availableEntityTypes.value = typeNames
      .filter(t => !['Root'].includes(t.name))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (err) {
    console.error('Failed to load entity types:', err);
    
    // Retry if it's a connection/timeout error and we haven't exceeded max retries
    if (retryCount < maxRetries && 
        (err instanceof Error && 
         (err.message.includes('not connected') || 
          err.message.includes('timeout') || 
          err.message.includes('not ready')))) {
      console.log(`Retrying loadEntityTypes (${retryCount + 1}/${maxRetries})...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay * (retryCount + 1)));
      return loadEntityTypes(retryCount + 1);
    }
  }
}

// Toggle inline create mode
function toggleCreateMode() {
  isCreating.value = !isCreating.value;
  if (isCreating.value) {
    createEntityName.value = '';
    createEntityType.value = availableEntityTypes.value.length > 0 ? String(availableEntityTypes.value[0].id) : '';
    // Focus the input after the DOM updates
    setTimeout(() => {
      createInputRef.value?.focus();
    }, 50);
  }
}

// Cancel creating entity
function cancelCreate() {
  isCreating.value = false;
  createEntityName.value = '';
  creatingEntity.value = false;
}

// Create a new entity
async function createEntity() {
  if (!createEntityName.value.trim() || !createEntityType.value) {
    return;
  }
  
  creatingEntity.value = true;
  try {
    const entityTypeId = parseInt(createEntityType.value);
    const newEntityId = await dataStore.createEntity(
      entityTypeId,
      props.parentId || null,
      createEntityName.value.trim()
    );
    
    // Reload entities to show the new one
    await loadEntities();
    
    // Select the newly created entity
    selectEntity(newEntityId);
    
    // Exit create mode
    isCreating.value = false;
    createEntityName.value = '';
  } catch (err) {
    console.error('Failed to create entity:', err);
    error.value = err instanceof Error ? err.message : 'Failed to create entity';
  } finally {
    creatingEntity.value = false;
  }
}

// Handle keyboard events in create mode
function handleCreateKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    event.preventDefault();
    createEntity();
  } else if (event.key === 'Escape') {
    event.preventDefault();
    cancelCreate();
  }
}

// Confirm delete entity
function confirmDeleteEntity(entity: EntityItem) {
  entityToDelete.value = entity;
  showDeleteDialog.value = true;
}

// Delete an entity
async function deleteEntity() {
  if (!entityToDelete.value) return;
  
  deletingEntity.value = true;
  try {
    await dataStore.deleteEntity(entityToDelete.value.id);
    
    // Reload entities to remove the deleted one
    await loadEntities();
    
    // Close the dialog
    showDeleteDialog.value = false;
    entityToDelete.value = null;
  } catch (err) {
    console.error('Failed to delete entity:', err);
    error.value = err instanceof Error ? err.message : 'Failed to delete entity';
  } finally {
    deletingEntity.value = false;
  }
}

// Cancel delete
function cancelDelete() {
  showDeleteDialog.value = false;
  entityToDelete.value = null;
}

// Load entity types when component mounts
onMounted(async () => {
    await loadEntityTypes();
});
</script>

<template>
  <div 
    class="entity-column" 
    @scroll="handleScroll"
    :data-column-id="columnId"
  >
    <div class="column-header">
      <div class="search-container">
        <span class="search-icon" v-if="!searchQuery">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24">
            <path fill="currentColor" d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
        </span>
        <input 
          type="text" 
          v-model="searchQuery" 
          placeholder="Search entities..." 
          class="search-input"
        />
        <span class="clear-search" v-if="searchQuery" @click="searchQuery = ''">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24">
            <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
          </svg>
        </span>
      </div>
      
      <!-- Inline Create Entity Form -->
      <div v-if="isCreating" class="inline-create-form">
        <input 
          ref="createInputRef"
          type="text" 
          v-model="createEntityName" 
          placeholder="Entity name..."
          class="create-name-input"
          @keydown="handleCreateKeydown"
          :disabled="creatingEntity"
        />
        <select 
          v-model="createEntityType" 
          class="create-type-select"
          :disabled="creatingEntity"
        >
          <option v-for="type in availableEntityTypes" :key="type.id" :value="type.id">
            {{ type.name }}
          </option>
        </select>
        <div class="create-actions">
          <button 
            class="create-action-btn create-submit" 
            @click="createEntity"
            :disabled="!createEntityName.trim() || !createEntityType || creatingEntity"
            title="Create (Enter)"
          >
            <svg v-if="!creatingEntity" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24">
              <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
            </svg>
            <span v-else class="spinner-tiny"></span>
          </button>
          <button 
            class="create-action-btn create-cancel" 
            @click="cancelCreate"
            :disabled="creatingEntity"
            title="Cancel (Esc)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24">
              <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
    
    <div v-if="loading" class="column-loading">
      <div class="spinner"></div>
      <span>Loading entities...</span>
    </div>
    
    <div v-else-if="error" class="column-error">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
        <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
      </svg>
      <span>{{ error }}</span>
      <button @click="loadEntities" class="retry-button">Retry</button>
    </div>
    
    <div v-else-if="totalFilteredCount === 0" class="empty-message">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
        <path fill="currentColor" d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
      </svg>
      <span v-if="searchQuery">No matching entities</span>
      <span v-else>No entities found</span>
    </div>
    
    <div v-else class="entity-list">
      <div v-for="[type, entitiesGroup] in groupedEntities" :key="type" class="entity-group">
        <div class="entity-group-header">
          <span class="entity-group-title">{{ type }}</span>
          <span class="entity-group-count">{{ entitiesGroup.length }}</span>
        </div>
        
        <div 
          v-for="entity in entitiesGroup" 
          :key="entity.id"
          class="entity-item"
          :class="{ 
            'selected': entity.id === selectedId,
            'has-children': entity.children.length > 0
          }"
          @click="selectEntity(entity.id)"
          @contextmenu="handleContextMenu($event, entity)"
          draggable="true"
          @dragstart="handleDragStart($event, entity)"
        >
          <div class="entity-item-content">
            <span class="entity-drag-handle">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24">
                <path fill="currentColor" d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
              </svg>
            </span>
            <span class="entity-name">{{ entity.name }}</span>
          </div>
          <span v-if="entity.children.length > 0" class="child-indicator">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
              <path fill="currentColor" d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
            </svg>
          </span>
        </div>
      </div>
      
      <!-- Create Entity Button at bottom -->
      <button 
        v-if="!isCreating" 
        class="list-create-btn" 
        @click="toggleCreateMode"
        title="Create new entity"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24">
          <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
        </svg>
        <span>Create Entity</span>
      </button>
    </div>

    <!-- Delete Entity Dialog -->
    <div v-if="showDeleteDialog" class="dialog-overlay" @click="cancelDelete">
      <div class="dialog-content" @click.stop>
        <div class="dialog-header">
          <h3>Delete Entity</h3>
          <button class="dialog-close" @click="cancelDelete">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
              <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
            </svg>
          </button>
        </div>
        <div class="dialog-body">
          <p>Are you sure you want to delete <strong>{{ entityToDelete?.name }}</strong>?</p>
          <p class="warning-text">This action cannot be undone.</p>
        </div>
        <div class="dialog-footer">
          <button class="dialog-btn dialog-btn-cancel" @click="cancelDelete" :disabled="deletingEntity">
            Cancel
          </button>
          <button 
            class="dialog-btn dialog-btn-danger" 
            @click="deleteEntity" 
            :disabled="deletingEntity"
          >
            <span v-if="deletingEntity" class="spinner-small"></span>
            <span v-else>Delete</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.entity-column {
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  background: var(--qui-bg-secondary);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  transition: width 0.1s ease;
  width: 220px; /* Default width, will be overridden by inline style */
  
  /* Firefox */
  scrollbar-width: thin;
  scrollbar-color: var(--qui-scrollbar-thumb) var(--qui-scrollbar-track);
}

/* Add smooth-scrolling class programmatically when syncing */
.entity-column.scrolling-smooth {
  scroll-behavior: smooth;
}

.entity-column::-webkit-scrollbar {
  width: 6px;
}

.entity-column::-webkit-scrollbar-track {
  background: var(--qui-scrollbar-track);
}

.entity-column::-webkit-scrollbar-thumb {
  background: var(--qui-scrollbar-thumb);
  border-radius: 3px;
}

.entity-column::-webkit-scrollbar-thumb:hover {
  background: var(--qui-scrollbar-thumb-hover);
}

.column-header {
  padding: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  position: sticky;
  top: 0;
  background: var(--qui-bg-secondary);
  z-index: 10;
  backdrop-filter: blur(10px);
}

/* Inline create form */
.inline-create-form {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 0;
  margin-top: 8px;
  border-top: 1px solid rgba(0, 255, 136, 0.2);
  background: rgba(0, 255, 136, 0.03);
  animation: slideDown 0.2s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.create-name-input {
  padding: 8px 10px;
  background: var(--qui-bg-primary);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: var(--qui-text-primary);
  font-size: 13px;
  font-family: inherit;
  transition: all 0.2s ease;
}

.create-name-input:focus {
  outline: none;
  border-color: var(--qui-accent-color);
  box-shadow: 0 0 0 2px rgba(0, 255, 136, 0.1);
}

.create-name-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.create-type-select {
  padding: 8px 10px;
  background: var(--qui-bg-primary);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: var(--qui-text-primary);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s ease;
}

.create-type-select:focus {
  outline: none;
  border-color: var(--qui-accent-color);
  box-shadow: 0 0 0 2px rgba(0, 255, 136, 0.1);
}

.create-type-select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.create-actions {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
}

.create-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px 10px;
  border-radius: 6px;
  border: none;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 32px;
}

.create-action-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.create-submit {
  background: var(--qui-accent-color);
  color: var(--qui-bg-primary);
}

.create-submit:hover:not(:disabled) {
  background: var(--qui-accent-hover);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 255, 136, 0.3);
}

.create-cancel {
  background: rgba(255, 255, 255, 0.05);
  color: var(--qui-text-secondary);
}

.create-cancel:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
  color: var(--qui-text-primary);
}

.spinner-tiny {
  width: 12px;
  height: 12px;
  border: 2px solid rgba(0, 0, 0, 0.3);
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

/* Create button in entity list */
.list-create-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: calc(100% - 16px);
  margin: 6px 8px;
  padding: 6px 8px;
  background: transparent;
  color: var(--qui-text-secondary);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  opacity: 0.7;
}

.list-create-btn:hover {
  background: rgba(0, 255, 136, 0.08);
  color: var(--qui-accent-color);
  border-color: rgba(0, 255, 136, 0.3);
  opacity: 1;
}

.list-create-btn:active {
  transform: scale(0.98);
}

.list-create-btn svg {
  opacity: 0.8;
}

.search-container {
  position: relative;
  display: flex;
  align-items: center;
}

.search-input {
  width: 100%;
  padding: 8px 32px 8px 32px;
  border-radius: 20px;
  border: 1px solid var(--qui-hover-border);
  background: rgba(0, 0, 0, 0.2);
  color: var(--qui-text-primary);
  font-size: var(--qui-font-size-small);
  transition: all 0.2s var(--qui-animation-bounce);
}

.search-input:focus {
  background: rgba(0, 0, 0, 0.3);
  border-color: var(--qui-accent-color);
  outline: none;
  box-shadow: 0 0 0 2px rgba(0, 255, 136, 0.2);
}

.search-icon {
  position: absolute;
  left: 12px;
  color: var(--qui-text-secondary);
  opacity: 0.6;
}

.clear-search {
  position: absolute;
  right: 10px;
  color: var(--qui-text-secondary);
  cursor: pointer;
  opacity: 0.6;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  transition: all 0.2s var(--qui-animation-bounce);
}

.clear-search:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.1);
}

.entity-list {
  flex: 1;
  padding: 8px 0;
}

.entity-group {
  margin-bottom: 12px;
}

.entity-group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 16px;
  color: var(--qui-accent-color);
  font-size: 11px;
  letter-spacing: 0.7px;
  font-weight: var(--qui-font-weight-medium);
  background: rgba(0, 0, 0, 0.2);
  border-bottom: 1px solid rgba(0, 255, 136, 0.1);
}

.entity-group-count {
  background: rgba(0, 255, 136, 0.1);
  border-radius: 12px;
  padding: 2px 8px;
  font-size: 10px;
  font-weight: var(--qui-font-weight-bold);
  box-shadow: 0 0 5px rgba(0, 255, 136, 0.1);
}

.entity-item {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  cursor: pointer;
  border-radius: 6px;
  margin: 3px 6px;
  transition: all 0.15s var(--qui-animation-bounce);
  justify-content: space-between;
  border-left: 2px solid transparent;
  position: relative;
  overflow: hidden;
}

/* Add entity-item-content class for layout with drag handle */
.entity-item-content {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.entity-drag-handle {
  opacity: 0.4;
  display: flex;
  align-items: center;
  cursor: grab;
  transition: opacity 0.2s ease;
}

.entity-item:hover .entity-drag-handle {
  opacity: 0.7;
}

.entity-item.selected .entity-drag-handle {
  color: var(--qui-accent-color);
  opacity: 0.8;
}

/* Update entity-name to work with the new structure */
.entity-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  position: relative;
  z-index: 1;
  font-weight: var(--qui-font-weight-medium);
  letter-spacing: 0.2px;
}

/* Add styles for active dragging */
.entity-item:active {
  cursor: grabbing;
}

.child-indicator {
  margin-left: 8px;
  opacity: 0.6;
  transform: translateX(0);
  transition: transform 0.2s var(--qui-animation-bounce);
  position: relative;
  z-index: 1;
}

.entity-item:hover .child-indicator {
  opacity: 1;
  transform: translateX(3px);
}

.entity-item.selected .child-indicator {
  color: var(--qui-accent-color);
  opacity: 1;
  filter: drop-shadow(0 0 3px var(--qui-accent-glow));
}

.column-loading, .column-error, .empty-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  color: var(--qui-text-secondary);
  height: 150px;
  font-size: var(--qui-font-size-small);
  text-align: center;
  gap: 12px;
}

.column-error svg, .empty-message svg {
  opacity: 0.6;
  margin-bottom: 4px;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--qui-accent-bg-faint);
  border-top-color: var(--qui-accent-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 8px;
}

.retry-button {
  margin-top: 8px;
  padding: 6px 12px;
  background: var(--qui-overlay-primary);
  border: 1px solid var(--qui-hover-border);
  border-radius: 16px;
  color: var(--qui-text-primary);
  cursor: pointer;
  font-size: var(--qui-font-size-small);
  transition: all 0.2s var(--qui-animation-bounce);
}

.retry-button:hover {
  background: var(--qui-accent-color);
  color: var(--qui-bg-primary);
  transform: translateY(-1px);
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Dialog styles */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(4px);
}

.dialog-content {
  background: var(--qui-bg-secondary);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  min-width: 400px;
  max-width: 500px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.dialog-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--qui-text-primary);
}

.dialog-close {
  background: none;
  border: none;
  color: var(--qui-text-secondary);
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.dialog-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--qui-text-primary);
}

.dialog-body {
  padding: 20px;
}

.dialog-body p {
  margin: 0 0 12px 0;
  color: var(--qui-text-primary);
  line-height: 1.5;
}

.warning-text {
  color: var(--qui-text-secondary);
  font-size: 13px;
  font-style: italic;
}

.dialog-footer {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  padding: 16px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.dialog-btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  min-width: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dialog-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.dialog-btn-cancel {
  background: rgba(255, 255, 255, 0.05);
  color: var(--qui-text-primary);
}

.dialog-btn-cancel:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
}

.dialog-btn-danger {
  background: rgba(255, 59, 48, 0.9);
  color: white;
}

.dialog-btn-danger:hover:not(:disabled) {
  background: rgba(255, 59, 48, 1);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(255, 59, 48, 0.3);
}

.spinner-small {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}
</style>
