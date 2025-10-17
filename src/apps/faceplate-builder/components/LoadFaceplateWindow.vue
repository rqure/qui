<template>
  <div class="window-content">
    <!-- Search Section -->
    <div class="search-section">
      <div class="search-input-wrapper">
        <div class="search-icon">🔍</div>
        <input
          type="text"
          v-model="searchQuery"
          class="search-input"
          placeholder="Search faceplates..."
        />
        <div v-if="searchQuery" class="clear-search" @click="clearSearch">✕</div>
      </div>
    </div>

    <!-- Content Area -->
    <div class="content-area">
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Loading faceplates...</p>
      </div>

      <div v-else-if="error" class="error-state">
        <div class="error-icon">⚠️</div>
        <p class="error-message">{{ error }}</p>
        <button @click="loadFaceplates" class="btn btn-secondary">Retry</button>
      </div>

      <div v-else-if="filteredFaceplates.length === 0 && searchQuery" class="empty-state">
        <div class="empty-icon">🔍</div>
        <h3>No Results Found</h3>
        <p>No faceplates match "<strong>{{ searchQuery }}</strong>"</p>
        <button @click="clearSearch" class="btn btn-secondary">Clear Search</button>
      </div>

      <div v-else-if="faceplates.length === 0" class="empty-state">
        <div class="empty-icon">📄</div>
        <h3>No Faceplates Available</h3>
        <p>Create your first faceplate to get started</p>
      </div>

      <div v-else class="table-container">
        <div class="table-wrapper">
          <table class="faceplate-table">
            <thead>
              <tr>
                <th class="col-id">Entity ID</th>
                <th class="col-name">Name</th>
                <th class="col-description">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="fp in filteredFaceplates"
                :key="fp.id"
                :class="{ selected: selectedFaceplateId === fp.id }"
                @click="selectFaceplate(fp.id)"
              >
                <td class="col-id">
                  <span class="entity-id">{{ fp.id }}</span>
                </td>
                <td class="col-name">
                  <div class="faceplate-name">{{ fp.name }}</div>
                </td>
                <td class="col-description">
                  <div class="faceplate-description">{{ fp.description || 'No description' }}</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="window-footer">
      <div class="footer-info">
        <span v-if="selectedFaceplate" class="selected-info">
          Selected: <strong>{{ selectedFaceplate.name }}</strong>
        </span>
        <span v-else-if="faceplates.length > 0" class="stats-info">
          <span class="stats-count">{{ filteredFaceplates.length }} faceplate{{ filteredFaceplates.length === 1 ? '' : 's' }}</span>
          <span v-if="searchQuery" class="stats-filter">of {{ faceplates.length }} total</span>
        </span>
      </div>
      <div class="footer-actions">
        <button @click="close" class="btn btn-secondary">Cancel</button>
        <button
          @click="loadFaceplate"
          :disabled="!selectedFaceplateId || loading"
          class="btn btn-primary"
        >
          Load Faceplate
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useDataStore } from '@/stores/data';
import { useWindowStore } from '@/stores/windows';
import type { EntityId } from '@/core/data/types';
import type { FaceplateConfig } from '../types';
import { ValueHelpers } from '@/core/data/types';

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'load', config: FaceplateConfig, entityId: EntityId, name: string): void;
}>();

const props = defineProps<{
  windowId?: string;
}>();

const dataStore = useDataStore();
const windowStore = useWindowStore();

interface FaceplateListItem {
  id: EntityId;
  name: string;
  description: string;
  config: FaceplateConfig;
}

const faceplates = ref<FaceplateListItem[]>([]);
const selectedFaceplateId = ref<EntityId | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const searchQuery = ref('');

const selectedFaceplate = computed(() => {
  if (!selectedFaceplateId.value) return null;
  return faceplates.value.find(fp => fp.id === selectedFaceplateId.value) || null;
});

const filteredFaceplates = computed(() => {
  if (!searchQuery.value.trim()) return faceplates.value;
  const query = searchQuery.value.toLowerCase();
  return faceplates.value.filter(fp =>
    fp.name.toLowerCase().includes(query) ||
    fp.description.toLowerCase().includes(query) ||
    String(fp.id).toLowerCase().includes(query)
  );
});

onMounted(() => {
  loadFaceplates();
});

async function loadFaceplates() {
  loading.value = true;
  error.value = null;

  try {
    // Find all Faceplate entities
    const faceplateType = await dataStore.getEntityType('Faceplate');
    const faceplateEntities = await dataStore.findEntities(faceplateType);

    const nameField = await dataStore.getFieldType('Name');
    const descriptionField = await dataStore.getFieldType('Description');
    const configField = await dataStore.getFieldType('Configuration');

    // Load details for each faceplate
    const items: FaceplateListItem[] = [];
    for (const id of faceplateEntities) {
      try {
        const [nameValue] = await dataStore.read(id, [nameField]);
        const [descriptionValue] = await dataStore.read(id, [descriptionField]);
        const [configValue] = await dataStore.read(id, [configField]);

        const name = ValueHelpers.isString(nameValue) ? nameValue.String : `Faceplate ${id}`;
        const description = ValueHelpers.isString(descriptionValue) ? descriptionValue.String : '';

        let config: FaceplateConfig | null = null;

        if (ValueHelpers.isString(configValue)) {
          try {
            config = JSON.parse(configValue.String);
          } catch {
            console.warn(`Failed to parse config for faceplate ${id}`);
          }
        }

        if (config) {
          items.push({
            id,
            name,
            description,
            config
          });
        }
      } catch (err) {
        console.warn(`Failed to load faceplate ${id}:`, err);
      }
    }

    faceplates.value = items.sort((a, b) => a.name.localeCompare(b.name));

    if (faceplates.value.length === 0) {
      error.value = 'No faceplates found. Create one first!';
    }
  } catch (err) {
    console.error('Failed to load faceplates:', err);
    error.value = 'Failed to load faceplates: ' + String(err);
  } finally {
    loading.value = false;
  }
}

function clearSearch() {
  searchQuery.value = '';
}

function selectFaceplate(id: EntityId) {
  selectedFaceplateId.value = id;
}

function loadFaceplate() {
  if (selectedFaceplate.value) {
    emit('load', selectedFaceplate.value.config, selectedFaceplate.value.id, selectedFaceplate.value.name);
  }
}

function close() {
  emit('close');
}
</script>

<style scoped>
.window-content {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--qui-bg-primary);
  color: var(--qui-text-primary);
}

/* Search Section */
.search-section {
  padding: 16px 24px;
  border-bottom: 1px solid var(--qui-window-border);
  background: var(--qui-bg-secondary);
}

.search-input-wrapper {
  position: relative;
  max-width: 400px;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 16px;
  color: var(--qui-text-secondary);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 10px 36px 10px 36px;
  background: var(--qui-bg-primary);
  border: 1px solid var(--qui-window-border);
  border-radius: var(--qui-window-radius);
  color: var(--qui-text-primary);
  font-size: var(--qui-font-size-base);
  font-family: var(--qui-font-family);
  transition: all var(--qui-interaction-speed);
}

.search-input:focus {
  outline: none;
  border-color: var(--qui-accent-color);
  box-shadow: 0 0 0 2px rgba(0, 255, 136, 0.1);
}

.clear-search {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 14px;
  color: var(--qui-text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: 50%;
  transition: all var(--qui-interaction-speed);
}

.clear-search:hover {
  background: var(--qui-overlay-hover);
  color: var(--qui-text-primary);
}

/* Content Area */
.content-area {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Loading and Error States */
.loading-state,
.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 24px;
  text-align: center;
  gap: 16px;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid var(--qui-border-opacity);
  border-top-color: var(--qui-accent-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-icon,
.empty-icon {
  font-size: 64px;
  opacity: 0.6;
  margin-bottom: 8px;
}

.error-message {
  color: var(--qui-danger-color);
  margin: 0;
  font-size: var(--qui-font-size-base);
  max-width: 400px;
}

.empty-state h3 {
  margin: 0 0 8px 0;
  font-size: var(--qui-font-size-lg);
  font-weight: var(--qui-font-weight-semibold);
  color: var(--qui-text-primary);
}

.empty-state p {
  margin: 0;
  font-size: var(--qui-font-size-base);
  color: var(--qui-text-secondary);
  max-width: 400px;
}

/* Table Container */
.table-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 2px solid var(--qui-window-border);
  border-radius: var(--qui-window-radius);
  background: var(--qui-bg-primary);
}

.table-wrapper {
  flex: 1;
  overflow: auto;
  background: var(--qui-bg-primary);
}

.faceplate-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--qui-font-size-base);
}

.faceplate-table thead {
  position: sticky;
  top: 0;
  background: var(--qui-bg-secondary);
  z-index: 1;
}

.faceplate-table th {
  padding: 14px 24px;
  text-align: left;
  font-weight: var(--qui-font-weight-semibold);
  font-size: var(--qui-font-size-sm);
  color: var(--qui-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 2px solid var(--qui-window-border);
  border-right: 1px solid var(--qui-window-border);
}

.faceplate-table th:last-child {
  border-right: none;
}

.faceplate-table td {
  padding: 14px 24px;
  border-bottom: 1px solid var(--qui-window-border);
  vertical-align: middle;
  border-right: 1px solid var(--qui-window-border);
}

.faceplate-table td:last-child {
  border-right: none;
}

.faceplate-table tbody tr {
  cursor: pointer;
  transition: all var(--qui-interaction-speed);
}

.faceplate-table tbody tr:hover {
  background: var(--qui-overlay-hover);
}

.faceplate-table tbody tr.selected {
  background: var(--qui-overlay-primary);
  border-left: 4px solid var(--qui-accent-color);
}

.faceplate-table tbody tr.selected:hover {
  background: var(--qui-overlay-primary);
}

/* Column Styles */
.col-id {
  width: 25%;
}

.col-name {
  width: 35%;
}

.col-description {
  width: 40%;
}

.entity-id {
  font-family: monospace;
  font-size: var(--qui-font-size-sm);
  color: var(--qui-text-secondary);
  font-weight: var(--qui-font-weight-medium);
}

.faceplate-name {
  font-weight: var(--qui-font-weight-medium);
  color: var(--qui-text-primary);
  font-size: var(--qui-font-size-base);
}

.faceplate-description {
  color: var(--qui-text-secondary);
  font-size: var(--qui-font-size-sm);
  line-height: 1.4;
  max-height: 2.8em;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Buttons */
.btn {
  padding: 8px 16px;
  border: none;
  border-radius: var(--qui-window-radius);
  font-size: var(--qui-font-size-sm);
  font-weight: var(--qui-font-weight-medium);
  cursor: pointer;
  transition: all var(--qui-interaction-speed);
  font-family: var(--qui-font-family);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-sm {
  padding: 6px 12px;
  font-size: var(--qui-font-size-xs);
}

.btn-primary {
  background: var(--qui-accent-color);
  color: var(--qui-bg-primary);
  box-shadow: var(--qui-shadow-accent);
}

.btn-primary:hover:not(:disabled) {
  background: var(--qui-accent-secondary);
  box-shadow: var(--qui-shadow-accent-strong);
  transform: translateY(-1px);
}

.btn-secondary {
  background: var(--qui-bg-secondary);
  color: var(--qui-text-primary);
  border: 1px solid var(--qui-window-border);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--qui-overlay-hover);
  border-color: var(--qui-accent-color);
}

/* Footer */
.window-footer {
  padding: 20px 24px;
  border-top: 1px solid var(--qui-window-border);
  background: var(--qui-bg-secondary);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.footer-info {
  flex: 1;
  font-size: var(--qui-font-size-sm);
  color: var(--qui-text-secondary);
}

.selected-info {
  color: var(--qui-text-primary);
}

.stats-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stats-count {
  font-weight: var(--qui-font-weight-medium);
  color: var(--qui-text-primary);
}

.stats-filter {
  color: var(--qui-text-secondary);
}

.footer-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* Responsive Design */
@media (max-width: 768px) {
  .faceplate-table th,
  .faceplate-table td {
    padding: 12px 16px;
  }

  .col-id {
    width: 30%;
  }

  .col-name {
    width: 35%;
  }

  .col-description {
    width: 35%;
  }

  .window-footer {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .footer-info {
    text-align: center;
  }

  .footer-actions {
    justify-content: center;
  }
}
</style>
