import { markRaw } from 'vue'
import DatabaseBrowserApp from './DatabaseBrowserApp.vue'
import type { RegisteredApp } from '@/core/apps/types'
import './styles/global.css'

// Define the icon as an SVG data URL with improved contrast and color
const databaseBrowserIcon = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <defs>
    <linearGradient id="dbGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00ffaa" />
      <stop offset="100%" stop-color="#00ccff" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="1" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>
  <path fill="url(#dbGradient)" filter="url(#glow)" d="M12,3C7.58,3,4,4.79,4,7C4,9.21,7.58,11,12,11C16.42,11,20,9.21,20,7C20,4.79,16.42,3,12,3M4,9V12C4,14.21,7.58,16,12,16C16.42,16,20,14.21,20,12V9C20,11.21,16.42,13,12,13C7.58,13,4,11.21,4,9M4,14V17C4,19.21,7.58,21,12,21C16.42,21,20,19.21,20,17V14C20,16.21,16.42,18,12,18C7.58,18,4,16.21,4,14Z" />
  <path fill="white" opacity="0.7" d="M12,3C7.58,3,4,4.79,4,7C4,9.21,7.58,11,12,11C16.42,11,20,9.21,20,7C20,4.79,16.42,3,12,3M4,9V12C4,14.21,7.58,16,12,16C16.42,16,20,14.21,20,12V9" stroke="#00ffaa" stroke-width="0.2" stroke-opacity="0.5" />
</svg>
`

// Convert SVG to data URL
const iconDataUrl = `data:image/svg+xml;base64,${btoa(databaseBrowserIcon)}`

// Define the app object
const databaseBrowserApp: RegisteredApp = {
  manifest: {
    id: 'database-browser',
    name: 'Database Browser',
    version: '1.0.0',
    icon: iconDataUrl,
    permissions: ['data.read', 'data.write'],
    defaultWindowSize: {
      width: 1200,
      height: 600
    }
  },
  component: {
    default: markRaw(DatabaseBrowserApp)
  }
}

export default databaseBrowserApp
