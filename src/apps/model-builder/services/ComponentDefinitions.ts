import { PropertyType, type ComponentDefinition, type PropertyDefinition, type ModelComponent } from '../types';

// Common property definitions shared between multiple components
const commonProperties: PropertyDefinition[] = [
  {
    name: 'name',
    label: 'Name',
    type: PropertyType.String,
    category: 'basic',
    defaultValue: '',
    rank: 1
  },
  {
    name: 'visible',
    label: 'Visible',
    type: PropertyType.Boolean,
    category: 'basic',
    defaultValue: true,
    rank: 2
  }
];

const commonStyleProperties: PropertyDefinition[] = [
  {
    name: 'backgroundColor',
    label: 'Background Color',
    type: PropertyType.Color,
    category: 'style',
    defaultValue: '#FFFFFF',
    rank: 10
  },
  {
    name: 'borderColor',
    label: 'Border Color',
    type: PropertyType.Color,
    category: 'style',
    defaultValue: '#000000',
    rank: 11
  },
  {
    name: 'borderWidth',
    label: 'Border Width',
    type: PropertyType.Number,
    category: 'style',
    defaultValue: 1,
    min: 0,
    max: 10,
    step: 1,
    rank: 12
  },
  {
    name: 'opacity',
    label: 'Opacity',
    type: PropertyType.Number,
    category: 'style',
    defaultValue: 1,
    min: 0,
    max: 1,
    step: 0.1,
    rank: 13
  }
];

// Component-specific definitions
const componentDefinitions: Record<string, ComponentDefinition> = {
  // Basic components
  Rectangle: {
    type: 'Rectangle',
    name: 'Rectangle',
    description: 'A basic rectangle shape',
    category: 'basic',
    icon: '', // Icon is defined in ComponentLibrary.ts
    properties: [
      ...commonProperties,
      ...commonStyleProperties,
      {
        name: 'cornerRadius',
        label: 'Corner Radius',
        type: PropertyType.Number,
        category: 'style',
        defaultValue: 0,
        min: 0,
        max: 100,
        step: 1,
        rank: 15
      }
    ],
    width: 100,
    height: 80,
    allowResize: true
  },
  
  Circle: {
    type: 'Circle',
    name: 'Circle',
    description: 'A basic circle shape',
    category: 'basic',
    icon: '',
    properties: [
      ...commonProperties,
      ...commonStyleProperties
    ],
    width: 80,
    height: 80,
    allowResize: true
  },
  
  Line: {
    type: 'Line',
    name: 'Line',
    description: 'A line element',
    category: 'basic',
    icon: '',
    properties: [
      ...commonProperties,
      {
        name: 'strokeColor',
        label: 'Stroke Color',
        type: PropertyType.Color,
        category: 'style',
        defaultValue: '#000000',
        rank: 10
      },
      {
        name: 'strokeWidth',
        label: 'Stroke Width',
        type: PropertyType.Number,
        category: 'style',
        defaultValue: 2,
        min: 1,
        max: 20,
        step: 1,
        rank: 11
      },
      {
        name: 'strokeStyle',
        label: 'Stroke Style',
        type: PropertyType.Options,
        category: 'style',
        defaultValue: 'solid',
        options: [
          { label: 'Solid', value: 'solid' },
          { label: 'Dashed', value: 'dashed' },
          { label: 'Dotted', value: 'dotted' }
        ],
        rank: 12
      },
      {
        name: 'startX',
        label: 'Start X',
        type: PropertyType.Number,
        category: 'basic',
        defaultValue: 0,
        rank: 3
      },
      {
        name: 'startY',
        label: 'Start Y',
        type: PropertyType.Number,
        category: 'basic',
        defaultValue: 0,
        rank: 4
      },
      {
        name: 'endX',
        label: 'End X',
        type: PropertyType.Number,
        category: 'basic',
        defaultValue: 100,
        rank: 5
      },
      {
        name: 'endY',
        label: 'End Y',
        type: PropertyType.Number,
        category: 'basic',
        defaultValue: 100,
        rank: 6
      }
    ],
    width: 100,
    height: 100,
    allowResize: true
  },
  
  Text: {
    type: 'Text',
    name: 'Text',
    description: 'A text element',
    category: 'basic',
    icon: '',
    properties: [
      ...commonProperties,
      {
        name: 'text',
        label: 'Text',
        type: PropertyType.String,
        category: 'basic',
        defaultValue: 'Text',
        rank: 3
      },
      {
        name: 'fontSize',
        label: 'Font Size',
        type: PropertyType.Number,
        category: 'style',
        defaultValue: 16,
        min: 8,
        max: 72,
        step: 1,
        rank: 10
      },
      {
        name: 'fontFamily',
        label: 'Font Family',
        type: PropertyType.Options,
        category: 'style',
        defaultValue: 'Arial',
        options: [
          { label: 'Arial', value: 'Arial' },
          { label: 'Helvetica', value: 'Helvetica' },
          { label: 'Times New Roman', value: 'Times New Roman' },
          { label: 'Courier New', value: 'Courier New' },
          { label: 'Georgia', value: 'Georgia' },
          { label: 'Verdana', value: 'Verdana' }
        ],
        rank: 11
      },
      {
        name: 'fontWeight',
        label: 'Font Weight',
        type: PropertyType.Options,
        category: 'style',
        defaultValue: 'normal',
        options: [
          { label: 'Normal', value: 'normal' },
          { label: 'Bold', value: 'bold' },
          { label: 'Light', value: 'light' }
        ],
        rank: 12
      },
      {
        name: 'textColor',
        label: 'Text Color',
        type: PropertyType.Color,
        category: 'style',
        defaultValue: '#000000',
        rank: 13
      },
      {
        name: 'textAlign',
        label: 'Text Align',
        type: PropertyType.Options,
        category: 'style',
        defaultValue: 'left',
        options: [
          { label: 'Left', value: 'left' },
          { label: 'Center', value: 'center' },
          { label: 'Right', value: 'right' }
        ],
        rank: 14
      },
      {
        name: 'value',
        label: 'Dynamic Value',
        type: PropertyType.EntityField,
        category: 'advanced',
        rank: 20
      }
    ],
    width: 120,
    height: 40,
    allowResize: true
  },
  
  Image: {
    type: 'Image',
    name: 'Image',
    description: 'An image element',
    category: 'basic',
    icon: '',
    properties: [
      ...commonProperties,
      {
        name: 'source',
        label: 'Image Source',
        type: PropertyType.String,
        category: 'basic',
        defaultValue: '',
        rank: 3
      },
      {
        name: 'preserveAspectRatio',
        label: 'Preserve Aspect Ratio',
        type: PropertyType.Boolean,
        category: 'basic',
        defaultValue: true,
        rank: 4
      },
      {
        name: 'opacity',
        label: 'Opacity',
        type: PropertyType.Number,
        category: 'style',
        defaultValue: 1,
        min: 0,
        max: 1,
        step: 0.1,
        rank: 10
      },
      {
        name: 'borderWidth',
        label: 'Border Width',
        type: PropertyType.Number,
        category: 'style',
        defaultValue: 0,
        min: 0,
        max: 10,
        step: 1,
        rank: 11
      },
      {
        name: 'borderColor',
        label: 'Border Color',
        type: PropertyType.Color,
        category: 'style',
        defaultValue: '#000000',
        rank: 12
      },
      {
        name: 'cornerRadius',
        label: 'Corner Radius',
        type: PropertyType.Number,
        category: 'style',
        defaultValue: 0,
        min: 0,
        max: 100,
        step: 1,
        rank: 13
      }
    ],
    width: 150,
    height: 100,
    allowResize: true
  },
  
  // Indicator components
  Gauge: {
    type: 'Gauge',
    name: 'Gauge',
    description: 'A radial gauge indicator',
    category: 'indicators',
    icon: '',
    properties: [
      ...commonProperties,
      {
        name: 'minValue',
        label: 'Minimum Value',
        type: PropertyType.Number,
        category: 'basic',
        defaultValue: 0,
        rank: 3
      },
      {
        name: 'maxValue',
        label: 'Maximum Value',
        type: PropertyType.Number,
        category: 'basic',
        defaultValue: 100,
        rank: 4
      },
      {
        name: 'value',
        label: 'Value',
        type: PropertyType.Number,
        category: 'basic',
        defaultValue: 50,
        rank: 5
      },
      {
        name: 'units',
        label: 'Units',
        type: PropertyType.String,
        category: 'basic',
        defaultValue: '',
        rank: 6
      },
      {
        name: 'showValue',
        label: 'Show Value',
        type: PropertyType.Boolean,
        category: 'basic',
        defaultValue: true,
        rank: 7
      },
      {
        name: 'valueBinding',
        label: 'Value Binding',
        type: PropertyType.EntityField,
        category: 'advanced',
        rank: 20
      },
      {
        name: 'valueFormula',
        label: 'Value Formula',
        type: PropertyType.Formula,
        category: 'advanced',
        rank: 21
      },
      {
        name: 'startAngle',
        label: 'Start Angle',
        type: PropertyType.Number,
        category: 'style',
        defaultValue: -135,
        min: -180,
        max: 180,
        step: 1,
        rank: 10
      },
      {
        name: 'endAngle',
        label: 'End Angle',
        type: PropertyType.Number,
        category: 'style',
        defaultValue: 135,
        min: -180,
        max: 180,
        step: 1,
        rank: 11
      },
      {
        name: 'trackColor',
        label: 'Track Color',
        type: PropertyType.Color,
        category: 'style',
        defaultValue: '#EEEEEE',
        rank: 12
      },
      {
        name: 'valueColor',
        label: 'Value Color',
        type: PropertyType.Color,
        category: 'style',
        defaultValue: '#00B0FF',
        rank: 13
      },
      {
        name: 'needleColor',
        label: 'Needle Color',
        type: PropertyType.Color,
        category: 'style',
        defaultValue: '#FF0000',
        rank: 14
      }
    ],
    width: 200,
    height: 200,
    allowResize: true
  },
  
  BarIndicator: {
    type: 'BarIndicator',
    name: 'Bar Indicator',
    description: 'A horizontal or vertical bar indicator',
    category: 'indicators',
    icon: '',
    properties: [
      ...commonProperties,
      ...commonStyleProperties,
      {
        name: 'minValue',
        label: 'Minimum Value',
        type: PropertyType.Number,
        category: 'basic',
        defaultValue: 0,
        rank: 3
      },
      {
        name: 'maxValue',
        label: 'Maximum Value',
        type: PropertyType.Number,
        category: 'basic',
        defaultValue: 100,
        rank: 4
      },
      {
        name: 'value',
        label: 'Value',
        type: PropertyType.Number,
        category: 'basic',
        defaultValue: 50,
        rank: 5
      },
      {
        name: 'orientation',
        label: 'Orientation',
        type: PropertyType.Options,
        category: 'basic',
        defaultValue: 'horizontal',
        options: [
          { label: 'Horizontal', value: 'horizontal' },
          { label: 'Vertical', value: 'vertical' }
        ],
        rank: 6
      },
      {
        name: 'showValue',
        label: 'Show Value',
        type: PropertyType.Boolean,
        category: 'basic',
        defaultValue: true,
        rank: 7
      },
      {
        name: 'valueBinding',
        label: 'Value Binding',
        type: PropertyType.EntityField,
        category: 'advanced',
        rank: 20
      },
      {
        name: 'valueFormula',
        label: 'Value Formula',
        type: PropertyType.Formula,
        category: 'advanced',
        rank: 21
      },
      {
        name: 'barColor',
        label: 'Bar Color',
        type: PropertyType.Color,
        category: 'style',
        defaultValue: '#00B0FF',
        rank: 15
      },
      {
        name: 'trackColor',
        label: 'Track Color',
        type: PropertyType.Color,
        category: 'style',
        defaultValue: '#EEEEEE',
        rank: 16
      }
    ],
    width: 200,
    height: 50,
    allowResize: true
  },
  
  StatusIndicator: {
    type: 'StatusIndicator',
    name: 'Status Indicator',
    description: 'A status indicator with multiple states',
    category: 'indicators',
    icon: '',
    properties: [
      ...commonProperties,
      {
        name: 'value',
        label: 'Status Value',
        type: PropertyType.Number,
        category: 'basic',
        defaultValue: 0,
        rank: 3
      },
      {
        name: 'statusMapping',
        label: 'Status Mapping',
        type: PropertyType.String,
        category: 'advanced',
        defaultValue: '0:#888888;1:#00B0FF;2:#FF9800;3:#F44336',
        rank: 4
      },
      {
        name: 'valueBinding',
        label: 'Value Binding',
        type: PropertyType.EntityField,
        category: 'advanced',
        rank: 20
      },
      {
        name: 'showLabel',
        label: 'Show Label',
        type: PropertyType.Boolean,
        category: 'basic',
        defaultValue: true,
        rank: 5
      },
      {
        name: 'labels',
        label: 'Status Labels',
        type: PropertyType.String,
        category: 'advanced',
        defaultValue: '0:Unknown;1:Normal;2:Warning;3:Alarm',
        rank: 6
      },
      {
        name: 'shape',
        label: 'Indicator Shape',
        type: PropertyType.Options,
        category: 'style',
        defaultValue: 'circle',
        options: [
          { label: 'Circle', value: 'circle' },
          { label: 'Square', value: 'square' },
          { label: 'Triangle', value: 'triangle' }
        ],
        rank: 10
      },
      {
        name: 'size',
        label: 'Indicator Size',
        type: PropertyType.Number,
        category: 'style',
        defaultValue: 24,
        min: 8,
        max: 100,
        step: 1,
        rank: 11
      }
    ],
    width: 120,
    height: 40,
    allowResize: true
  },
  
  // Control components
  Button: {
    type: 'Button',
    name: 'Button',
    description: 'An interactive button',
    category: 'controls',
    icon: '',
    properties: [
      ...commonProperties,
      {
        name: 'text',
        label: 'Button Text',
        type: PropertyType.String,
        category: 'basic',
        defaultValue: 'Button',
        rank: 3
      },
      {
        name: 'action',
        label: 'Action',
        type: PropertyType.String,
        category: 'advanced',
        defaultValue: '',
        rank: 4
      },
      {
        name: 'backgroundColor',
        label: 'Background Color',
        type: PropertyType.Color,
        category: 'style',
        defaultValue: '#00B0FF',
        rank: 10
      },
      {
        name: 'textColor',
        label: 'Text Color',
        type: PropertyType.Color,
        category: 'style',
        defaultValue: '#FFFFFF',
        rank: 11
      },
      {
        name: 'borderRadius',
        label: 'Border Radius',
        type: PropertyType.Number,
        category: 'style',
        defaultValue: 4,
        min: 0,
        max: 50,
        step: 1,
        rank: 12
      },
      {
        name: 'fontSize',
        label: 'Font Size',
        type: PropertyType.Number,
        category: 'style',
        defaultValue: 14,
        min: 8,
        max: 72,
        step: 1,
        rank: 13
      },
      {
        name: 'padding',
        label: 'Padding',
        type: PropertyType.Number,
        category: 'style',
        defaultValue: 8,
        min: 0,
        max: 50,
        step: 1,
        rank: 14
      }
    ],
    width: 100,
    height: 40,
    allowResize: true
  },
  
  Switch: {
    type: 'Switch',
    name: 'Switch',
    description: 'A toggle switch',
    category: 'controls',
    icon: '',
    properties: [
      ...commonProperties,
      {
        name: 'value',
        label: 'Value',
        type: PropertyType.Boolean,
        category: 'basic',
        defaultValue: false,
        rank: 3
      },
      {
        name: 'label',
        label: 'Label',
        type: PropertyType.String,
        category: 'basic',
        defaultValue: 'Switch',
        rank: 4
      },
      {
        name: 'valueBinding',
        label: 'Value Binding',
        type: PropertyType.EntityField,
        category: 'advanced',
        rank: 20
      },
      {
        name: 'activeColor',
        label: 'Active Color',
        type: PropertyType.Color,
        category: 'style',
        defaultValue: '#00B0FF',
        rank: 10
      },
      {
        name: 'trackColor',
        label: 'Track Color',
        type: PropertyType.Color,
        category: 'style',
        defaultValue: '#CCCCCC',
        rank: 11
      },
      {
        name: 'thumbColor',
        label: 'Thumb Color',
        type: PropertyType.Color,
        category: 'style',
        defaultValue: '#FFFFFF',
        rank: 12
      }
    ],
    width: 60,
    height: 30,
    allowResize: false
  }
};

export function initializeComponentProperties(component: ModelComponent): void {
  const definition = componentDefinitions[component.type];
  if (!definition) return;

  // Initialize properties object if it doesn't exist
  if (!component.properties) {
    component.properties = {};
  }

  // Set default values for all properties defined in the component definition
  definition.properties.forEach(prop => {
    if (component.properties[prop.name] === undefined) {
      component.properties[prop.name] = prop.defaultValue;
    }
  });
}

export { componentDefinitions };
