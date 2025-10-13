# Bug #6: Inconsistent componentId in Auto-generated Event Handlers

## Severity
**Low** - This is mainly a consistency issue that affects debugging/logging but doesn't break functionality.

## Description
When automatically creating event handlers for two-way bindings in `FaceplateRuntime.vue`, the code uses `slot.id` (component ID) instead of `slot.name` (component name) for the `componentId` field. This is inconsistent with how manually-created event handlers store the component name in the `componentId` field.

## Location
File: `src/apps/faceplate-builder/components/FaceplateRuntime.vue`
Line: 211

## Code
```typescript
// Line 194: Manual handlers use component name (slot.name) - CORRECT
const handlers = eventHandlersFromConfig.filter((h: any) => String(h.componentId) === slot.name);

// Lines 208-220: Auto-generated handlers use component ID (slot.id) - INCONSISTENT
if (!hasExistingHandler) {
  // Create automatic write handler
  handlers.push({
    id: `auto-twoway-${binding.id}`,
    componentId: String(slot.id),  // ❌ Should be slot.name for consistency
    trigger: 'onChange',
    action: {
      type: 'writeField',
      fieldPath: binding.expression,
      valueSource: 'component',
    },
    enabled: true,
    description: `Auto-generated for two-way binding to ${binding.expression}`,
  });
}
```

## Problem
The event handler configuration stores component names (not IDs) in the `componentId` field:
```typescript
// From FaceplateBuilderApp.vue line 1142
const eventHandlersData = nodes.value
  .filter(node => node.eventHandlers && node.eventHandlers.length > 0)
  .flatMap(node => 
    (node.eventHandlers || []).map(handler => ({
      id: handler.id,
      componentId: node.name,  // ← Uses component NAME
      trigger: handler.trigger,
      action: handler.action,
      description: handler.description,
      enabled: handler.enabled !== false,
    }))
  );
```

When auto-generating handlers for two-way bindings, we should maintain this same convention for consistency.

## Impact
- **Low functional impact**: The `componentId` field is mainly used for logging (`logger.debug` in useEventHandling.ts line 33), so functionality is not broken
- **Debugging impact**: When debugging, logs will show component IDs instead of component names for auto-generated handlers, making them harder to trace
- **Consistency impact**: Mixing IDs and names in the same field is confusing

## Expected Behavior
Auto-generated event handlers should use component names (like manually-created handlers) for consistency and better debugging experience.

## Suggested Fix
Change line 211 to use `slot.name`:

```typescript
if (!hasExistingHandler) {
  // Create automatic write handler
  handlers.push({
    id: `auto-twoway-${binding.id}`,
    componentId: slot.name,  // ✓ Use slot.name for consistency
    trigger: 'onChange',
    action: {
      type: 'writeField',
      fieldPath: binding.expression,
      valueSource: 'component',
    },
    enabled: true,
    description: `Auto-generated for two-way binding to ${binding.expression}`,
  });
}
```

## Example Debug Output
### Before fix:
```
Event triggered: onChange on component 12345 value: true
```

### After fix:
```
Event triggered: onChange on component MyToggleButton value: true
```

The second output is much clearer for debugging.

## Related Bugs
- Related to BUG-003 and BUG-004 which also deal with component ID vs name inconsistencies

## Related Files
- `src/apps/faceplate-builder/components/FaceplateRuntime.vue`
- `src/apps/faceplate-builder/composables/useEventHandling.ts` (logging)
- `src/apps/faceplate-builder/FaceplateBuilderApp.vue` (event handler saving)
