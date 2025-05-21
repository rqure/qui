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
  padding: 40px;
  color: var(--qui-text-secondary);
  animation: fade-in 0.5s ease-out;
}

.spinner-container {
  position: relative;
  width: 80px;
  height: 80px;
  margin-bottom: 30px;
  filter: drop-shadow(0 5px 15px rgba(0, 0, 0, 0.1));
}

.spinner-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 3px solid transparent;
  border-top-color: var(--qui-accent-color);
  animation: spin 1.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

.spinner-ring:nth-child(2) {
  width: 80%;
  height: 80%;
  top: 10%;
  left: 10%;
  border-top-color: var(--qui-accent-secondary);
  animation-duration: 1.8s;
  animation-direction: reverse;
}

.spinner-ring:nth-child(3) {
  width: 60%;
  height: 60%;
  top: 20%;
  left: 20%;
  border-top-color: var(--qui-accent-deep);
  animation-duration: 2.4s;
}

.spinner-dot {
  position: absolute;
  width: 14px;
  height: 14px;
  top: 50%;
  left: 50%;
  background-color: var(--qui-accent-color);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  box-shadow: var(--qui-shadow-glow), 0 0 15px var(--qui-overlay-accent);
  animation: pulse 1.2s ease-in-out infinite;
}

.loading-text {
  font-size: var(--qui-font-size-base);
  font-weight: var(--qui-font-weight-medium);
  animation: pulse 1.5s infinite;
  letter-spacing: 0.3px;
  color: var(--qui-text-primary);
  background: linear-gradient(120deg, var(--qui-text-primary), var(--qui-accent-color));
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  text-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
  position: relative;
}

.loading-text::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: -8px;
  width: 100%;
  height: 1px;
  background: linear-gradient(to right, transparent, var(--qui-accent-color), transparent);
  animation: loading-line 2s ease-in-out infinite;
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

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes loading-line {
  0% { transform: scaleX(0.2); opacity: 0.5; }
  50% { transform: scaleX(1); opacity: 1; }
  100% { transform: scaleX(0.2); opacity: 0.5; }
}
</style>
