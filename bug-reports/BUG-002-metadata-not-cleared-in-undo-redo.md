# Bug #2: Metadata Not Properly Cleared During Undo/Redo Operations

## Severity
**High** - This causes metadata to accumulate and not be properly restored during undo/redo, leading to inconsistent state.

## Description
The `applyState` function in `useHistoryManager.ts` uses `Object.assign` to restore metadata during undo/redo operations. However, `Object.assign` only adds/overwrites properties from the source object; it does not remove properties that exist in the target but not in the source. This means that metadata properties can accumulate over time and never be removed, even when undoing to a state that didn't have those properties.

## Location
File: `src/apps/faceplate-builder/composables/useHistoryManager.ts`
Line: 63

## Code
```typescript
function applyState(state: HistoryState, nodes: CanvasNode[], bindings: Binding[], viewport: Vector2, metadata: Record<string, unknown>) {
  nodes.splice(0, nodes.length, ...state.nodes.map((node) => ({
    ...node,
    position: { ...node.position },
    size: { ...node.size },
    props: { ...node.props },
    parentId: node.parentId || null,
    children: node.children ? [...node.children] : undefined,
    zIndex: node.zIndex,
  })));
  bindings.splice(0, bindings.length, ...state.bindings.map((binding) => ({ ...binding })));
  viewport.x = state.viewport.x;
  viewport.y = state.viewport.y;
  Object.assign(metadata, state.metadata); // ❌ BUG: Doesn't clear existing properties
}
```

## Problem
When you:
1. Have a state with metadata `{ foo: 'a', bar: 'b' }`
2. Make changes that add metadata `{ foo: 'a', bar: 'b', baz: 'c' }`
3. Undo back to the first state

The result will be `{ foo: 'a', bar: 'b', baz: 'c' }` instead of the expected `{ foo: 'a', bar: 'b' }`. The `baz` property remains even though it shouldn't exist in the historical state.

## Expected Behavior
After undo/redo, the metadata object should exactly match the metadata from the historical state, with no extra properties.

## Suggested Fix
Clear all existing properties before assigning the historical state:

```typescript
function applyState(state: HistoryState, nodes: CanvasNode[], bindings: Binding[], viewport: Vector2, metadata: Record<string, unknown>) {
  nodes.splice(0, nodes.length, ...state.nodes.map((node) => ({
    ...node,
    position: { ...node.position },
    size: { ...node.size },
    props: { ...node.props },
    parentId: node.parentId || null,
    children: node.children ? [...node.children] : undefined,
    zIndex: node.zIndex,
  })));
  bindings.splice(0, bindings.length, ...state.bindings.map((binding) => ({ ...binding })));
  viewport.x = state.viewport.x;
  viewport.y = state.viewport.y;
  
  // Clear all existing properties first
  Object.keys(metadata).forEach(key => delete metadata[key]);
  // Then assign the historical state
  Object.assign(metadata, state.metadata);
}
```

## Impact
- High: Can cause viewport size, custom metadata, and other settings to not properly restore
- Can lead to confusing behavior where undoing changes doesn't fully restore previous state
- May affect window resizing behavior if viewport metadata is not properly restored

## Steps to Reproduce
1. Open faceplate builder
2. Create a faceplate with initial viewport metadata
3. Change the viewport size (adds/modifies metadata)
4. Add custom metadata property
5. Undo the changes
6. Inspect the metadata object - it will still contain properties that shouldn't exist

## Related Files
- `src/apps/faceplate-builder/composables/useHistoryManager.ts`
- Any code that relies on metadata for state restoration
