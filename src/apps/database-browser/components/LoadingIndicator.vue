<script setup lang="ts">
// No props or data needed for this simple component
</script>

<template>
  <div class="loading-indicator">
    <div class="spinner"></div>
    <div class="loading-text">Loading</div>
  </div>
</template>

<style scoped>
.loading-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  color: var(--qui-text-secondary);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid transparent;
  border-top-color: var(--qui-accent-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

.loading-text {
  font-size: var(--qui-font-size-base);
  animation: pulse 1.5s infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes pulse {
  0% { opacity: 0.6; }
  50% { opacity: 1; }
  100% { opacity: 0.6; }
}
</style>
