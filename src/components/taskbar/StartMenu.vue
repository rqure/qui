<script setup lang="ts">
defineEmits<{
  (e: 'create-window'): void
  (e: 'close'): void
}>()
</script>

<template>
  <div class="start-menu">
    <div class="menu-item" @click="$emit('create-window')">New Window</div>
    <div class="menu-item" @click="$emit('close')">Close Menu</div>
  </div>
</template>

<style scoped>
.start-menu {
  position: absolute;
  bottom: 100%;
  left: 0;
  width: 200px;
  background: var(--qui-bg-secondary);
  border: var(--qui-window-border);
  border-radius: 8px;
  padding: 0.5rem;
}

.menu-item {
  padding: 0.5rem 1rem;
  cursor: pointer;
}

.menu-item:hover {
  background: var(--qui-accent-color);
  color: white;
}
</style>
