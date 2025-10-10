<script setup lang="ts">
import { ref } from 'vue';

const emit = defineEmits<{
  (event: 'create', data: { name: string; description: string; icon: string }): void;
  (event: 'cancel'): void;
}>();

const name = ref('');
const description = ref('');
const icon = ref('✨');
const nameInput = ref<HTMLInputElement | null>(null);

const commonIcons = ['✨', '🎨', '📦', '🔧', '⚙️', '🎯', '💎', '🌟', '🔮', '🎪'];

function handleCreate() {
  if (!name.value.trim()) {
    alert('Please enter a component name');
    return;
  }
  
  emit('create', {
    name: name.value.trim(),
    description: description.value.trim(),
    icon: icon.value.trim() || '✨',
  });
}

function handleCancel() {
  emit('cancel');
}
</script>

<template>
  <div class="create-custom-component">
    <div class="create-custom-component__overlay" @click="handleCancel"></div>
    <div class="create-custom-component__dialog">
      <header class="create-custom-component__header">
        <h2>Create Custom Component</h2>
        <button type="button" class="create-custom-component__close" @click="handleCancel">×</button>
      </header>

      <div class="create-custom-component__body">
        <p class="create-custom-component__info">
          Create a reusable custom component from the selected primitives. This component will be saved to your library and can be used in any faceplate.
        </p>

        <div class="create-custom-component__field">
          <label for="component-name">Component Name</label>
          <input
            id="component-name"
            ref="nameInput"
            v-model="name"
            type="text"
            placeholder="e.g., Status Card, Alarm Panel"
            @keyup.enter="handleCreate"
          />
        </div>

        <div class="create-custom-component__field">
          <label for="component-description">Description</label>
          <textarea
            id="component-description"
            v-model="description"
            placeholder="Describe what this component does..."
            rows="3"
          />
        </div>

        <div class="create-custom-component__field">
          <label for="component-icon">Icon</label>
          <input
            id="component-icon"
            v-model="icon"
            type="text"
            placeholder="✨"
            maxlength="2"
          />
          <div class="create-custom-component__icon-picker">
            <button
              v-for="i in commonIcons"
              :key="i"
              type="button"
              class="create-custom-component__icon-button"
              :class="{ 'is-selected': icon === i }"
              @click="icon = i"
            >
              {{ i }}
            </button>
          </div>
        </div>
      </div>

      <footer class="create-custom-component__footer">
        <button type="button" class="create-custom-component__button" @click="handleCancel">
          Cancel
        </button>
        <button
          type="button"
          class="create-custom-component__button create-custom-component__button--primary"
          @click="handleCreate"
        >
          Create Component
        </button>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.create-custom-component {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.create-custom-component__overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
}

.create-custom-component__dialog {
  position: relative;
  width: 540px;
  display: flex;
  flex-direction: column;
  background: rgba(8, 16, 24, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  overflow: hidden;
}

.create-custom-component__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.create-custom-component__header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 0.05em;
}

.create-custom-component__close {
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

.create-custom-component__close:hover {
  background: rgba(255, 255, 255, 0.08);
}

.create-custom-component__body {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.create-custom-component__info {
  margin: 0;
  padding: 12px;
  background: rgba(0, 255, 194, 0.05);
  border: 1px solid rgba(0, 255, 194, 0.15);
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.8);
}

.create-custom-component__field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.create-custom-component__field label {
  font-size: 13px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.8);
}

.create-custom-component__field input,
.create-custom-component__field textarea {
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: inherit;
  font-size: 14px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s;
  resize: vertical;
}

.create-custom-component__field input:focus,
.create-custom-component__field textarea:focus {
  border-color: rgba(0, 255, 194, 0.4);
}

.create-custom-component__icon-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
}

.create-custom-component__icon-button {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  font-size: 20px;
  cursor: pointer;
  transition: all 0.2s;
}

.create-custom-component__icon-button:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: scale(1.05);
}

.create-custom-component__icon-button.is-selected {
  background: rgba(0, 255, 194, 0.15);
  border-color: rgba(0, 255, 194, 0.4);
}

.create-custom-component__footer {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  padding: 16px 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.create-custom-component__button {
  padding: 10px 20px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  color: inherit;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.create-custom-component__button:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-1px);
}

.create-custom-component__button--primary {
  background: rgba(0, 255, 194, 0.18);
  border-color: rgba(0, 255, 194, 0.34);
}

.create-custom-component__button--primary:hover {
  background: rgba(0, 255, 194, 0.25);
}
</style>
