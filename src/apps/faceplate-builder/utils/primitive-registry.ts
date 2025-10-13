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
  default?: unknown;
  min?: number;
  max?: number;
  step?: number;
  options?: Array<{ label: string; value: string | number }>;
  category?: 'Layout' | 'Appearance' | 'Typography' | 'Animation' | 'Behavior' | 'Advanced';
  description?: string;
}

/**
 * Common behavior properties for all components
 */
export const COMMON_BEHAVIOR_PROPERTIES: PropertySchema[] = [
  {
    key: 'visible',
    label: 'Visible',
    type: 'boolean',
    default: true,
    category: 'Behavior',
  },
];

/**
 * Common animation properties that can be added to any component
 */
export const COMMON_ANIMATION_PROPERTIES: PropertySchema[] = [
  {
    key: 'animationType',
    label: 'Animation Type',
    type: 'option',
    default: 'none',
    category: 'Animation',
    options: [
      { label: 'None', value: 'none' },
      { label: 'Pulse', value: 'pulse' },
      { label: 'Fade', value: 'fade' },
      { label: 'Shake', value: 'shake' },
      { label: 'Rotate', value: 'rotate' },
      { label: 'Slide', value: 'slide' },
      { label: 'Bounce', value: 'bounce' },
      { label: 'Glow', value: 'glow' },
      { label: 'Flash', value: 'flash' },
    ],
  },
  {
    key: 'animationDuration',
    label: 'Animation Duration (ms)',
    type: 'number',
    default: 1000,
    min: 100,
    max: 10000,
    step: 100,
    category: 'Animation',
  },
  {
    key: 'animationIterations',
    label: 'Animation Iterations',
    type: 'option',
    default: 'infinite',
    category: 'Animation',
    options: [
      { label: 'Infinite', value: 'infinite' },
      { label: '1', value: 1 },
      { label: '2', value: 2 },
      { label: '3', value: 3 },
      { label: '5', value: 5 },
      { label: '10', value: 10 },
    ],
  },
  {
    key: 'animationEasing',
    label: 'Animation Easing',
    type: 'option',
    default: 'ease-in-out',
    category: 'Animation',
    options: [
      { label: 'Linear', value: 'linear' },
      { label: 'Ease', value: 'ease' },
      { label: 'Ease In', value: 'ease-in' },
      { label: 'Ease Out', value: 'ease-out' },
      { label: 'Ease In Out', value: 'ease-in-out' },
    ],
  },
  {
    key: 'transitionDuration',
    label: 'Transition Duration (ms)',
    type: 'number',
    default: 0,
    min: 0,
    max: 2000,
    step: 50,
    category: 'Animation',
  },
  {
    key: 'transitionEasing',
    label: 'Transition Easing',
    type: 'option',
    default: 'ease',
    category: 'Animation',
    options: [
      { label: 'None', value: 'none' },
      { label: 'Linear', value: 'linear' },
      { label: 'Ease', value: 'ease' },
      { label: 'Ease In', value: 'ease-in' },
      { label: 'Ease Out', value: 'ease-out' },
      { label: 'Ease In Out', value: 'ease-in-out' },
    ],
  },
];

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
      { key: 'text', label: 'Text', type: 'string', default: 'Sample Text', category: 'Appearance' },
      { key: 'textColor', label: 'Text Color', type: 'color', default: '#ffffff', category: 'Appearance' },
      { key: 'fontSize', label: 'Font Size', type: 'number', default: 20, min: 8, max: 72, category: 'Typography' },
      { key: 'fontWeight', label: 'Font Weight', type: 'number', default: 500, min: 100, max: 900, step: 100, category: 'Typography' },
      {
        key: 'fontStyle',
        label: 'Font Style',
        type: 'option',
        default: 'normal',
        category: 'Typography',
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
        category: 'Layout',
        options: [
          { label: 'Left', value: 'left' },
          { label: 'Center', value: 'center' },
          { label: 'Right', value: 'right' },
        ],
      },
      { key: 'lineHeight', label: 'Line Height', type: 'number', default: 1.2, min: 0.5, max: 3, step: 0.1, category: 'Typography' },
      { key: 'letterSpacing', label: 'Letter Spacing', type: 'number', default: 0, min: -2, max: 10, step: 0.5, category: 'Typography' },
      { key: 'textShadow', label: 'Text Shadow', type: 'string', default: '', category: 'Appearance' },
      {
        key: 'textDecoration',
        label: 'Text Decoration',
        type: 'option',
        default: 'none',
        category: 'Typography',
        options: [
          { label: 'None', value: 'none' },
          { label: 'Underline', value: 'underline' },
          { label: 'Line Through', value: 'line-through' },
          { label: 'Overline', value: 'overline' },
        ],
      },
      {
        key: 'textTransform',
        label: 'Text Transform',
        type: 'option',
        default: 'none',
        category: 'Typography',
        options: [
          { label: 'None', value: 'none' },
          { label: 'Uppercase', value: 'uppercase' },
          { label: 'Lowercase', value: 'lowercase' },
          { label: 'Capitalize', value: 'capitalize' },
        ],
      },
      {
        key: 'wordWrap',
        label: 'Word Wrap',
        type: 'option',
        default: 'normal',
        category: 'Typography',
        options: [
          { label: 'Normal', value: 'normal' },
          { label: 'Break Word', value: 'break-word' },
          { label: 'No Wrap', value: 'nowrap' },
        ],
      },
      { key: 'opacity', label: 'Opacity', type: 'number', default: 1, min: 0, max: 1, step: 0.1, category: 'Appearance' },
      ...COMMON_BEHAVIOR_PROPERTIES,
      ...COMMON_ANIMATION_PROPERTIES,
    ],
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
      { key: 'minLength', label: 'Min Length', type: 'number', default: 0, min: 0 },
      { key: 'maxLength', label: 'Max Length', type: 'number', default: 100, min: 0 },
      { key: 'pattern', label: 'Validation Pattern (regex)', type: 'string', default: '' },
      { key: 'required', label: 'Required', type: 'boolean', default: false },
      ...COMMON_BEHAVIOR_PROPERTIES,
      ...COMMON_ANIMATION_PROPERTIES,
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
      { key: 'required', label: 'Required', type: 'boolean', default: false },
      ...COMMON_BEHAVIOR_PROPERTIES,
      ...COMMON_ANIMATION_PROPERTIES,
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
      { key: 'hoverBackgroundColor', label: 'Hover Background', type: 'color', default: 'rgba(0, 190, 255, 0.9)' },
      { key: 'activeBackgroundColor', label: 'Active Background', type: 'color', default: 'rgba(0, 140, 200, 1)' },
      { key: 'borderRadius', label: 'Border Radius', type: 'number', default: 8, min: 0, max: 50 },
      { key: 'borderWidth', label: 'Border Width', type: 'number', default: 0, min: 0, max: 10 },
      { key: 'borderColor', label: 'Border Color', type: 'color', default: 'rgba(255, 255, 255, 0.2)' },
      { key: 'icon', label: 'Icon (emoji or text)', type: 'string', default: '' },
      { key: 'boxShadow', label: 'Box Shadow', type: 'string', default: '0 2px 8px rgba(0, 0, 0, 0.2)' },
      { key: 'opacity', label: 'Opacity', type: 'number', default: 1, min: 0, max: 1, step: 0.1 },
      ...COMMON_BEHAVIOR_PROPERTIES,
      ...COMMON_ANIMATION_PROPERTIES,
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
      {
        key: 'size',
        label: 'Size',
        type: 'option',
        default: 'medium',
        options: [
          { label: 'Small', value: 'small' },
          { label: 'Medium', value: 'medium' },
          { label: 'Large', value: 'large' },
        ],
      },
      ...COMMON_BEHAVIOR_PROPERTIES,
      ...COMMON_ANIMATION_PROPERTIES,
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
      {
        key: 'borderStyle',
        label: 'Border Style',
        type: 'option',
        default: 'solid',
        options: [
          { label: 'Solid', value: 'solid' },
          { label: 'Dashed', value: 'dashed' },
          { label: 'Dotted', value: 'dotted' },
        ],
      },
      { key: 'cornerRadius', label: 'Corner Radius', type: 'number', default: 8, min: 0, max: 50 },
      { key: 'boxShadow', label: 'Box Shadow', type: 'string', default: '' },
      { key: 'opacity', label: 'Opacity', type: 'number', default: 1, min: 0, max: 1, step: 0.1 },
      { key: 'rotation', label: 'Rotation (degrees)', type: 'number', default: 0, min: -180, max: 180 },
      ...COMMON_BEHAVIOR_PROPERTIES,
      ...COMMON_ANIMATION_PROPERTIES,
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
      {
        key: 'borderStyle',
        label: 'Border Style',
        type: 'option',
        default: 'solid',
        options: [
          { label: 'Solid', value: 'solid' },
          { label: 'Dashed', value: 'dashed' },
          { label: 'Dotted', value: 'dotted' },
        ],
      },
      { key: 'boxShadow', label: 'Box Shadow', type: 'string', default: '' },
      { key: 'opacity', label: 'Opacity', type: 'number', default: 1, min: 0, max: 1, step: 0.1 },
      ...COMMON_BEHAVIOR_PROPERTIES,
      ...COMMON_ANIMATION_PROPERTIES,
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

  // Line Shape
  {
    id: 'primitive.shape.line',
    label: 'Line',
    description: 'Straight line with configurable stroke.',
    icon: '➖',
    category: 'Shapes',
    defaultSize: { x: 200, y: 2 },
    defaultProps: {
      strokeColor: 'rgba(255, 255, 255, 0.8)',
      strokeWidth: 2,
      lineStyle: 'solid',
      lineCap: 'butt',
    },
    propertySchema: [
      { key: 'strokeColor', label: 'Stroke Color', type: 'color', default: 'rgba(255, 255, 255, 0.8)' },
      { key: 'strokeWidth', label: 'Stroke Width', type: 'number', default: 2, min: 1, max: 20 },
      {
        key: 'lineStyle',
        label: 'Line Style',
        type: 'option',
        default: 'solid',
        options: [
          { label: 'Solid', value: 'solid' },
          { label: 'Dashed', value: 'dashed' },
          { label: 'Dotted', value: 'dotted' },
        ],
      },
      {
        key: 'lineCap',
        label: 'Line Cap',
        type: 'option',
        default: 'butt',
        options: [
          { label: 'Butt', value: 'butt' },
          { label: 'Round', value: 'round' },
          { label: 'Square', value: 'square' },
        ],
      },
      ...COMMON_BEHAVIOR_PROPERTIES,
      ...COMMON_ANIMATION_PROPERTIES,
    ],
  },

  // Polygon Shape
  {
    id: 'primitive.shape.polygon',
    label: 'Polygon',
    description: 'Regular polygon with configurable number of sides.',
    icon: '⬡',
    category: 'Shapes',
    defaultSize: { x: 120, y: 120 },
    defaultProps: {
      sides: 6,
      fillColor: 'rgba(255, 100, 200, 0.5)',
      borderColor: 'rgba(255, 255, 255, 0.2)',
      borderWidth: 1,
      rotation: 0,
    },
    propertySchema: [
      { key: 'sides', label: 'Number of Sides', type: 'number', default: 6, min: 3, max: 20 },
      { key: 'fillColor', label: 'Fill Color', type: 'color', default: 'rgba(255, 100, 200, 0.5)' },
      { key: 'borderColor', label: 'Border Color', type: 'color', default: 'rgba(255, 255, 255, 0.2)' },
      { key: 'borderWidth', label: 'Border Width', type: 'number', default: 1, min: 0, max: 10 },
      { key: 'rotation', label: 'Rotation', type: 'number', default: 0, min: 0, max: 360 },
      ...COMMON_BEHAVIOR_PROPERTIES,
      ...COMMON_ANIMATION_PROPERTIES,
    ],
  },

  // Arc Shape
  {
    id: 'primitive.shape.arc',
    label: 'Arc',
    description: 'Circular arc with configurable start and end angles.',
    icon: '◜',
    category: 'Shapes',
    defaultSize: { x: 120, y: 120 },
    defaultProps: {
      startAngle: 0,
      endAngle: 180,
      strokeColor: 'rgba(100, 200, 255, 0.8)',
      strokeWidth: 3,
      fillColor: 'transparent',
    },
    propertySchema: [
      { key: 'startAngle', label: 'Start Angle', type: 'number', default: 0, min: 0, max: 360 },
      { key: 'endAngle', label: 'End Angle', type: 'number', default: 180, min: 0, max: 360 },
      { key: 'strokeColor', label: 'Stroke Color', type: 'color', default: 'rgba(100, 200, 255, 0.8)' },
      { key: 'strokeWidth', label: 'Stroke Width', type: 'number', default: 3, min: 1, max: 20 },
      { key: 'fillColor', label: 'Fill Color', type: 'color', default: 'transparent' },
      ...COMMON_BEHAVIOR_PROPERTIES,
      ...COMMON_ANIMATION_PROPERTIES,
    ],
  },

  // Image
  {
    id: 'primitive.media.image',
    label: 'Image',
    description: 'Display image from URL with fit/fill options.',
    icon: '🖼️',
    category: 'Data',
    defaultSize: { x: 200, y: 200 },
    defaultProps: {
      url: '',
      alt: 'Image',
      objectFit: 'contain',
      opacity: 1,
    },
    propertySchema: [
      { key: 'url', label: 'Image URL', type: 'string', default: '' },
      { key: 'alt', label: 'Alt Text', type: 'string', default: 'Image' },
      {
        key: 'objectFit',
        label: 'Object Fit',
        type: 'option',
        default: 'contain',
        options: [
          { label: 'Contain', value: 'contain' },
          { label: 'Cover', value: 'cover' },
          { label: 'Fill', value: 'fill' },
          { label: 'None', value: 'none' },
          { label: 'Scale Down', value: 'scale-down' },
        ],
      },
      { key: 'opacity', label: 'Opacity', type: 'number', default: 1, min: 0, max: 1, step: 0.1 },
      ...COMMON_BEHAVIOR_PROPERTIES,
      ...COMMON_ANIMATION_PROPERTIES,
    ],
  },

  // Group (Logical grouping)
  {
    id: 'primitive.group',
    label: 'Group',
    description: 'Logical grouping for combined transforms and visibility control.',
    icon: '📁',
    category: 'Layout',
    defaultSize: { x: 300, y: 240 },
    defaultProps: {
      visible: true,
      opacity: 1,
      rotation: 0,
    },
    propertySchema: [
      { key: 'visible', label: 'Visible', type: 'boolean', default: true },
      { key: 'opacity', label: 'Opacity', type: 'number', default: 1, min: 0, max: 1, step: 0.1 },
      { key: 'rotation', label: 'Rotation', type: 'number', default: 0, min: 0, max: 360 },
      ...COMMON_ANIMATION_PROPERTIES,
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
