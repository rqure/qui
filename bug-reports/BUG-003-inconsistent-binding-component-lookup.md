# Bug #3: Inconsistent Component Binding Lookup in FaceplateRuntime

## Severity
**Critical** - This causes two-way bindings to not work correctly, breaking interactive components.

## Description
In `FaceplateRuntime.vue`, the code filters component bindings using `slot.id` instead of `slot.name`. However, bindings use the `component` field which contains the component name, not the ID. This mismatch means that two-way bindings won't be found for components, causing the automatic event handler creation to fail.

## Location
File: `src/apps/faceplate-builder/components/FaceplateRuntime.vue`
Line: 197

## Code
```typescript
// Line 194: Correctly uses slot.name
const handlers = eventHandlersFromConfig.filter((h: any) => String(h.componentId) === slot.name);

// Line 197: ❌ BUG: Incorrectly uses slot.id instead of slot.name
const componentBindings = allBindings.value.filter((b: any) => String(b.componentId) === String(slot.id));
```

## Problem
The `FaceplateBindingDefinition` type defines:
```typescript
export interface FaceplateBindingDefinition {
  component: string;  // This is the component NAME, not ID
  property: string;
  expression: string;
  // ...
}
```

But the code on line 197 compares with `slot.id` instead of `slot.name`, so the filter never matches any bindings. This causes:
1. Two-way bindings are not detected
2. Automatic event handlers for two-way bindings are not created
3. Interactive components (toggles, inputs) don't write back to fields

## Expected Behavior
The binding lookup should use `slot.name` to match against the `component` field in bindings, just like the event handler lookup on line 194 does.

## Suggested Fix
Change line 197 to use `slot.name`:

```typescript
// Line 194: Uses slot.name (correct)
const handlers = eventHandlersFromConfig.filter((h: any) => String(h.componentId) === slot.name);

// Line 197: Should also use slot.name
const componentBindings = allBindings.value.filter((b: any) => b.component === slot.name);
```

## Impact
- **Critical**: Two-way data binding doesn't work
- Interactive form components (toggles, input fields, etc.) cannot write values back to the data store
- Users cannot interact with faceplates to modify entity data
- The core functionality of interactive faceplates is broken

## Steps to Reproduce
1. Create a faceplate with a toggle component
2. Add a two-way binding from the toggle to an entity field (e.g., `mode:twoWay`, expression: `Enabled`)
3. Run the faceplate with an entity
4. Toggle the component
5. Observe that the entity field is not updated (because the automatic event handler was never created)

## Related Files
- `src/apps/faceplate-builder/components/FaceplateRuntime.vue`
- `src/apps/faceplate-builder/utils/faceplate-data.ts` (FaceplateBindingDefinition interface)
