# qui

## Goal

QUI represents a webtop application framework built with Vue 3, enabling developers to create and install their own front-end applications within a unified desktop-like environment.

## Architecture Principles

- **Single Page Application**: Everything runs in a single page without routing
- **State Management**: Uses Pinia stores for global state management
- **Component Architecture**: Hierarchical component system with clear responsibilities
- **Application System**: Pluggable application architecture with manifest system
- **Theme System**: Centralized theme management through stores and CSS variables

## Project Structure

```sh
src
├── App.vue
├── assets
│   ├── interactive.css
│   ├── logout-icon.ts
│   └── main.css
├── components
│   ├── common
│   │   └── QeiLogo.vue
│   ├── icons
│   │   └── qei-logo.png
│   ├── menu
│   │   └── ContextMenuComponent.vue
│   ├── taskbar
│   │   ├── StartMenuComponent.vue
│   │   └── TaskbarComponent.vue
│   ├── WebtopLogin.vue
│   ├── window
│   │   ├── BaseWindow.vue
│   │   └── LogoutConfirmWindow.vue
│   └── workspace
│       └── WorkspaceComponent.vue
├── core
│   ├── apps
│   │   └── types.ts
│   ├── data
│   │   ├── protobufs_pb.d.ts
│   │   └── types.ts
│   ├── menu
│   │   ├── types.ts
│   │   └── utils.ts
│   ├── security
│   │   ├── composables.ts
│   │   ├── keycloak-config.ts
│   │   ├── keycloak.ts
│   │   └── types.ts
│   ├── theme
│   │   ├── ThemeProvider.vue
│   │   ├── themes
│   │   │   └── default.ts
│   │   └── types.ts
│   ├── utils
│   │   └── url.ts
│   └── window
│       ├── types.ts
│       └── utils.ts
├── main.ts
├── stores
│   ├── apps.ts
│   ├── auth.ts
│   ├── data.ts
│   ├── menu.ts
│   ├── security.ts
│   ├── theme.ts
│   └── windows.ts
└── vite-env.d.ts
```

## State Management

### App Store

Manages application registration and launching:

```typescript
const apps = useAppStore()
apps.registerApp(myApp)
apps.launchApp('app-id')
```

### Window Store

Handles window creation and management:

```typescript
const windows = useWindowStore()
windows.createWindow({
  title: 'My Window',
  component: MyComponent,
})
```

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

### Menu Store

Manages context menus across the application:

```typescript
const menu = useMenuStore()

// Show a context menu
menu.showMenu(
  { x: event.clientX, y: event.clientY },
  [
    { id: 'action1', label: 'Action 1', action: () => {} },
    { id: 'sep', separator: true, label: '' },
    {
      id: 'submenu',
      label: 'Sub Menu',
      children: [{ id: 'sub1', label: 'Sub Action 1', action: () => {} }],
    },
  ],
  { type: 'custom', data: { id: 'some-id' } },
)

// Hide the menu
menu.hideMenu()
```

## Window Management

Windows support the following features:

### Window Controls

- Draggable titlebar
- Minimize/Maximize/Close buttons
- Context menu with window actions
- Active window tracking
- Z-index management

### Window Resizing

Windows can be resized from any edge or corner:

```typescript
interface WindowState {
  // ...other properties...
  minWidth: number // Minimum window width (default: 200)
  minHeight: number // Minimum window height (default: 150)
  maxWidth?: number // Optional maximum width
  maxHeight?: number // Optional maximum height
  isResizing: boolean // Tracks resize state
  resizeHandle: string // Current resize handle in use
}
```

### Window States

Windows maintain multiple states:

```typescript
{
  isMinimized: boolean // Window is minimized to taskbar
  isMaximized: boolean // Window is maximized to full screen
  prevSize: {
    // Stores pre-maximized dimensions
    x: number
    y: number
    width: number
    height: number
  }
}
```

### Usage Example

```typescript
const windows = useWindowStore()

// Create a window with size constraints
windows.createWindow({
  title: 'My Window',
  component: MyComponent,
  width: 800,
  height: 600,
  minWidth: 400,
  minHeight: 300,
})

// Window operations
windows.minimizeWindow(windowId)
windows.maximizeWindow(windowId)
windows.restoreWindow(windowId)
windows.updateWindowSize(windowId, width, height)
windows.updateWindowPosition(windowId, x, y)
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

### Theme Structure

Themes are organized into logical categories:

```typescript
interface ThemeVariables {
  // Core categories
  Fonts // Typography settings
  Global // Base colors and common values
  Effects // Visual effects and animations

  // Component specific
  Window // Window styling
  Taskbar // Taskbar and buttons
  StartMenu // Start menu appearance
  ContextMenu // Context menu styling

  // Special categories
  Danger // Danger/warning states
  Gradients // Gradient definitions
  Shadows // Shadow effects
  Overlays // Overlay effects
}
```

### Using Theme Variables

Always use theme variables instead of hardcoded values:

```vue
<!-- ❌ Don't -->
<style>
.element {
  color: rgba(255, 255, 255, 0.9);
  box-shadow: 0 0 30px rgba(0, 0, 0, 0.3);
}
</style>

<!-- ✅ Do -->
<style>
.element {
  color: var(--qui-text-secondary);
  box-shadow: var(--qui-shadow-window);
}
</style>
```

### Effect Patterns

Common visual effects are standardized:

```css
/* Shadows */
--qui-shadow-window     // Window shadows
--qui-shadow-taskbar    // Taskbar shadow
--qui-shadow-icon       // Icon effects
--qui-shadow-accent     // Accent highlights

/* Overlays */
--qui-overlay-hover     // Hover state overlays
--qui-overlay-active    // Active state overlays
--qui-overlay-primary   // Primary overlays
--qui-overlay-secondary // Secondary overlays

/* Borders */
--qui-border-opacity    // Standard border opacity
--qui-hover-border     // Hover state borders
```

### Animation Guidelines

Use provided animation variables:

```css
.element {
  transition: all var(--qui-transition-speed) var(--qui-animation-bounce);
}

.hover-effect:hover {
  transform: var(--qui-hover-scale);
  box-shadow: var(--qui-glow-effect);
}
```

## Component Guidelines

### Window Components

Windows should:

- Use `var(--qui-window-bg)` for background
- Implement `var(--qui-window-radius)` for borders
- Use `var(--qui-shadow-window)` for shadow
- Apply `var(--qui-backdrop-blur)` for glass effect

### Taskbar Items

Taskbar buttons should:

- Use `var(--qui-taskbar-button-radius)` for border radius
- Implement active states with `var(--qui-gradient-secondary)`
- Use `var(--qui-shadow-accent)` for active highlights
- Apply `var(--qui-hover-border)` for hover states

### Context Menus

Context menus should:

- Use `var(--qui-menu-bg)` for background
- Apply `var(--qui-menu-radius)` for border radius
- Use `var(--qui-menu-shadow)` for shadow
- Implement `var(--qui-menu-item-hover)` for hover states

### Icons

Icon guidelines:

- Use `var(--qui-shadow-icon)` for standard icons
- Use `var(--qui-shadow-icon-strong)` for emphasis
- Maintain 16px × 16px for window/taskbar icons
- Maintain 20px × 20px for menu icons

### Typography

Text guidelines:

- Use `var(--qui-font-size-base)` (14px) for general text
- Use `var(--qui-font-size-small)` (12px) for secondary text
- Use `var(--qui-font-size-large)` (16px) for headings
- Apply appropriate font weights:
  - `var(--qui-font-weight-normal)` (400) for body text
  - `var(--qui-font-weight-medium)` (500) for emphasis
  - `var(--qui-font-weight-bold)` (600) for headings

## Creating Applications

Applications are defined with a manifest and component:

```typescript
interface AppManifest {
  id: string
  name: string
  version: string
  icon?: string
  permissions: string[]
}

const myApp: RegisteredApp = {
  manifest: {
    id: 'my-app',
    name: 'My Application',
    version: '1.0.0',
    permissions: ['storage'],
  },
  component: MyAppComponent,
}
```

## Components

### Core Components

- **WorkspaceComponent**: Manages the desktop workspace area
- **BaseWindow**: Base window component with dragging support
- **TaskbarComponent**: Main taskbar with start menu
- **StartMenuComponent**: Application launcher menu

### Creating Windows

Windows can be created with:

```typescript
windows.createWindow({
  title: 'Window Title',
  component: YourComponent,
  width: 800,
  height: 600,
})
```

## Context Menu System

The framework provides a comprehensive context menu system:

### Menu Items

```typescript
interface MenuItem {
  id: string
  label: string
  icon?: string
  disabled?: boolean
  shortcut?: string
  separator?: boolean
  action?: () => void
  children?: MenuItem[]
}
```

### Using Context Menus

Add context menu support to any component:

```vue
<script setup>
import { useMenuStore } from '@/stores/menu'

const menuStore = useMenuStore()

const handleContextMenu = (e: MouseEvent) => {
  e.preventDefault()
  menuStore.showMenu(
    { x: e.clientX, y: e.clientY },
    [
      { id: 'action1', label: 'Action 1', action: () => {} },
      { id: 'action2', label: 'Action 2', action: () => {} }
    ],
    { type: 'custom' }
  )
}
</script>

<template>
  <div @contextmenu="handleContextMenu">Right click me!</div>
</template>
```

### Features

- Nested submenus
- Keyboard shortcuts
- Icons support
- Disabled states
- Separators
- Context-aware menus
- Automatic positioning
- Click outside handling

## Security System

QUI implements a dual-layer security model based on Permissions and Areas of Responsibility (AOR):

### Security Profile

```typescript
interface SecurityProfile {
  permissions: string[] // What the user can do
  areaOfResponsibility: string[] // What the user can see/access
}
```

### Permissions

Permissions are string-based identifiers that control specific actions:

```typescript
// Example permissions
;[
  'app.launch', // Can launch applications
  'window.create', // Can create new windows
  'settings.modify', // Can modify settings
  'files.read', // Can read files
  'files.write', // Can write files
]
```

### Areas of Responsibility (AOR)

AORs define access boundaries using simple strings:

```typescript
// Example AORs
;[
  'global', // Full access
  'department.sales', // Sales department data
  'region.europe', // European region data
  'client.acme', // ACME client data
]
```

Special AOR value `'*'` grants access to all areas.

### Usage Examples

#### Component Security

```vue
<script setup>
import { useSecurityCheck } from '@/core/security/composables'

const { checkAccess, requirePermission } = useSecurityCheck()

// Check specific permission
const canCreateWindow = requirePermission('window.create')

// Check combined security context
const canAccessFeature = checkAccess({
  requiredPermissions: ['feature.use'],
  requiredAOR: ['department.sales'],
})
</script>

<template>
  <button v-if="canCreateWindow && canAccessFeature" @click="createWindow">Create Window</button>
</template>
```

#### Application Security

```typescript
const myApp = {
  manifest: {
    id: 'sales-app',
    security: {
      requiredPermissions: ['app.sales'],
      requiredAOR: ['department.sales'],
    },
  },
  component: withSecurity(SalesAppComponent, {
    requiredPermissions: ['app.sales'],
    requiredAOR: ['department.sales'],
  }),
}
```

#### Direct Store Access

```typescript
const security = useSecurityStore()

// Check specific permission
if (security.hasPermission('settings.modify')) {
  // Modify settings
}

// Check area access
if (security.hasAOR('region.europe')) {
  // Access European data
}

// Check multiple requirements
const check = security.checkSecurity({
  requiredPermissions: ['data.read', 'data.write'],
  requiredAOR: ['department.sales', 'region.europe'],
})

if (check.hasPermission && check.hasAOR) {
  // Perform protected operation
}
```

### Security Best Practices

1. **Least Privilege**: Request minimum necessary permissions
2. **Clear Naming**: Use descriptive permission and AOR names
3. **Granular Control**: Split complex operations into specific permissions
4. **Consistent Structure**: Use dot notation for hierarchical permissions
5. **Documentation**: Document required permissions in component comments

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
