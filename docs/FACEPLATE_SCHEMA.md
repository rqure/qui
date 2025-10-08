# Faceplate Builder Schema Requirements

This document describes the entity types and fields that must be added to the backend `base-topology.json` configuration file to support the Faceplate Builder application.

## Overview

The Faceplate Builder allows users to create and customize SCADA faceplates that bind to entity data. The system requires three new entity types and one additional field on the base `Object` type.

## Required Entity Types

### 1. Faceplate Entity Type

Represents a complete faceplate configuration that can be bound to entity instances.

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

**Field Descriptions:**

- `TargetEntityType`: The entity type this faceplate is designed for (e.g., "Machine", "Service")
- `Configuration`: JSON string containing layout and metadata:
  ```json
  {
    "layout": [
      { "component": "entityId", "x": 0, "y": 0, "w": 4, "h": 3 }
    ],
    "metadata": { "gridColumns": 12, "gridRows": 8 }
  }
  ```
- `Components`: List of FaceplateComponent entity references that make up this faceplate
- `NotificationChannels`: JSON string array of field subscriptions for real-time updates

### 2. FaceplateComponent Entity Type

Represents a reusable graphical component within a faceplate.

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

**Field Descriptions:**

- `ComponentType`: Type of primitive component (e.g., "primitive.gauge.arc", "primitive.status.pill", "primitive.text.block")
- `Configuration`: JSON string containing component-specific properties:
  ```json
  {
    "label": "Temperature",
    "min": 0,
    "max": 100,
    "unit": "°C",
    "color": "#00ffaa"
  }
  ```
- `Bindings`: JSON string array of data bindings:
  ```json
  [
    {
      "component": "comp-id",
      "property": "value",
      "expression": "Temperature",
      "transform": "value * 1.8 + 32"
    }
  ]
  ```
- `AnimationRules`: JSON string array defining conditional animations:
  ```json
  [
    {
      "expression": "Status",
      "activeValue": "Online",
      "animation": "pulse-green"
    }
  ]
  ```

### 3. FaceplateBindingLibrary Entity Type

Represents a reusable binding expression that can be shared across components.

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

**Field Descriptions:**

- `Expression`: Field path or JavaScript expression (e.g., "Parent->Name", "Temperature > 80")
- `TargetComponent`: Optional reference to specific component instance
- `TargetProperty`: Property name to bind to (e.g., "value", "color", "visible")
- `ValueTransform`: Optional JavaScript transformation applied to the value
- `SubscriptionConfig`: JSON string array of notification channel configurations

### 4. Update to Object Entity Type

Add a new field to the base `Object` entity type to associate faceplates with any entity:

```json
{
  "name": "Faceplates",
  "dataType": "EntityList",
  "default": [],
  "storageScope": "Configuration"
}
```

This field should be added to the `Object` entity type definition in `base-topology.json`.

## Example Tree Structure

After adding these entity types, the tree structure might include:

```json
{
  "entityType": "Folder",
  "Name": "Faceplates",
  "Children": [
    {
      "entityType": "Faceplate",
      "Name": "Machine Overview",
      "TargetEntityType": "Machine",
      "Configuration": "{\"layout\":[...],\"metadata\":{}}",
      "Components": ["QOS/Faceplates/Machine Overview/Gauge Component", "QOS/Faceplates/Machine Overview/Status Component"],
      "Children": [
        {
          "entityType": "FaceplateComponent",
          "Name": "Gauge Component",
          "ComponentType": "primitive.gauge.arc",
          "Configuration": "{\"label\":\"CPU Usage\",\"min\":0,\"max\":100,\"unit\":\"%\"}",
          "Bindings": "[{\"property\":\"value\",\"expression\":\"CpuUsage\"}]"
        },
        {
          "entityType": "FaceplateComponent",
          "Name": "Status Component",
          "ComponentType": "primitive.status.pill",
          "Configuration": "{\"label\":\"Status\"}",
          "Bindings": "[{\"property\":\"status\",\"expression\":\"Status\"}]"
        }
      ]
    }
  ]
}
```

## Binding Expression Syntax

### Direct Field Access
- `"Name"` - Access the Name field of the bound entity
- `"Status"` - Access the Status field of the bound entity

### Indirect Field Access (Relationship Navigation)
- `"Parent->Name"` - Access the Name field of the parent entity
- `"Parent->Parent->Status"` - Navigate two levels up the hierarchy
- `"Parent->Description"` - Access any field through relationship

### JavaScript Expressions
Bindings support client-side JavaScript expressions that have access to the entity context:

```javascript
// Simple comparison
"Temperature > 80"

// Complex logic
"Status === 'Online' && Temperature < 100"

// Transformation
"value * 1.8 + 32"  // Convert Celsius to Fahrenheit
```

The expression is evaluated on the client side within the Vue application with access to:
- All entity field values
- Previous values (for change detection)
- Helper functions for common transformations

## Integration with Database Browser

When the `Faceplates` field is populated on an entity, the Database Browser should:

1. Read the entity's `Faceplates` field (EntityList)
2. For each faceplate entity ID in the list:
   - Read the faceplate's `Name` field
   - Add a context menu item: "Open {Name}"
3. When selected, open a new window with FaceplateRuntime component
4. Pass the faceplate entity ID and the current entity ID to the runtime

## Notification System

Faceplates use the data store's notification mechanism to receive real-time updates:

1. Parse the faceplate's bindings to determine required fields
2. Register notifications for each unique field path
3. When notifications arrive, evaluate expressions and update components
4. Support both direct field changes and indirect field changes through relationships

## Data Flow

```
Entity Instance (e.g., Machine "qos-a")
    ↓
Faceplate Runtime
    ↓
Load Faceplate Configuration (from Faceplate entity)
    ↓
Load Components (from FaceplateComponent entities)
    ↓
Parse Bindings & Register Notifications
    ↓
Evaluate Expressions & Render Components
    ↓
Real-time Updates via WebSocket Notifications
```

## Security Considerations

- Faceplate configurations are stored with `Configuration` storage scope
- JavaScript expressions execute in the browser sandbox
- No server-side code execution
- Expressions can only access entity data available to the user
- Respect existing permission and AOR systems

## Implementation Notes

1. All JSON string fields use double-encoded JSON for storage compatibility
2. Entity IDs in component lists are stored as full path strings (e.g., "QOS/Faceplates/Component-1")
3. Notification registration is deduplicated to minimize server load
4. Component rendering is optimized to only update when bound values change
5. Indirection resolution follows entity references synchronously before rendering
