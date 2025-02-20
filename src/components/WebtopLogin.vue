<script setup lang="ts">
import { ref } from 'vue'
import QeiLogo from '@/components/common/QeiLogo.vue'

const emit = defineEmits<{
  (e: 'login', username: string): void
}>()

const username = ref('')

const handleSubmit = () => {
  if (username.value.trim()) {
    emit('login', username.value.trim())
  }
}
</script>

<template>
  <div class="login-screen">
    <div class="login-box">
      <QeiLogo size="large" class="login-logo" />
      <form class="login-form" @submit.prevent="handleSubmit">
        <input
          v-model="username"
          type="text"
          placeholder="Enter your username"
          class="login-input"
          autocomplete="username"
        />
        <button type="submit" class="login-button">Login</button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.login-screen {
  height: 100vh;
  background: var(--qui-login-bg);
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-box {
  width: 100%;
  max-width: 400px;
  background: var(--qui-login-box-bg);
  backdrop-filter: blur(var(--qui-backdrop-blur));
  border: var(--qui-login-box-border);
  border-radius: 12px;
  padding: 2rem;
  box-shadow: var(--qui-login-box-shadow);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
}

.login-logo {
  margin-bottom: 1rem;
}

input {
  display: block;
  margin: 1rem 0;
  padding: 0.5rem;
  width: 200px;
  background: var(--qui-login-input-bg);
  border: var(--qui-login-input-border);
  color: var(--qui-text-primary);
  border-radius: 4px;
  font-size: var(--qui-font-size-base);
  font-family: var(--qui-font-family);
}

button {
  display: block;
  width: 100%;
  padding: 0.5rem;
  background: var(--qui-login-button-bg);
  border: none;
  border-radius: 4px;
  color: var(--qui-login-button-text);
  cursor: pointer;
  font-weight: var(--qui-font-weight-medium);
  font-size: var(--qui-font-size-base);
}

button:hover {
  background: var(--qui-login-button-hover);
}

h1 {
  color: var(--qui-text-primary);
  margin-bottom: 1.5rem;
  font-weight: var(--qui-font-weight-bold);
  font-size: var(--qui-font-size-large);
}

.logo {
  margin-bottom: 2rem;
  animation: logoAppear 0.6s var(--qui-animation-bounce);
}

.logo img {
  width: 180px;
  height: auto;
  filter: var(--qui-shadow-accent-strong);
}

@keyframes logoAppear {
  from {
    opacity: 0;
    transform: scale(0.8) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
</style>
