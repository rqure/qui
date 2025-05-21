import { markRaw } from 'vue'
import SchemaEditorApp from './SchemaEditorApp.vue'
import type { RegisteredApp } from '@/core/apps/types'
import './styles/global.css'

// Define the icon as an SVG data URL
const schemaEditorIcon = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <defs>
    <linearGradient id="schemaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#9c27b0" />
      <stop offset="100%" stop-color="#673ab7" />
    </linearGradient>
    <filter id="schemaGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="1" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>
  <path fill="url(#schemaGradient)" filter="url(#schemaGlow)" d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z"/>
</svg>
`

// Convert SVG to data URL
const iconDataUrl = `data:image/svg+xml;base64,${btoa(schemaEditorIcon)}`

// Define the app object
const schemaEditorApp: RegisteredApp = {
  manifest: {
    id: 'schema-editor',
    name: 'Schema Editor',
    version: '1.0.0',
    icon: iconDataUrl,
    permissions: ['data.read', 'data.write', 'schema.manage'],
    defaultWindowSize: {
      width: 1000,
      height: 700
    }
  },
  component: {
    default: markRaw(SchemaEditorApp)
  }
}

export default schemaEditorApp
