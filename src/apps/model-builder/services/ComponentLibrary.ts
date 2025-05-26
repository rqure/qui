/**
 * Component Library
 * 
 * This file contains predefined components that users can add to their models.
 * Each component has a type, name, category, and preview icon.
 */

export interface ComponentTemplate {
  type: string;
  name: string;
  description: string;
  category: string;
  icon: string;
}

export const componentLibrary: ComponentTemplate[] = [
  // Basic Components
  {
    type: 'Rectangle',
    name: 'Rectangle',
    description: 'A basic rectangle shape',
    category: 'basic',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
      <rect x="3" y="6" width="18" height="12" fill="#4fc3f7" stroke="#fff" stroke-width="1"/>
    </svg>`
  },
  {
    type: 'Circle',
    name: 'Circle',
    description: 'A basic circle shape',
    category: 'basic',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
      <circle cx="12" cy="12" r="8" fill="#4fc3f7" stroke="#fff" stroke-width="1"/>
    </svg>`
  },
  {
    type: 'Line',
    name: 'Line',
    description: 'A line element',
    category: 'basic',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
      <line x1="4" y1="4" x2="20" y2="20" stroke="#4fc3f7" stroke-width="2"/>
    </svg>`
  },
  {
    type: 'Text',
    name: 'Text',
    description: 'A text element',
    category: 'basic',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
      <text x="2" y="16" fill="#4fc3f7" font-family="sans-serif" font-size="14">Text</text>
    </svg>`
  },
  {
    type: 'Image',
    name: 'Image',
    description: 'An image element',
    category: 'basic',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
      <rect x="3" y="5" width="18" height="14" fill="rgba(79, 195, 247, 0.2)" stroke="#4fc3f7" stroke-width="1"/>
      <circle cx="9" cy="10" r="2" fill="#4fc3f7"/>
      <polygon points="6,15 10,12 12,14 16,10 18,12 18,17 6,17" fill="#4fc3f7"/>
    </svg>`
  },
  
  // Indicators
  {
    type: 'Gauge',
    name: 'Gauge',
    description: 'A radial gauge indicator',
    category: 'indicators',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
      <path d="M12,2 A10,10 0 0 1 17,20 L7,20 A10,10 0 0 1 12,2" fill="none" stroke="#4fc3f7" stroke-width="2"/>
      <circle cx="12" cy="16" r="1" fill="#4fc3f7"/>
      <line x1="12" y1="16" x2="12" y2="9" stroke="#4fc3f7" stroke-width="2"/>
    </svg>`
  },
  {
    type: 'BarIndicator',
    name: 'Bar Indicator',
    description: 'A horizontal or vertical bar indicator',
    category: 'indicators',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
      <rect x="3" y="6" width="18" height="12" fill="none" stroke="#4fc3f7" stroke-width="1"/>
      <rect x="4" y="7" width="10" height="10" fill="#4fc3f7"/>
      <line x1="16" y1="7" x2="16" y2="17" stroke="#fff" stroke-width="1" stroke-dasharray="1,1"/>
    </svg>`
  },
  {
    type: 'LevelIndicator',
    name: 'Level Indicator',
    description: 'A level indicator for tanks',
    category: 'indicators',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
      <rect x="6" y="4" width="12" height="16" rx="1" ry="1" fill="none" stroke="#4fc3f7" stroke-width="1"/>
      <rect x="7" y="13" width="10" height="6" fill="#4fc3f7"/>
      <line x1="6" y1="10" x2="18" y2="10" stroke="#fff" stroke-width="1" stroke-dasharray="1,1"/>
    </svg>`
  },
  {
    type: 'StatusIndicator',
    name: 'Status Indicator',
    description: 'A status indicator with multiple states',
    category: 'indicators',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
      <circle cx="12" cy="12" r="8" fill="#4fc3f7"/>
      <circle cx="12" cy="12" r="4" fill="#fff"/>
    </svg>`
  },
  
  // Controls
  {
    type: 'Button',
    name: 'Button',
    description: 'An interactive button',
    category: 'controls',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
      <rect x="4" y="8" width="16" height="8" rx="2" ry="2" fill="#4fc3f7"/>
      <text x="7" y="15" fill="#fff" font-family="sans-serif" font-size="6">BUTTON</text>
    </svg>`
  },
  {
    type: 'Slider',
    name: 'Slider',
    description: 'A slider for adjusting values',
    category: 'controls',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
      <line x1="4" y1="12" x2="20" y2="12" stroke="#4fc3f7" stroke-width="2"/>
      <circle cx="14" cy="12" r="3" fill="#4fc3f7"/>
    </svg>`
  },
  {
    type: 'Switch',
    name: 'Switch',
    description: 'A toggle switch',
    category: 'controls',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
      <rect x="4" y="9" width="16" height="6" rx="3" ry="3" fill="#4fc3f7"/>
      <circle cx="16" cy="12" r="3" fill="#fff"/>
    </svg>`
  },
  
  // Charts
  {
    type: 'LineChart',
    name: 'Line Chart',
    description: 'A line chart for time-series data',
    category: 'charts',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
      <rect x="3" y="4" width="18" height="16" fill="none" stroke="#4fc3f7" stroke-width="1"/>
      <polyline points="3,16 7,12 12,18 16,10 21,6" fill="none" stroke="#4fc3f7" stroke-width="2"/>
    </svg>`
  },
  {
    type: 'BarChart',
    name: 'Bar Chart',
    description: 'A bar chart for comparing values',
    category: 'charts',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
      <rect x="3" y="4" width="18" height="16" fill="none" stroke="#4fc3f7" stroke-width="1"/>
      <rect x="5" y="10" width="2" height="8" fill="#4fc3f7"/>
      <rect x="9" y="8" width="2" height="10" fill="#4fc3f7"/>
      <rect x="13" y="12" width="2" height="6" fill="#4fc3f7"/>
      <rect x="17" y="6" width="2" height="12" fill="#4fc3f7"/>
    </svg>`
  },
  {
    type: 'PieChart',
    name: 'Pie Chart',
    description: 'A pie chart for showing proportions',
    category: 'charts',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
      <circle cx="12" cy="12" r="8" fill="none" stroke="#4fc3f7" stroke-width="1"/>
      <path d="M12,4 L12,12 L4,12 A8,8 0 0,1 12,4" fill="#4fc3f7"/>
      <path d="M12,12 L18,18 A8,8 0 0,0 12,4" fill="#80d8ff"/>
    </svg>`
  },
  
  // Containers
  {
    type: 'Panel',
    name: 'Panel',
    description: 'A container panel for grouping components',
    category: 'containers',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
      <rect x="3" y="4" width="18" height="16" rx="2" ry="2" fill="rgba(79, 195, 247, 0.2)" stroke="#4fc3f7" stroke-width="1"/>
      <rect x="3" y="4" width="18" height="4" rx="2" ry="2" fill="#4fc3f7"/>
    </svg>`
  },
  {
    type: 'Tabs',
    name: 'Tabs',
    description: 'A tabbed container for organizing content',
    category: 'containers',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
      <rect x="3" y="6" width="18" height="14" fill="rgba(79, 195, 247, 0.2)" stroke="#4fc3f7" stroke-width="1"/>
      <rect x="3" y="6" width="6" height="4" fill="#4fc3f7"/>
      <rect x="9" y="6" width="6" height="4" fill="#80d8ff"/>
    </svg>`
  },
  {
    type: 'NestedModel',
    name: 'Nested Model',
    description: 'Include another model within this one',
    category: 'containers',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
      <rect x="3" y="4" width="18" height="16" fill="rgba(79, 195, 247, 0.1)" stroke="#4fc3f7" stroke-width="1"/>
      <rect x="7" y="8" width="10" height="8" fill="rgba(79, 195, 247, 0.3)" stroke="#4fc3f7" stroke-width="1"/>
      <rect x="9" y="10" width="6" height="4" fill="#4fc3f7"/>
    </svg>`
  }
];
