import { markRaw } from 'vue';
import SchematicBuilderApp from './SchematicBuilderApp.vue';
import type { RegisteredApp } from '@/core/apps/types';

const schematicIconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <defs>
    <linearGradient id="schematicGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00ccff" />
      <stop offset="100%" stop-color="#0088ff" />
    </linearGradient>
  </defs>
  <rect x="2" y="2" width="20" height="20" rx="2" ry="2" fill="none" stroke="url(#schematicGradient)" stroke-width="2" opacity="0.85" />
  <circle cx="7" cy="7" r="2.5" fill="url(#schematicGradient)" />
  <circle cx="17" cy="7" r="2.5" fill="url(#schematicGradient)" />
  <circle cx="7" cy="17" r="2.5" fill="url(#schematicGradient)" />
  <circle cx="17" cy="17" r="2.5" fill="url(#schematicGradient)" />
  <circle cx="12" cy="12" r="2.5" fill="url(#schematicGradient)" />
  <line x1="7" y1="7" x2="12" y2="12" stroke="#00ccff" stroke-width="1.5" opacity="0.7" />
  <line x1="17" y1="7" x2="12" y2="12" stroke="#00ccff" stroke-width="1.5" opacity="0.7" />
  <line x1="7" y1="17" x2="12" y2="12" stroke="#00ccff" stroke-width="1.5" opacity="0.7" />
  <line x1="17" y1="17" x2="12" y2="12" stroke="#00ccff" stroke-width="1.5" opacity="0.7" />
</svg>
`;

const iconDataUrl = `data:image/svg+xml;base64,${btoa(schematicIconSvg)}`;

const schematicBuilderApp: RegisteredApp = {
  manifest: {
    id: 'schematic-builder',
    name: 'Schematic Builder',
    version: '1.0.0',
    icon: iconDataUrl,
    permissions: ['data.read', 'data.write'],
    defaultWindowSize: {
      width: 1320,
      height: 820,
    },
  },
  component: {
    default: markRaw(SchematicBuilderApp),
  },
};

export default schematicBuilderApp;
