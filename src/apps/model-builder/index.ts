import { markRaw } from 'vue'
import ModelBuilderApp from './ModelBuilderApp.vue'
import type { RegisteredApp } from '@/core/apps/types'
import './styles/model-builder.css'

// Define the icon as an SVG data URL
const modelBuilderIcon = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <defs>
    <linearGradient id="mbGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4fc3f7" />
      <stop offset="100%" stop-color="#00b0ff" />
    </linearGradient>
    <filter id="mbGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="1" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>
  <path fill="url(#mbGradient)" filter="url(#mbGlow)" d="M22,9V7h-2V5c0-1.1-0.9-2-2-2H4C2.9,3,2,3.9,2,5v14c0,1.1,0.9,2,2,2h14c1.1,0,2-0.9,2-2v-2h2v-2h-2v-2h2v-2h-2V9H22z M16,19H4V5h12V19z M18,11h2v2h-2V11z M18,15h2v2h-2V15z M6,13h8v-2H6V13z M6,17h8v-2H6V17z M6,9h8V7H6V9z" />
  <path fill="#ffffff" opacity="0.7" d="M14,16H6v-2h8V16z M14,12H6v-2h8V12z M14,8H6V6h8V8z" />
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
