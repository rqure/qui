import { markRaw } from 'vue'
import TerminalApp from './TerminalApp.vue'
import type { RegisteredApp } from '@/core/apps/types'

// Define the icon as an SVG data URL
const terminalIcon = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <defs>
    <linearGradient id="termGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00ff88" />
      <stop offset="100%" stop-color="#00cc66" />
    </linearGradient>
    <filter id="termGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="1" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>
  <rect x="2" y="4" width="20" height="16" rx="2" fill="none" stroke="url(#termGradient)" stroke-width="2" filter="url(#termGlow)" />
  <path d="M6 8 L10 12 L6 16" fill="none" stroke="url(#termGradient)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" filter="url(#termGlow)" />
  <line x1="12" y1="16" x2="18" y2="16" stroke="url(#termGradient)" stroke-width="2" stroke-linecap="round" filter="url(#termGlow)" />
</svg>
`

// Convert SVG to data URL
const iconDataUrl = `data:image/svg+xml;base64,${btoa(terminalIcon)}`

// Define the app object
const terminalApp: RegisteredApp = {
  manifest: {
    id: 'terminal',
    name: 'Terminal',
    version: '1.0.0',
    icon: iconDataUrl,
    permissions: ['data.read', 'data.write'],
    defaultWindowSize: {
      width: 800,
      height: 600
    }
  },
  component: {
    default: markRaw(TerminalApp)
  }
}

export default terminalApp
