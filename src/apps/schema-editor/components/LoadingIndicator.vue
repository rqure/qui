<script setup lang="ts">
// No props or data needed for this simple component
</script>

<template>
  <div class="loading-indicator">
    <div class="spinner-container">
      <div class="spinner-ring"></div>
      <div class="spinner-ring"></div>
      <div class="spinner-ring"></div>
      <div class="spinner-dot"></div>
    </div>
    <div class="loading-text">Connecting to database...</div>
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

.spinner-container {
  position: relative;
  width: 60px;
  height: 60px;
  margin-bottom: 20px;
}

.spinner-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 2px solid transparent;
  border-top-color: #9c27b0;
  animation: spin 1.2s linear infinite;
}

.spinner-ring:nth-child(2) {
  width: 80%;
  height: 80%;
  top: 10%;
  left: 10%;
  border-top-color: #673ab7;
  animation-duration: 1.8s;
  animation-direction: reverse;
}

.spinner-ring:nth-child(3) {
  width: 60%;
  height: 60%;
  top: 20%;
  left: 20%;
  border-top-color: #8e24aa;
  animation-duration: 2.4s;
}

.spinner-dot {
  position: absolute;
  width: 10px;
  height: 10px;
  top: 50%;
  left: 50%;
  background-color: #9c27b0;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 10px #9c27b0;
  animation: pulse 1.2s ease-in-out infinite;
}

.loading-text {
  font-size: var(--qui-font-size-base);
  font-weight: var(--qui-font-weight-medium);
  animation: pulse 1.5s infinite;
  letter-spacing: 0.3px;
  margin-top: 10px;
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
