# Bug #5: Shallow Clone of Node Props and EventHandlers Causes Shared State

## Severity
**High** - Can cause state corruption and unexpected behavior in undo/redo operations.

## Description
The `cloneState` and `applyState` functions in `useHistoryManager.ts` use shallow cloning (`{ ...node.props }`) for node properties and don't deep-clone the `eventHandlers` array. This means that nested objects and arrays within props (like `tabs` arrays) and eventHandlers will be shared between the history state and the current state, leading to mutations affecting multiple history entries.

## Location
File: `src/apps/faceplate-builder/composables/useHistoryManager.ts`
Lines: 27-42 (cloneState) and 50-64 (applyState)

## Code
```typescript
function cloneState(nodes: CanvasNode[], bindings: Binding[], viewport: Vector2, metadata: Record<string, unknown>): HistoryState {
  return {
    nodes: nodes.map((node) => ({
      ...node,
      position: { ...node.position },
      size: { ...node.size },
      props: { ...node.props },  // ❌ SHALLOW COPY - nested objects are shared!
      parentId: node.parentId || null,
      children: node.children ? [...node.children] : undefined,
      zIndex: node.zIndex,
      // ❌ eventHandlers not cloned at all - shared reference!
    })),
    bindings: bindings.map((binding) => ({ ...binding })),
    viewport: { ...viewport },
    metadata: { ...metadata },
  };
}
```

## Problem
### Props with Nested Objects
Components like `primitive.container.tabs` have a `tabs` property that is an array of objects:
```typescript
props: {
  tabs: [
    { name: "Tab 1", id: "tab-1" },
    { name: "Tab 2", id: "tab-2" }
  ]
}
```

When you use `{ ...node.props }`, you create a new props object, but the `tabs` array is still the same reference. This means:

1. You edit Tab 1's name to "Updated Tab"
2. You undo
3. **Bug**: The tab name is still "Updated Tab" in the historical state because all history entries share the same tabs array

### EventHandlers Not Cloned
The `eventHandlers` array is not cloned at all, so:
```typescript
{
  ...node,
  props: { ...node.props },
  // eventHandlers is not copied, so it's the same reference!
}
```

This means all history states share the same eventHandlers array, so modifications to event handlers affect all history entries.

## Expected Behavior
Each history state should have completely independent copies of all data, including nested objects and arrays.

## Suggested Fix
Use deep cloning (preferably with `structuredClone` which is built-in and handles most cases):

```typescript
function cloneState(nodes: CanvasNode[], bindings: Binding[], viewport: Vector2, metadata: Record<string, unknown>): HistoryState {
  return {
    nodes: nodes.map((node) => ({
      ...node,
      position: { ...node.position },
      size: { ...node.size },
      props: structuredClone(node.props),  // ✓ Deep clone
      parentId: node.parentId || null,
      children: node.children ? [...node.children] : undefined,
      zIndex: node.zIndex,
      eventHandlers: node.eventHandlers ? structuredClone(node.eventHandlers) : undefined,  // ✓ Deep clone
    })),
    bindings: bindings.map((binding) => ({ 
      ...binding,
      dependencies: binding.dependencies ? [...binding.dependencies] : undefined,
    })),
    viewport: { ...viewport },
    metadata: structuredClone(metadata),  // ✓ Deep clone metadata too
  };
}

function applyState(state: HistoryState, nodes: CanvasNode[], bindings: Binding[], viewport: Vector2, metadata: Record<string, unknown>) {
  nodes.splice(0, nodes.length, ...state.nodes.map((node) => ({
    ...node,
    position: { ...node.position },
    size: { ...node.size },
    props: structuredClone(node.props),  // ✓ Deep clone
    parentId: node.parentId || null,
    children: node.children ? [...node.children] : undefined,
    zIndex: node.zIndex,
    eventHandlers: node.eventHandlers ? structuredClone(node.eventHandlers) : undefined,  // ✓ Deep clone
  })));
  bindings.splice(0, bindings.length, ...state.bindings.map((binding) => ({ 
    ...binding,
    dependencies: binding.dependencies ? [...binding.dependencies] : undefined,
  })));
  viewport.x = state.viewport.x;
  viewport.y = state.viewport.y;
  
  // Clear and deep clone metadata
  Object.keys(metadata).forEach(key => delete metadata[key]);
  Object.assign(metadata, structuredClone(state.metadata));
}
```

### Alternative: Manual Deep Clone
If `structuredClone` is not available or doesn't work for certain types:
```typescript
function deepCloneProps(props: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(props));
}
```

Note: `JSON.parse(JSON.stringify())` works for most cases but has limitations (no functions, no undefined, no circular references). `structuredClone` is preferred.

## Impact
- **High**: Undo/redo doesn't properly restore component state
- Editing nested properties (like tab names) affects all history entries
- Event handler modifications propagate to historical states
- Can lead to very confusing behavior where undoing doesn't actually undo changes
- Particularly affects:
  - Tab containers (tabs array)
  - Event handlers (action objects)
  - Any component with nested configuration objects

## Steps to Reproduce
1. Create a faceplate with a tabs container
2. Add two tabs: "Tab 1" and "Tab 2"
3. Push to history (component is created)
4. Edit "Tab 1" to "Modified Tab"
5. Push to history again
6. Undo to the first state
7. **Bug**: "Modified Tab" name persists in the historical state because the tabs array is shared

## Related Bugs
This bug is related to BUG-002 (metadata not cleared), as both deal with improper state restoration.

## Related Files
- `src/apps/faceplate-builder/composables/useHistoryManager.ts`
- `src/apps/faceplate-builder/types.ts` (CanvasNode, EventHandler types)
- `src/apps/faceplate-builder/components/InspectorPanel.vue` (tabs editing)
