# qui

## Goal

QUI represents a webtop application framework built with Vue 3, enabling developers to create and install their own front-end applications within a unified desktop-like environment.

## Features

- Desktop-like environment in the browser
- Window management system
- Application lifecycle management
- Inter-application communication
- Pluggable application architecture

## Architecture

The Webtop framework is built as a single-page application (SPA) with the following structure:

```sh
src
├── core                  # Core Webtop framework
│   ├── window           # Window management system
│   ├── apps             # Application lifecycle and registry
│   ├── ipc              # Inter-process communication
│   └── theme            # Theme engine and definitions
├── components           # Shared UI components
├── styles              # Global styles and theme variables
│   ├── themes          # Theme definitions
│   └── variables       # CSS variables and tokens
├── apps                # Built-in applications
└── layouts             # Desktop layouts and panels
```

## Theming System

The framework provides comprehensive UI customization through:

- **Theme Engine**: Dynamic theme switching and customization
- **CSS Variables**: Global design tokens for consistent styling
- **Component Themes**: Individual component styling overrides

Example theme configuration:

```typescript
export const darkTheme = {
  name: 'dark',
  variables: {
    '--qui-bg-primary': '#1a1a1a',
    '--qui-text-primary': '#ffffff',
    '--qui-accent-color': '#0066cc',
  },
  components: {
    Window: {
      borderRadius: '8px',
      titlebarHeight: '32px',
    },
  },
}
```

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
