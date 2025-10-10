/**
 * Primitive Component Registry
 * 
 * Single source of truth for all faceplate primitive components.
 * Defines both builder metadata (catalog, schemas) and runtime rendering.
 */

import type { Component } from 'vue';

export interface PropertySchema {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'option' | 'color';
  default: any;
  options?: Array<{ label: string; value: any }>;
  min?: number;
  max?: number;
  step?: number;
}

export interface PrimitiveDefinition {
  // Builder metadata
  id: string;
  label: string;
  description: string;
  icon: string;
  category: 'Text' | 'Shapes' | 'Controls' | 'Layout' | 'Data';
  defaultSize: { x: number; y: number };
  defaultProps: Record<string, any>;
  propertySchema: PropertySchema[];
  previewProps?: Record<string, any>;
  
  // Runtime rendering
  renderComponent?: Component;
  renderInline?: (props: { config: Record<string, any>; bindings: Record<string, unknown> }) => any;
}

export const PRIMITIVE_REGISTRY: PrimitiveDefinition[] = [
  // Text Block
  {
    id: 'primitive.text.block',
    label: 'Text Block',
    description: 'Static or data-bound text with alignment and typography controls.',
    icon: '🔖',
    category: 'Text',
    defaultSize: { x: 220, y: 120 },
    defaultProps: {
      text: 'Sample Text',
      align: 'center',
      textColor: '#ffffff',
      fontSize: 20,
      fontWeight: 500,
      fontStyle: 'normal',
      lineHeight: 1.2,
      letterSpacing: 0,
    },
    propertySchema: [
      { key: 'text', label: 'Text', type: 'string', default: 'Sample Text' },
      { key: 'textColor', label: 'Text Color', type: 'color', default: '#ffffff' },
      { key: 'fontSize', label: 'Font Size', type: 'number', default: 20, min: 8, max: 72 },
      { key: 'fontWeight', label: 'Font Weight', type: 'number', default: 500, min: 100, max: 900, step: 100 },
      {
        key: 'fontStyle',
        label: 'Font Style',
        type: 'option',
        default: 'normal',
        options: [
          { label: 'Normal', value: 'normal' },
          { label: 'Italic', value: 'italic' },
        ],
      },
      {
        key: 'align',
        label: 'Alignment',
        type: 'option',
        default: 'center',
        options: [
          { label: 'Left', value: 'left' },
          { label: 'Center', value: 'center' },
          { label: 'Right', value: 'right' },
        ],
      },
      { key: 'lineHeight', label: 'Line Height', type: 'number', default: 1.2, min: 0.5, max: 3, step: 0.1 },
      { key: 'letterSpacing', label: 'Letter Spacing', type: 'number', default: 0, min: -2, max: 10, step: 0.5 },
    ],
    previewProps: { text: 'Sample Text', align: 'center', textColor: '#ffffff' },
  },

  // Text Input
  {
    id: 'primitive.form.field',
    label: 'Text Input',
    description: 'Simple text input field for data entry.',
    icon: '⌨️',
    category: 'Controls',
    defaultSize: { x: 260, y: 80 },
    defaultProps: {
      placeholder: 'Enter text',
      textColor: '#ffffff',
      backgroundColor: 'rgba(0, 0, 0, 0.35)',
      fontSize: 16,
      fontWeight: 500,
      align: 'left',
      visible: true,
    },
    propertySchema: [
      { key: 'placeholder', label: 'Placeholder', type: 'string', default: 'Enter text' },
      { key: 'textColor', label: 'Text Color', type: 'color', default: '#ffffff' },
      { key: 'backgroundColor', label: 'Background', type: 'color', default: 'rgba(0, 0, 0, 0.35)' },
      { key: 'fontSize', label: 'Font Size', type: 'number', default: 16, min: 10, max: 32 },
      { key: 'fontWeight', label: 'Font Weight', type: 'number', default: 500, min: 100, max: 900, step: 100 },
      {
        key: 'align',
        label: 'Alignment',
        type: 'option',
        default: 'left',
        options: [
          { label: 'Left', value: 'left' },
          { label: 'Center', value: 'center' },
          { label: 'Right', value: 'right' },
        ],
      },
    ],
  },

  // Number Input
  {
    id: 'primitive.form.number',
    label: 'Number Input',
    description: 'Numeric input field with optional min/max constraints.',
    icon: '🔢',
    category: 'Controls',
    defaultSize: { x: 200, y: 80 },
    defaultProps: {
      placeholder: '0',
      textColor: '#ffffff',
      backgroundColor: 'rgba(0, 0, 0, 0.35)',
      fontSize: 16,
      min: 0,
      max: 100,
      step: 1,
    },
    propertySchema: [
      { key: 'placeholder', label: 'Placeholder', type: 'string', default: '0' },
      { key: 'textColor', label: 'Text Color', type: 'color', default: '#ffffff' },
      { key: 'backgroundColor', label: 'Background', type: 'color', default: 'rgba(0, 0, 0, 0.35)' },
      { key: 'fontSize', label: 'Font Size', type: 'number', default: 16, min: 10, max: 32 },
      { key: 'min', label: 'Min Value', type: 'number', default: 0 },
      { key: 'max', label: 'Max Value', type: 'number', default: 100 },
      { key: 'step', label: 'Step', type: 'number', default: 1, min: 0.1, step: 0.1 },
    ],
  },

  // Button
  {
    id: 'primitive.form.button',
    label: 'Button',
    description: 'Clickable button for actions.',
    icon: '🔘',
    category: 'Controls',
    defaultSize: { x: 200, y: 80 },
    defaultProps: {
      label: 'Button',
      textColor: '#ffffff',
      backgroundColor: 'rgba(0, 170, 255, 0.8)',
      fontSize: 16,
      fontWeight: 600,
    },
    propertySchema: [
      { key: 'label', label: 'Label', type: 'string', default: 'Button' },
      { key: 'textColor', label: 'Text Color', type: 'color', default: '#ffffff' },
      { key: 'backgroundColor', label: 'Background', type: 'color', default: 'rgba(0, 170, 255, 0.8)' },
      { key: 'fontSize', label: 'Font Size', type: 'number', default: 16, min: 10, max: 32 },
      { key: 'fontWeight', label: 'Font Weight', type: 'number', default: 600, min: 100, max: 900, step: 100 },
    ],
  },

  // Toggle
  {
    id: 'primitive.form.toggle',
    label: 'Toggle',
    description: 'On/off switch for boolean values.',
    icon: '🔄',
    category: 'Controls',
    defaultSize: { x: 180, y: 60 },
    defaultProps: {
      label: 'Toggle',
      activeColor: 'rgba(0, 255, 170, 0.9)',
      inactiveColor: 'rgba(255, 255, 255, 0.1)',
    },
    propertySchema: [
      { key: 'label', label: 'Label', type: 'string', default: 'Toggle' },
      { key: 'activeColor', label: 'Active Color', type: 'color', default: 'rgba(0, 255, 170, 0.9)' },
      { key: 'inactiveColor', label: 'Inactive Color', type: 'color', default: 'rgba(255, 255, 255, 0.1)' },
    ],
  },

  // Rectangle Shape
  {
    id: 'primitive.shape.rectangle',
    label: 'Rectangle',
    description: 'Rectangular shape with configurable fill and border.',
    icon: '▭',
    category: 'Shapes',
    defaultSize: { x: 200, y: 120 },
    defaultProps: {
      fillColor: 'rgba(0, 170, 255, 0.5)',
      borderColor: 'rgba(255, 255, 255, 0.2)',
      borderWidth: 1,
      cornerRadius: 8,
    },
    propertySchema: [
      { key: 'fillColor', label: 'Fill Color', type: 'color', default: 'rgba(0, 170, 255, 0.5)' },
      { key: 'borderColor', label: 'Border Color', type: 'color', default: 'rgba(255, 255, 255, 0.2)' },
      { key: 'borderWidth', label: 'Border Width', type: 'number', default: 1, min: 0, max: 10 },
      { key: 'cornerRadius', label: 'Corner Radius', type: 'number', default: 8, min: 0, max: 50 },
    ],
  },

  // Circle Shape
  {
    id: 'primitive.shape.circle',
    label: 'Circle',
    description: 'Circular shape with configurable fill and border.',
    icon: '●',
    category: 'Shapes',
    defaultSize: { x: 120, y: 120 },
    defaultProps: {
      fillColor: 'rgba(255, 170, 0, 0.5)',
      borderColor: 'rgba(255, 255, 255, 0.2)',
      borderWidth: 1,
    },
    propertySchema: [
      { key: 'fillColor', label: 'Fill Color', type: 'color', default: 'rgba(255, 170, 0, 0.5)' },
      { key: 'borderColor', label: 'Border Color', type: 'color', default: 'rgba(255, 255, 255, 0.2)' },
      { key: 'borderWidth', label: 'Border Width', type: 'number', default: 1, min: 0, max: 10 },
    ],
  },

  // Container
  {
    id: 'primitive.container',
    label: 'Container',
    description: 'Layout container for grouping and organizing child components.',
    icon: '📦',
    category: 'Layout',
    defaultSize: { x: 300, y: 240 },
    defaultProps: {
      backgroundColor: 'transparent',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      borderWidth: 1,
      cornerRadius: 12,
      padding: 16,
      gap: 12,
      layoutDirection: 'vertical',
      horizontalAlign: 'stretch',
      verticalAlign: 'start',
      wrap: false,
      overflow: 'visible',
      visible: true,
      opacity: 1,
    },
    propertySchema: [
      { key: 'backgroundColor', label: 'Background', type: 'color', default: 'transparent' },
      { key: 'borderColor', label: 'Border Color', type: 'color', default: 'rgba(255, 255, 255, 0.1)' },
      { key: 'borderWidth', label: 'Border Width', type: 'number', default: 1, min: 0, max: 10 },
      { key: 'cornerRadius', label: 'Corner Radius', type: 'number', default: 12, min: 0, max: 50 },
      { key: 'padding', label: 'Padding', type: 'number', default: 16, min: 0, max: 50 },
      { key: 'gap', label: 'Gap', type: 'number', default: 12, min: 0, max: 50 },
      {
        key: 'layoutDirection',
        label: 'Layout Direction',
        type: 'option',
        default: 'vertical',
        options: [
          { label: 'Vertical', value: 'vertical' },
          { label: 'Horizontal', value: 'horizontal' },
        ],
      },
      {
        key: 'horizontalAlign',
        label: 'Horizontal Align',
        type: 'option',
        default: 'stretch',
        options: [
          { label: 'Start', value: 'start' },
          { label: 'Center', value: 'center' },
          { label: 'End', value: 'end' },
          { label: 'Stretch', value: 'stretch' },
          { label: 'Space Between', value: 'space-between' },
          { label: 'Space Around', value: 'space-around' },
        ],
      },
      {
        key: 'verticalAlign',
        label: 'Vertical Align',
        type: 'option',
        default: 'start',
        options: [
          { label: 'Start', value: 'start' },
          { label: 'Center', value: 'center' },
          { label: 'End', value: 'end' },
          { label: 'Stretch', value: 'stretch' },
        ],
      },
      { key: 'wrap', label: 'Wrap Children', type: 'boolean', default: false },
      {
        key: 'overflow',
        label: 'Overflow',
        type: 'option',
        default: 'visible',
        options: [
          { label: 'Visible', value: 'visible' },
          { label: 'Hidden', value: 'hidden' },
          { label: 'Scroll', value: 'scroll' },
          { label: 'Auto', value: 'auto' },
        ],
      },
      { key: 'visible', label: 'Visible', type: 'boolean', default: true },
      { key: 'opacity', label: 'Opacity', type: 'number', default: 1, min: 0, max: 1, step: 0.1 },
    ],
  },

  // Tab Container
  {
    id: 'primitive.container.tabs',
    label: 'Tab Container',
    description: 'Container with tabs for switching between different content views.',
    icon: '🗂️',
    category: 'Layout',
    defaultSize: { x: 400, y: 300 },
    defaultProps: {
      backgroundColor: 'transparent',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      borderWidth: 1,
      cornerRadius: 12,
      padding: 16,
      activeTab: 0,
      tabPosition: 'top',
      tabBackgroundColor: 'rgba(255, 255, 255, 0.05)',
      activeTabColor: 'rgba(0, 255, 136, 0.3)',
      tabTextColor: '#ffffff',
      visible: true,
      opacity: 1,
      tabs: [
        { name: 'Tab 1', id: 'tab-0' },
        { name: 'Tab 2', id: 'tab-1' },
        { name: 'Tab 3', id: 'tab-2' },
      ],
    },
    propertySchema: [
      { key: 'backgroundColor', label: 'Background', type: 'color', default: 'transparent' },
      { key: 'borderColor', label: 'Border Color', type: 'color', default: 'rgba(255, 255, 255, 0.1)' },
      { key: 'borderWidth', label: 'Border Width', type: 'number', default: 1, min: 0, max: 10 },
      { key: 'cornerRadius', label: 'Corner Radius', type: 'number', default: 12, min: 0, max: 50 },
      { key: 'padding', label: 'Padding', type: 'number', default: 16, min: 0, max: 50 },
      { key: 'activeTab', label: 'Active Tab Index', type: 'number', default: 0, min: 0 },
      {
        key: 'tabPosition',
        label: 'Tab Position',
        type: 'option',
        default: 'top',
        options: [
          { label: 'Top', value: 'top' },
          { label: 'Bottom', value: 'bottom' },
          { label: 'Left', value: 'left' },
          { label: 'Right', value: 'right' },
        ],
      },
      { key: 'tabBackgroundColor', label: 'Tab Background', type: 'color', default: 'rgba(255, 255, 255, 0.05)' },
      { key: 'activeTabColor', label: 'Active Tab Color', type: 'color', default: 'rgba(0, 255, 136, 0.3)' },
      { key: 'tabTextColor', label: 'Tab Text Color', type: 'color', default: '#ffffff' },
      { key: 'visible', label: 'Visible', type: 'boolean', default: true },
      { key: 'opacity', label: 'Opacity', type: 'number', default: 1, min: 0, max: 1, step: 0.1 },
    ],
  },
];

/**
 * Get primitive definition by ID
 */
export function getPrimitiveById(id: string): PrimitiveDefinition | undefined {
  return PRIMITIVE_REGISTRY.find(p => p.id === id);
}

/**
 * Get all primitives for a specific category
 */
export function getPrimitivesByCategory(category: string): PrimitiveDefinition[] {
  return PRIMITIVE_REGISTRY.filter(p => p.category === category);
}

/**
 * Get all primitive categories
 */
export function getPrimitiveCategories(): string[] {
  const categories = new Set(PRIMITIVE_REGISTRY.map(p => p.category));
  return Array.from(categories);
}
