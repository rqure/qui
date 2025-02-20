<script setup lang="ts">
import { ref } from 'vue'

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
      <h1>QUI Webtop</h1>
      <input v-model="username" placeholder="Username" @keyup.enter="handleLogin" />
      <button @click="handleLogin">Login</button>
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
  font-weight: bold;
}

button:hover {
  background: var(--qui-login-button-hover);
}

h1 {
  color: var(--qui-text-primary);
  margin-bottom: 1.5rem;
}
</style>
