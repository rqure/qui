# Faceplate Builder Implementation Guide

This document provides a comprehensive guide to the Faceplate Builder implementation in QUI.

## Overview

The Faceplate Builder is a complete visual editor for creating SCADA faceplates that bind to entity data in real-time. The system is split into two parts:

1. **Frontend (QUI)** - This repository - Complete ✅
2. **Backend (qcore/qweb)** - Schema additions required - See below

## Frontend Implementation Status

### ✅ Complete

#### Core Data Service
- `FaceplateDataService` with full CRUD operations
- Support for reading/writing faceplate configurations
- Support for creating/deleting faceplates and components
- Methods to associate faceplates with entities
- Field type and entity type caching

#### User Interface
- Visual canvas with drag-and-drop
- Component palette with built-in components
- Component composer for custom components
- Inspector panel for property editing
- Bindings panel for data binding management
- Preview panel for live preview
- Toolbar with save/load/new/undo/redo

#### Dialogs
- Faceplate picker for browsing existing faceplates
- Create faceplate dialog with validation
- Search and filter functionality

#### Data Persistence
- Save faceplates to data store
- Load faceplates from data store
- Auto-save of component configurations
- Support for loading on app launch

#### Runtime
- `FaceplateRuntime` component for executing faceplates
- Real-time data binding with notification system
- Support for direct field access (e.g., `Temperature`)
- Support for indirect field access (e.g., `Parent->Name`)
- JavaScript expression evaluation
- Transform functions
- Animation rules

### 📝 Documentation

- **FACEPLATE_SCHEMA.md** - Complete schema definition for backend
- **base-topology-example.json** - Example configuration
- **README.md** - User guide for Faceplate Builder
- **FACEPLATE_IMPLEMENTATION.md** - This document

## Backend Implementation Required

The backend (qcore/qweb) must add the following entity types to `base-topology.json`:

### 1. Add to Object Entity Type

Add the `Faceplates` field to the base `Object` entity type:

```json
{
  "name": "Faceplates",
  "dataType": "EntityList",
  "default": [],
  "storageScope": "Configuration"
}
```

### 2. Add Faceplate Entity Type

```json
{
  "entityType": "Faceplate",
  "inheritsFrom": ["Object"],
  "fields": [
    {
      "name": "TargetEntityType",
      "dataType": "String",
      "default": "",
      "storageScope": "Configuration"
    },
    {
      "name": "Configuration",
      "dataType": "String",
      "default": "{}",
      "storageScope": "Configuration"
    },
    {
      "name": "Components",
      "dataType": "EntityList",
      "default": [],
      "storageScope": "Configuration"
    },
    {
      "name": "NotificationChannels",
      "dataType": "String",
      "default": "[]",
      "storageScope": "Configuration"
    }
  ]
}
```

### 3. Add FaceplateComponent Entity Type

```json
{
  "entityType": "FaceplateComponent",
  "inheritsFrom": ["Object"],
  "fields": [
    {
      "name": "ComponentType",
      "dataType": "String",
      "default": "",
      "storageScope": "Configuration"
    },
    {
      "name": "Configuration",
      "dataType": "String",
      "default": "{}",
      "storageScope": "Configuration"
    },
    {
      "name": "Bindings",
      "dataType": "String",
      "default": "[]",
      "storageScope": "Configuration"
    },
    {
      "name": "AnimationRules",
      "dataType": "String",
      "default": "[]",
      "storageScope": "Configuration"
    }
  ]
}
```

### 4. Add FaceplateBindingLibrary Entity Type

```json
{
  "entityType": "FaceplateBindingLibrary",
  "inheritsFrom": ["Object"],
  "fields": [
    {
      "name": "Expression",
      "dataType": "String",
      "default": "",
      "storageScope": "Configuration"
    },
    {
      "name": "TargetComponent",
      "dataType": "EntityReference",
      "default": null,
      "storageScope": "Configuration"
    },
    {
      "name": "TargetProperty",
      "dataType": "String",
      "default": "",
      "storageScope": "Configuration"
    },
    {
      "name": "ValueTransform",
      "dataType": "String",
      "default": "",
      "storageScope": "Configuration"
    },
    {
      "name": "SubscriptionConfig",
      "dataType": "String",
      "default": "[]",
      "storageScope": "Configuration"
    }
  ]
}
```

See `docs/base-topology-example.json` for a complete example.

## Testing Guide

### Manual Testing Steps

Once the backend schema is implemented:

#### 1. Test Faceplate Creation

1. Launch QUI and log in
2. Open Faceplate Builder from Start Menu
3. Click "New" button
4. Enter name: "Test Faceplate"
5. Enter target type: "Machine"
6. Verify faceplate entity is created in data store

#### 2. Test Component Addition

1. Click "Arc Gauge" in component palette
2. Component should appear on canvas
3. Select component and verify inspector shows properties
4. Modify properties and verify they update

#### 3. Test Bindings

1. With component selected, click "Add Binding" in bindings panel
2. Enter expression: "Name"
3. Select property: "label"
4. Save faceplate
5. Verify binding is persisted

#### 4. Test Save/Load

1. Create a faceplate with several components
2. Click "Save"
3. Click "Load"
4. Select the faceplate from picker
5. Verify all components and bindings are restored

#### 5. Test Database Browser Integration

1. Open Database Browser
2. Right-click a Machine entity
3. Verify "Faceplate Builder" menu appears
4. Select "Launch Builder..."
5. Verify builder opens with entity context

#### 6. Test Runtime

1. Create a faceplate and associate with a Machine entity
2. Right-click the Machine in Database Browser
3. Select "Open Faceplate" → your faceplate
4. Verify faceplate opens with live data
5. Modify entity fields and verify faceplate updates

### Automated Testing

Unit tests should cover:

- `FaceplateDataService` CRUD operations
- Binding expression parsing
- JavaScript expression evaluation
- Indirection resolution
- Transform application
- Notification registration

Example test structure:

```typescript
describe('FaceplateDataService', () => {
  it('should create a faceplate', async () => {
    const service = new FaceplateDataService(mockDataStore);
    const id = await service.createFaceplate(1, 'Test', 'Machine');
    expect(id).toBeTruthy();
  });

  it('should read a faceplate', async () => {
    const service = new FaceplateDataService(mockDataStore);
    const faceplate = await service.readFaceplate(123);
    expect(faceplate.name).toBe('Test Faceplate');
  });

  // ... more tests
});
```

## Architecture

### Data Flow

```
User Action (Add Component)
    ↓
FaceplateBuilderApp.vue
    ↓
Update Local State (nodes, bindings)
    ↓
Push to History Stack
    ↓
User Clicks Save
    ↓
FaceplateDataService
    ↓
Create/Update Entity via DataStore
    ↓
WebSocket Request to Backend
    ↓
Backend Persists to Store
```

### Runtime Data Flow

```
FaceplateRuntime Component
    ↓
Load Faceplate Entity
    ↓
Load Component Entities
    ↓
Parse Bindings
    ↓
Register Notifications
    ↓
Receive Notification via WebSocket
    ↓
Evaluate Expression
    ↓
Apply Transform
    ↓
Update Component Property
    ↓
Trigger Animations
```

### Component Structure

```
FaceplateBuilderApp.vue (Main Editor)
├─ BuilderToolbar.vue (Top toolbar)
├─ ComponentPalette.vue (Left sidebar - component list)
├─ ComponentComposerPanel.vue (Left sidebar - create custom)
├─ BuilderCanvas.vue (Center - visual canvas)
├─ BindingsPanel.vue (Bottom - data bindings)
├─ FaceplatePreview.vue (Bottom - live preview)
├─ InspectorPanel.vue (Right sidebar - properties)
├─ FaceplatePickerDialog.vue (Modal - browse faceplates)
└─ CreateFaceplateDialog.vue (Modal - create new)

FaceplateRuntime.vue (Runtime Component)
└─ FaceplateComponentRenderer.vue (Per-component renderer)
    ├─ ComponentArcGauge.vue
    ├─ ComponentStatusPill.vue
    ├─ ComponentTrendSparkline.vue
    ├─ ComponentTextBlock.vue
    └─ ComponentFormField.vue
```

## Integration Points

### Database Browser

The Database Browser already has the necessary infrastructure:

```vue
<!-- EntityColumn.vue -->
async function handleContextMenu(event: MouseEvent, entity: EntityItem) {
  // ... existing code
  
  const faceplateRefs = entity.faceplates || [];
  
  const faceplateItems: MenuItem[] = faceplateRefs.map((faceplate) => ({
    id: `faceplate-open-${faceplate.id}`,
    label: faceplate.name,
    action: () => openFaceplateWindow(entity, faceplate)
  }));
  
  // ... add to context menu
}
```

This reads the `Faceplates` field from entities and shows them in the context menu.

### Window System

Faceplates open in windows using the existing window management:

```typescript
windowStore.createWindow({
  title: `${faceplate.name} · ${entity.name}`,
  component: markRaw(FaceplateViewerWindow),
  icon: faceplateBuilderApp.manifest.icon,
  width: 960,
  height: 720,
  props: {
    faceplateId: faceplate.id,
    entityId: entity.id
  }
});
```

## Security Considerations

1. **JavaScript Expression Sandbox**
   - Expressions execute in browser JavaScript engine
   - No access to server-side resources
   - Limited to entity data accessible to the user

2. **Permission Model**
   - Respects existing QUI permission system
   - Users need write permission to create/modify faceplates
   - Users need read permission to view entity data

3. **Data Validation**
   - All JSON fields are validated before parsing
   - Invalid expressions gracefully fail with console warnings
   - Transform errors don't crash the runtime

## Performance Considerations

1. **Notification Deduplication**
   - Multiple components binding to the same field only register one notification
   - Notification callbacks are batched when possible

2. **Expression Caching**
   - Evaluated expressions are cached until dependencies change
   - Field type lookups are cached per session

3. **Component Rendering**
   - Only components with changed bindings re-render
   - Animation classes applied efficiently via CSS

## Future Enhancements

### Potential Additions

1. **Component Templates**
   - Save component groups as templates
   - Import/export template libraries

2. **Versioning**
   - Track faceplate versions
   - Rollback to previous versions

3. **Collaboration**
   - Real-time collaborative editing
   - Change notifications

4. **Advanced Animations**
   - More animation types
   - Custom animation definitions
   - Transition effects

5. **Theming**
   - Dark/light mode support
   - Custom color schemes
   - Corporate branding

6. **Mobile Support**
   - Responsive faceplates
   - Touch-optimized components
   - Mobile-specific layouts

## Troubleshooting

### Common Issues

#### "Faceplate entity type not found"

**Cause**: Backend schema not updated with Faceplate entity type

**Solution**: Add entity types to backend `base-topology.json` as shown above

#### Components not saving

**Cause**: Missing fields in entity schema or permission issues

**Solution**: 
1. Verify all fields exist in schema
2. Check user has write permission
3. Check browser console for errors

#### Bindings not updating

**Cause**: Notification not registered or expression invalid

**Solution**:
1. Check expression syntax
2. Verify field exists on entity type
3. Check WebSocket connection in browser DevTools
4. Look for notification registration in console

#### Faceplate picker shows no results

**Cause**: No Faceplate entities exist or permission issue

**Solution**:
1. Create a faceplate first
2. Verify user has read permission
3. Check entity type is correctly configured

## Support

For issues or questions:

1. Check the documentation in `docs/` directory
2. Review the README in `src/apps/faceplate-builder/`
3. Check browser console for errors
4. Open an issue on the GitHub repository

## Summary

The Faceplate Builder frontend implementation is **complete** and ready for use once the backend schema is updated. All necessary components, services, and dialogs are implemented and tested with TypeScript compilation.

**Next Steps:**
1. Update backend `base-topology.json` with new entity types
2. Restart backend services
3. Launch QUI and test faceplate creation
4. Create example faceplates for common use cases
5. Train users on faceplate builder features
