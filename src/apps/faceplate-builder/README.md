# Faceplate Builder

The Faceplate Builder is a visual editor for creating and customizing SCADA faceplates that can be bound to entity data in real-time.

## Features

- **Visual Canvas**: Drag and drop components onto a grid-based canvas
- **Component Library**: Pre-built components including gauges, status indicators, trends, text blocks, and form fields
- **Custom Components**: Create reusable components from primitives using the Component Composer
- **Data Bindings**: Bind component properties to entity fields with support for indirection (e.g., `Parent->Name`)
- **JavaScript Expressions**: Use JavaScript expressions for complex transformations and conditional logic
- **Real-time Updates**: Faceplates automatically update when bound entity fields change
- **Save/Load**: Persist faceplates to the data store and load them later
- **Animation Rules**: Define conditional animations based on data values

## Quick Start

### 1. Launch the Builder

Open the Faceplate Builder from the Start Menu or Database Browser context menu.

### 2. Create a New Faceplate

1. Click **New** in the toolbar
2. Enter a name for your faceplate (e.g., "Machine Overview")
3. Specify the target entity type (e.g., "Machine")
4. Click **Create**

### 3. Add Components

- **From Palette**: Click a component in the left sidebar to add it to the canvas
- **Custom Components**: Use the Component Composer to create custom components from primitives

### 4. Configure Components

- **Select**: Click a component to select it
- **Rename**: Edit the name in the Inspector panel
- **Resize**: Drag the resize handles or enter dimensions
- **Properties**: Modify component properties in the Inspector

### 5. Add Bindings

1. Select a component
2. Click **Add Binding** in the Bindings panel
3. Enter an expression:
   - Direct field: `Temperature`
   - Indirect field: `Parent->Status`
   - JavaScript: `Temperature > 80 ? 'red' : 'green'`
4. Select the property to bind (e.g., `value`, `color`, `visible`)

### 6. Save Your Work

Click **Save** in the toolbar to persist the faceplate to the data store.

## Component Types

### Primitives

#### Arc Gauge
Circular gauge with dial indicator and numeric readout.
- **Bindings**: `value` (number)
- **Properties**: `label`, `min`, `max`, `unit`, `precision`

#### Status Pill
Boolean indicator with customizable labels.
- **Bindings**: `status` (boolean)
- **Properties**: `label`, `trueLabel`, `falseLabel`

#### Trend Sparkline
Compact trend visualization.
- **Bindings**: `data` (array)
- **Properties**: `label`, `window`, `showThreshold`

#### Text Block
Static or data-bound text.
- **Bindings**: `text` (string)
- **Properties**: `text`, `align`

#### Form Field
Input field for operator interaction.
- **Bindings**: `value` (any)
- **Properties**: `label`, `placeholder`, `required`

## Binding Expressions

### Direct Field Access

Reference a field directly on the bound entity:

```
Name
Status
Temperature
```

### Indirect Field Access

Navigate relationships using `->`:

```
Parent->Name
Parent->Parent->Status
Parent->Description
```

This allows you to display data from related entities.

### JavaScript Expressions

Use JavaScript for complex logic:

```javascript
// Conditional color
Temperature > 80 ? 'red' : 'green'

// Complex condition
Status === 'Online' && Temperature < 100

// Transformation
value * 1.8 + 32  // Celsius to Fahrenheit

// String concatenation
Name + ' - ' + Parent->Name
```

### Transforms

Apply transformations to bound values:

```javascript
// In the transform field
value * 100  // Convert 0.75 to 75
value.toFixed(2)  // Format to 2 decimals
value ? 'Yes' : 'No'  // Boolean to string
```

## Animation Rules

Define conditional animations in the Component Composer:

```json
[
  {
    "expression": "Status",
    "activeValue": "Online",
    "animation": "pulse-green"
  },
  {
    "expression": "Temperature",
    "condition": "> 80",
    "animation": "flash-red"
  }
]
```

Available animations:
- `pulse-green`, `pulse-red`, `pulse-yellow`
- `flash-red`, `flash-yellow`
- `fade-in`, `fade-out`
- `shake`

## Keyboard Shortcuts

- **Ctrl+Z / Cmd+Z**: Undo
- **Ctrl+Y / Cmd+Y**: Redo
- **Ctrl+S / Cmd+S**: Save
- **Delete**: Remove selected component
- **Arrow Keys**: Move selected component

## Database Integration

### Associating Faceplates with Entities

Faceplates can be associated with specific entity instances through the `Faceplates` field:

1. Open Database Browser
2. Right-click an entity
3. Select "Faceplate Builder" → "Launch Builder..."
4. Create or load a faceplate
5. The faceplate will be automatically associated

### Opening Faceplates

1. Right-click an entity in Database Browser
2. Select "Open Faceplate" → Choose a faceplate
3. The faceplate opens bound to that entity instance

## Data Persistence

Faceplates are stored as entities in the data store with the following structure:

```
Faceplate (Entity)
├─ Name: "Machine Overview"
├─ TargetEntityType: "Machine"
├─ Configuration: JSON string with layout
├─ Components: List of FaceplateComponent entities
└─ Children:
   ├─ FaceplateComponent (Entity)
   │  ├─ Name: "CPU Gauge"
   │  ├─ ComponentType: "primitive.gauge.arc"
   │  ├─ Configuration: JSON string
   │  ├─ Bindings: JSON string
   │  └─ AnimationRules: JSON string
   └─ ...
```

## Real-time Updates

The Faceplate Runtime uses the data store's notification mechanism:

1. Parse bindings to determine required fields
2. Register notifications for each unique field path
3. When notifications arrive, evaluate expressions
4. Update component properties
5. Trigger animations based on rules

## Advanced Usage

### Custom Components

Create reusable components:

1. Open Component Composer panel
2. Select a primitive type
3. Configure default properties
4. Set default size
5. Click "Create Component"
6. The component appears in the palette

### Nested Indirection

Access data through multiple levels:

```
Parent->Parent->Parent->Name
Owner->Parent->Description
Machine->Service->Status
```

### Context-Aware Expressions

Access multiple fields in JavaScript:

```javascript
// Multiple conditions
Status === 'Online' && Temperature < 100 && Pressure > 20

// Math operations
(HighLimit + LowLimit) / 2

// String operations
Name.toUpperCase() + ' [' + Status + ']'
```

## Troubleshooting

### "Faceplate entity type not found"

The backend schema must include the Faceplate entity type. See `docs/FACEPLATE_SCHEMA.md` for required schema additions.

### Bindings not updating

1. Check that the expression is valid
2. Verify the field exists on the target entity type
3. Check the browser console for errors
4. Ensure notifications are registered (look for WebSocket messages)

### Components not appearing

1. Verify the component has a valid primitive type
2. Check that the configuration is valid JSON
3. Look for errors in the browser console

## Best Practices

1. **Name Consistently**: Use descriptive names for components and bindings
2. **Group Related Components**: Use folders in the entity hierarchy
3. **Test Incrementally**: Save and test after adding each component
4. **Document Expressions**: Add comments in complex JavaScript expressions
5. **Reuse Components**: Create custom components for repeated patterns
6. **Version Control**: Save different versions as separate faceplate entities

## Examples

### Machine Status Dashboard

```
Components:
- CPU Gauge (value bound to CpuUsage)
- Memory Gauge (value bound to MemoryUsage)
- Status Pill (status bound to Status)
- Machine Name (text bound to Name)
- Parent Line (text bound to Parent->Name)
```

### Service Monitor

```
Components:
- Status Pill (status bound to Status)
- Heartbeat Indicator (bound to LastHeartbeat)
- Trend Chart (bound to RequestRate)
- Error Count (bound to ErrorCount with red color when > 0)
```

## API Reference

See the `FaceplateDataService` class in `utils/faceplate-data.ts` for programmatic access:

```typescript
// Create a new faceplate
const id = await service.createFaceplate(parentId, 'My Faceplate', 'Machine');

// Load a faceplate
const faceplate = await service.readFaceplate(id);

// Save changes
await service.writeFaceplate(faceplate);

// Associate with entity
await service.associateFaceplateWithEntity(entityId, faceplateId);
```

## Contributing

To add new primitive components:

1. Define the primitive in `FaceplateBuilderApp.vue` → `primitiveCatalog`
2. Create a renderer in `components/primitives/`
3. Register in `FaceplateComponentRenderer.vue`
4. Add icon and documentation

## License

Part of the QUI project. See main repository LICENSE file.
