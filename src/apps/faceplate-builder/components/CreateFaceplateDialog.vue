<script setup lang="ts">
import { ref } from 'vue';

const emit = defineEmits<{
  (event: 'create', data: { name: string; targetEntityType: string }): void;
  (event: 'cancel'): void;
}>();

const name = ref('');
const targetEntityType = ref('Object');
const nameInput = ref<HTMLInputElement | null>(null);

const commonEntityTypes = [
  'Object',
  'Machine',
  'Service',
  'Folder',
  'User',
  'Session',
  'Candidate',
];

function handleCreate() {
  if (!name.value.trim()) {
    alert('Please enter a faceplate name');
    return;
  }
  
  if (!targetEntityType.value.trim()) {
    alert('Please enter a target entity type');
    return;
  }
  
  emit('create', {
    name: name.value.trim(),
    targetEntityType: targetEntityType.value.trim(),
  });
}

function handleCancel() {
  emit('cancel');
}
</script>

<template>
  <div class="create-faceplate">
    <div class="create-faceplate__overlay" @click="handleCancel"></div>
    <div class="create-faceplate__dialog">
      <header class="create-faceplate__header">
        <h2>Create New Faceplate</h2>
        <button type="button" class="create-faceplate__close" @click="handleCancel">×</button>
      </header>

      <div class="create-faceplate__body">
        <div class="create-faceplate__field">
          <label for="faceplate-name">Faceplate Name</label>
          <input
            id="faceplate-name"
            ref="nameInput"
            v-model="name"
            type="text"
            placeholder="e.g., Machine Status Dashboard"
            @keyup.enter="handleCreate"
          />
        </div>

        <div class="create-faceplate__field">
          <label for="target-entity-type">Target Entity Type</label>
          <input
            id="target-entity-type"
            v-model="targetEntityType"
            type="text"
            list="entity-types"
            placeholder="e.g., Machine"
            @keyup.enter="handleCreate"
          />
          <datalist id="entity-types">
            <option v-for="type in commonEntityTypes" :key="type" :value="type">{{ type }}</option>
          </datalist>
          <p class="create-faceplate__hint">
            The entity type this faceplate is designed for. Bindings will reference fields from this type.
          </p>
        </div>
      </div>

      <footer class="create-faceplate__footer">
        <button type="button" class="create-faceplate__button" @click="handleCancel">
          Cancel
        </button>
        <button
          type="button"
          class="create-faceplate__button create-faceplate__button--primary"
          @click="handleCreate"
        >
          Create
        </button>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.create-faceplate {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.create-faceplate__overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
}

.create-faceplate__dialog {
  position: relative;
  width: 500px;
  display: flex;
  flex-direction: column;
  background: rgba(8, 16, 24, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  overflow: hidden;
}

.create-faceplate__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.create-faceplate__header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 0.05em;
}

.create-faceplate__close {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 6px;
  font-size: 24px;
  color: inherit;
  cursor: pointer;
  transition: background 0.2s;
}

.create-faceplate__close:hover {
  background: rgba(255, 255, 255, 0.08);
}

.create-faceplate__body {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.create-faceplate__field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.create-faceplate__field label {
  font-size: 13px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.8);
}

.create-faceplate__field input {
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: inherit;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.create-faceplate__field input:focus {
  border-color: rgba(0, 255, 194, 0.4);
}

.create-faceplate__hint {
  margin: 0;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  line-height: 1.4;
}

.create-faceplate__footer {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  padding: 16px 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.create-faceplate__button {
  padding: 10px 20px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  color: inherit;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.create-faceplate__button:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-1px);
}

.create-faceplate__button--primary {
  background: rgba(0, 255, 194, 0.18);
  border-color: rgba(0, 255, 194, 0.34);
}

.create-faceplate__button--primary:hover {
  background: rgba(0, 255, 194, 0.25);
}
</style>
