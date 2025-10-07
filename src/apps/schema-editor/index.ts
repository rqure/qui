import { markRaw } from 'vue'
import SchemaEditorApp from './SchemaEditorApp.vue'
import type { RegisteredApp } from '@/core/apps/types'

const schemaEditorIcon = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <defs>
    <linearGradient id="schemaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#8e2de2" />
      <stop offset="100%" stop-color="#4a00e0" />
    </linearGradient>
    <filter id="schemaGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="1" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>
  <path fill="url(#schemaGradient)" filter="url(#schemaGlow)" d="M4 4h4v4H4V4m6 0h4v4h-4V4m6 0h4v4h-4V4M4 10h4v4H4v-4m6 0h4v4h-4v-4m6 0h4v4h-4v-4M4 16h4v4H4v-4m6 0h4v4h-4v-4m6 0h4v4h-4v-4" />
  <path fill="#ffffff" opacity="0.7" d="M7 5h2v2H7V5m6 0h2v2h-2V5M5 11h2v2H5v-2m6 0h2v2h-2v-2m6 0h2v2h-2v-2M5 17h2v2H5v-2m6 0h2v2h-2v-2" />
  <path fill="#ffffff" opacity="0.5" d="M4 8h16v1H4V8m0 6h16v1H4v-1" />
</svg>
`

const iconDataUrl = `data:image/svg+xml;base64,${btoa(schemaEditorIcon)}`

const schemaEditorApp: RegisteredApp = {
  manifest: {
    id: 'schema-editor',
    name: 'Schema Editor',
    version: '1.0.0',
    icon: iconDataUrl,
    permissions: ['data.read', 'data.write'],
    defaultWindowSize: {
      width: 1400,
      height: 800,
    },
  },
  component: {
    default: markRaw(SchemaEditorApp),
  },
}

export default schemaEditorApp
