<script setup lang="ts">
import { ref } from 'vue'
import qeiLogo from '@/components/icons/qei-logo.png'

const emit = defineEmits<{
  (e: 'login', username: string): void
}>()

const username = ref('')

const handleLogin = () => {
  if (username.value) {
    emit('login', username.value)
  }
}
</script>

<template>
  <div class="login-screen">
    <div class="login-box">
      <div class="logo">
        <img :src="qeiLogo" alt="QEI Logo" />
      </div>
      <input v-model="username" placeholder="Username" @keyup.enter="handleLogin" />
      <button class="button-hover" @click="handleLogin">Login</button>
    </div>
  </div>
</template>

<style scoped>
.login-screen {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  background: var(--qui-login-bg);
}

.login-box {
  padding: 2rem;
  background: var(--qui-login-box-bg);
  border: var(--qui-login-box-border);
  border-radius: var(--qui-window-radius);
  box-shadow: var(--qui-login-box-shadow);
  text-align: center;
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
