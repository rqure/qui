# qui

## Goal

QUI represents a webtop application framework built with Vue 3, enabling developers to create and install their own front-end applications within a unified desktop-like environment.

## Architecture Principles

- **Single Page Application**: Everything runs in a single page without routing
- **State Management**: Uses Pinia stores for global state
- **Theme System**: Centralized theme management through stores and CSS variables
- **Component Isolation**: Each component should be self-contained and reusable

## Project Structure

```sh
src
├── core                 # Core framework functionality
│   ├── theme           # Theme system
│   │   ├── themes      # Theme definitions
│   │   └── types       # Theme TypeScript types
│   ├── window          # Window management (planned)
│   ├── apps            # Application lifecycle (planned)
│   └── ipc             # Inter-process communication (planned)
├── stores              # Pinia stores
│   ├── theme.ts        # Theme state management
│   └── auth.ts         # Authentication state
├── components          # Shared UI components
└── assets             # Static assets
```

## State Management

### Theme Store

Controls application theming:

```typescript
const theme = useThemeStore()
theme.setTheme(newTheme)
theme.updateThemeVariable('--qui-bg-primary', '#000000')
```

### Auth Store

Manages authentication state:

```typescript
const auth = useAuthStore()
auth.login(username)
auth.logout()

// Access state
console.log(auth.isAuthenticated)
console.log(auth.username)
```

## Creating New Components

Components should:

1. Use composition API with `<script setup>`
2. Include proper TypeScript types
3. Use store-based state management
4. Use theme variables for styling

Example:

```vue
<script setup lang="ts">
import { useThemeStore } from '@/stores/theme'

const themeStore = useThemeStore()
</script>

<template>
  <div class="my-component">
    <!-- Component content -->
  </div>
</template>

<style scoped>
.my-component {
  background: var(--qui-bg-primary);
  color: var(--qui-text-primary);
}
</style>
```

## Theme System

Themes are defined as TypeScript objects:

```typescript
interface Theme {
  name: string
  variables: Partial<ThemeVariables>
  components?: {
    [key: string]: ComponentTheme
  }
}
```

Create new themes in `src/core/theme/themes/`.

## Creating Applications

Developers can create applications for the Webtop framework by following these guidelines:

```typescript
// Example application structure
export default {
  name: 'MyApp',
  manifest: {
    version: '1.0.0',
    permissions: ['storage', 'network'],
  },
  setup() {
    // Application initialization
  },
}
```

## Installing Applications

Applications can be installed in two ways:

1. **Built-in Applications**: Place your application in the `src/apps` directory
2. **Dynamic Installation**: Use the application installer API

```typescript
// Example installation
await webtop.installApp({
  url: 'https://my-app-bundle.js',
  manifest: {
    name: 'MyApp',
    version: '1.0.0',
  },
})
```

## Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

### Run Unit Tests with [Vitest](https://vitest.dev/)

```sh
npm run test:unit
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```

```

```
