<script setup lang="ts">
import { watchEffect } from 'vue'
import { useThemeStore } from '@/stores/theme'

const themeStore = useThemeStore()

const applyTheme = () => {
  // Apply theme variables
  Object.entries(themeStore.currentTheme.variables).forEach(([key, value]) => {
    document.documentElement.style.setProperty(key, value)
  })
}

watchEffect(applyTheme)
</script>

<template>
  <slot></slot>
</template>
