import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Theme } from '@/core/theme/types'
import { defaultTheme } from '@/core/theme/themes/default'

export const useThemeStore = defineStore('theme', () => {
  const currentTheme = ref<Theme>(defaultTheme)

  function setTheme(theme: Theme) {
    currentTheme.value = theme
  }

  function updateThemeVariable(key: string, value: string) {
    currentTheme.value = {
      ...currentTheme.value,
      variables: {
        ...currentTheme.value.variables,
        [key]: value,
      },
    }
  }

  return {
    currentTheme,
    setTheme,
    updateThemeVariable,
  }
})
