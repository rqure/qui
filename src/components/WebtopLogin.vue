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
  background: var(--qui-bg-primary);
}

.login-box {
  padding: 2rem;
  background: var(--qui-bg-secondary);
  border-radius: 8px;
  box-shadow: var(--qui-shadow);
  text-align: center;
}

input,
button {
  display: block;
  margin: 1rem 0;
  padding: 0.5rem;
  width: 200px;
}
</style>
