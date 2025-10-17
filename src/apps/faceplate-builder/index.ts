/**
 * Faceplate Builder & Viewer - App Registration
 */

import { markRaw } from 'vue'
import FaceplateViewerApp from './FaceplateViewerApp.vue'
import FaceplateBuilderApp from './FaceplateBuilderApp.vue'
import type { RegisteredApp } from '@/core/apps/types'

// Define the viewer icon - a monitor/display with data visualization
const faceplateViewerIcon = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <defs>
    <linearGradient id="fpGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00ffaa" />
      <stop offset="100%" stop-color="#00aaff" />
    </linearGradient>
    <filter id="fpGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="1" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>
  <!-- Monitor/screen -->
  <rect x="2" y="3" width="20" height="14" rx="1" fill="none" stroke="url(#fpGradient)" stroke-width="1.5" filter="url(#fpGlow)"/>
  <!-- Stand -->
  <path d="M8,17 L16,17 M12,14 L12,17" stroke="url(#fpGradient)" stroke-width="1.5" stroke-linecap="round"/>
  <!-- Dashboard elements -->
  <circle cx="7" cy="8" r="2" fill="url(#fpGradient)" opacity="0.7"/>
  <rect x="11" y="6" width="9" height="1.5" fill="url(#fpGradient)" opacity="0.6"/>
  <rect x="11" y="9" width="6" height="1.5" fill="url(#fpGradient)" opacity="0.5"/>
  <path d="M5,12 L9,12 L11,14 L13,10 L15,14 L17,12 L19,12" stroke="#00ffaa" stroke-width="1.2" fill="none" opacity="0.8"/>
</svg>
`

// Convert viewer SVG to data URL
const viewerIconDataUrl = `data:image/svg+xml;base64,${btoa(faceplateViewerIcon)}`

// Define the builder icon - a pencil/edit tool with shapes
const faceplateBuilderIcon = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <defs>
    <linearGradient id="builderGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ff8800" />
      <stop offset="100%" stop-color="#ff0088" />
    </linearGradient>
    <filter id="builderGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="1" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>
  <!-- Canvas/artboard -->
  <rect x="2" y="2" width="20" height="20" rx="1" fill="none" stroke="url(#builderGradient)" stroke-width="1.5" opacity="0.3"/>
  <!-- Pencil tool -->
  <path d="M14,4 L18,8 L9,17 L5,18 L6,14 Z" fill="url(#builderGradient)" filter="url(#builderGlow)"/>
  <line x1="14" y1="4" x2="18" y2="8" stroke="#ff8800" stroke-width="1.5" stroke-linecap="round"/>
  <!-- Sample shapes on canvas -->
  <circle cx="10" cy="10" r="2" fill="none" stroke="url(#builderGradient)" stroke-width="1" opacity="0.6"/>
  <rect x="13" y="13" width="4" height="3" fill="none" stroke="url(#builderGradient)" stroke-width="1" opacity="0.5"/>
</svg>
`

// Convert builder SVG to data URL
const builderIconDataUrl = `data:image/svg+xml;base64,${btoa(faceplateBuilderIcon)}`

// Define the viewer app
const faceplateViewerApp: RegisteredApp = {
  manifest: {
    id: 'faceplate-viewer',
    name: 'Faceplate Viewer',
    version: '1.0.0',
    icon: viewerIconDataUrl,
    permissions: ['data.read'],
    defaultWindowSize: {
      width: 1200,
      height: 800
    }
  },
  component: {
    default: markRaw(FaceplateViewerApp)
  }
}

// Define the builder app
export const faceplateBuilderApp: RegisteredApp = {
  manifest: {
    id: 'faceplate-builder',
    name: 'Faceplate Builder',
    version: '1.0.0',
    icon: builderIconDataUrl,
    permissions: ['data.read', 'data.write'],
    defaultWindowSize: {
      width: 1400,
      height: 730
    }
  },
  component: {
    default: markRaw(FaceplateBuilderApp)
  }
}

export default faceplateViewerApp

// Also export services for programmatic use
export { FaceplateContext } from './services/FaceplateContext';
export { CallbackManager } from './services/CallbackManager';
export { FaceplateRenderer } from './services/FaceplateRenderer';
export { default as FaceplateViewer } from './components/FaceplateViewer.vue';

// Types
export type {
  NotificationChannel,
  FaceplateShapeConfig,
  FaceplateModelConfig,
  FaceplateConfig,
  NotificationContext,
  FaceplateRendererOptions,
  ShapeFactory,
  NotificationSubscription
} from './types';
