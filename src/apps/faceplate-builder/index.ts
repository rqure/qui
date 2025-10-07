import { markRaw } from 'vue';
import FaceplateBuilderApp from './FaceplateBuilderApp.vue';
import type { RegisteredApp } from '@/core/apps/types';

const faceplateIconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <defs>
    <linearGradient id="faceplateGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00ffaa" />
      <stop offset="100%" stop-color="#0066ff" />
    </linearGradient>
  </defs>
  <rect x="2" y="3" width="20" height="12" rx="2" ry="2" fill="url(#faceplateGradient)" opacity="0.85" />
  <rect x="4" y="5" width="8" height="8" rx="1.5" ry="1.5" fill="rgba(0,0,0,0.55)" />
  <circle cx="8" cy="9" r="2" fill="#00ffaa" />
  <path d="M14 6h6v2h-6zM14 10h6v2h-6z" fill="#ffffff" opacity="0.85" />
  <rect x="2" y="16" width="20" height="5" rx="1.5" ry="1.5" fill="rgba(0,0,0,0.65)" />
  <rect x="4" y="17" width="6" height="3" rx="1" ry="1" fill="#00ffaa" opacity="0.7" />
  <rect x="11" y="17" width="6" height="3" rx="1" ry="1" fill="#00ffaa" opacity="0.35" />
</svg>
`;

const iconDataUrl = `data:image/svg+xml;base64,${btoa(faceplateIconSvg)}`;

const faceplateBuilderApp: RegisteredApp = {
  manifest: {
    id: 'faceplate-builder',
    name: 'Faceplate Builder',
    version: '1.0.0',
    icon: iconDataUrl,
    permissions: ['data.read', 'data.write'],
    defaultWindowSize: {
      width: 1320,
      height: 820,
    },
  },
  component: {
    default: markRaw(FaceplateBuilderApp),
  },
};

export default faceplateBuilderApp;
