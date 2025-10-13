# Bug #4: Incorrect Layout Lookup for Parent Container Relationships

## Severity
**High** - This breaks parent-child relationships in container components, causing layout issues.

## Description
In `FaceplateRuntime.vue`, the code looks up layout items by comparing `item.component` (which contains the component name) with `String(slot.id)` (which is the component ID). This comparison will never match, causing the parent-child relationship to fail to load correctly. Container components won't properly contain their children.

## Location
File: `src/apps/faceplate-builder/components/FaceplateRuntime.vue`
Line: 190

## Code
```typescript
const components = renderedSlots.value.map(slot => {
  // Find parent ID from layout data
  const layoutItem = layout.find(item => item.component === String(slot.id)); // ❌ BUG
  const parentId = layoutItem?.parentId || null;
  // ...
});
```

## Problem
The layout configuration stores component names in the `component` field:
```typescript
const layout = nodes.value.map((node) => {
  return {
    component: node.name,  // ← Component NAME, not ID
    x: node.position.x,
    y: node.position.y,
    w: node.size.x,
    h: node.size.y,
    parentId: parentNode ? parentNode.name : null,  // ← Also uses NAME
  };
});
```

But line 190 tries to match this against `slot.id`, which is the component ID. This means:
1. `layoutItem` will always be `undefined`
2. `parentId` will always be `null`
3. Container hierarchies won't render correctly
4. Child components won't be positioned relative to their containers

## Expected Behavior
The layout lookup should compare against `slot.name` to match the component name stored in the layout configuration.

## Suggested Fix
Change line 190 to use `slot.name`:

```typescript
const components = renderedSlots.value.map(slot => {
  // Find parent ID from layout data
  const layoutItem = layout.find(item => item.component === slot.name); // ✓ Use slot.name
  const parentId = layoutItem?.parentId || null;
  // ...
});
```

## Impact
- **High**: Container components don't work properly
- Child components are not associated with their parent containers
- Layout hierarchy is broken
- Components that should be inside containers render as root-level components
- Positioning and organization of nested components fails

## Steps to Reproduce
1. Create a faceplate with a container component (e.g., a panel or tabs)
2. Add child components to the container
3. Save and run the faceplate
4. Observe that child components are not rendered inside their container
5. Check the console logs (in DEV mode) - you'll see that no components have a `parentId`

## Debugging Output
The code includes debug logging that would show this issue:
```typescript
if (import.meta.env.DEV && parentId) {
  console.log(`FaceplateRuntime - Component ${slot.id} has parentId: ${parentId}`);
}
```
This log will never fire because `parentId` is always `null` due to the bug.

## Related Files
- `src/apps/faceplate-builder/components/FaceplateRuntime.vue`
- `src/apps/faceplate-builder/FaceplateBuilderApp.vue` (where layout is saved)
