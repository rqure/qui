import { markRaw } from 'vue'
import ModelBuilderApp from './ModelBuilderApp.vue'
import type { RegisteredApp } from '@/core/apps/types'
import './styles/global.css'

// Define the icon as an SVG data URL for the Model Builder
const modelBuilderIcon = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <defs>
    <linearGradient id="modelGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00ffaa" />
      <stop offset="100%" stop-color="#00ddff" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="1" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>
  <path fill="url(#modelGradient)" filter="url(#glow)" d="M15,5.5L15,9.5L12.5,6.5L9.5,10L7.5,7.5L4,12L6,12L7.5,10L9.5,12.5L13,8L15,10.5L15,14.5L19,14.5L19,5.5L15,5.5M5,15L4,16L4,20L8,20L9,19L19,19L20,18L20,15L5,15M8,17A1,1 0 0,1 9,18A1,1 0 0,1 8,19A1,1 0 0,1 7,18A1,1 0 0,1 8,17Z" />
  <path fill="white" opacity="0.5" d="M7.5,10L9.5,12.5L13,8L15,10.5L15,14.5L19,14.5" stroke="#00ffaa" stroke-width="0.2" stroke-opacity="0.5" />
</svg>
`

// Convert SVG to data URL
const iconDataUrl = `data:image/svg+xml;base64,${btoa(modelBuilderIcon)}`

// Define the app object
const modelBuilderApp: RegisteredApp = {
  manifest: {
    id: 'model-builder',
    name: 'Model Builder',
    version: '1.0.0',
    icon: iconDataUrl,
    permissions: ['data.read', 'data.write'],
    defaultWindowSize: {
      width: 1280,
      height: 720
    }
  },
  component: {
    default: markRaw(ModelBuilderApp)
  }
}

export default modelBuilderApp
