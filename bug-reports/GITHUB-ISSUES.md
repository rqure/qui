# Creating GitHub Issues from Bug Reports

This document provides templates for creating GitHub issues from the bug reports.

## Issue Creation Order

Create issues in this order to address critical bugs first:

1. BUG-003 (Critical)
2. BUG-004 (High)
3. BUG-005 (High)
4. BUG-002 (High)
5. BUG-001 (Medium)
6. BUG-006 (Low)

## Issue Templates

### BUG-003: Two-Way Binding Not Working

**Title**: `[Critical Bug] Two-way binding broken due to incorrect component lookup in FaceplateRuntime`

**Labels**: `bug`, `critical`, `faceplate-runtime`, `binding`

**Description**:
```markdown
## Description
Two-way bindings do not work because the component binding lookup in FaceplateRuntime.vue uses `slot.id` instead of `slot.name`, causing the lookup to never match any bindings.

## Impact
- Two-way data binding is completely broken
- Interactive form components (toggles, input fields) cannot write values back to the data store
- Users cannot interact with faceplates to modify entity data

## Location
File: `src/apps/faceplate-builder/components/FaceplateRuntime.vue`, line 197

## Current Code
```typescript
const componentBindings = allBindings.value.filter((b: any) => String(b.componentId) === String(slot.id));
```

## Fix
```typescript
const componentBindings = allBindings.value.filter((b: any) => b.component === slot.name);
```

## Steps to Reproduce
1. Create a faceplate with a toggle component
2. Add a two-way binding from the toggle to an entity field (mode: `twoWay`, expression: `Enabled`)
3. Run the faceplate with an entity
4. Toggle the component
5. Observe that the entity field is not updated

## Related
See bug-reports/BUG-003-inconsistent-binding-component-lookup.md for full details.
```

---

### BUG-004: Container Hierarchies Not Working

**Title**: `[High Priority] Container parent-child relationships broken due to incorrect layout lookup`

**Labels**: `bug`, `high-priority`, `faceplate-runtime`, `containers`

**Description**:
```markdown
## Description
Parent-child relationships in container components don't work because the layout lookup compares `item.component` (component name) with `slot.id` (component ID).

## Impact
- Container components don't properly contain child components
- Layout hierarchy is broken
- Child components render as root-level instead of inside containers

## Location
File: `src/apps/faceplate-builder/components/FaceplateRuntime.vue`, line 190

## Current Code
```typescript
const layoutItem = layout.find(item => item.component === String(slot.id));
```

## Fix
```typescript
const layoutItem = layout.find(item => item.component === slot.name);
```

## Steps to Reproduce
1. Create a faceplate with a container component (e.g., panel or tabs)
2. Add child components to the container
3. Save and run the faceplate
4. Observe that child components are not rendered inside their container
5. Check console logs - no components will have a `parentId`

## Related
See bug-reports/BUG-004-incorrect-layout-lookup.md for full details.
```

---

### BUG-005: History State Corruption with Nested Objects

**Title**: `[High Priority] Shallow cloning in history manager causes state corruption with nested objects`

**Labels**: `bug`, `high-priority`, `faceplate-builder`, `history`, `state-management`

**Description**:
```markdown
## Description
The history manager uses shallow cloning for node props and doesn't clone eventHandlers at all, causing nested objects to be shared between history states. This leads to mutations affecting multiple history entries.

## Impact
- Undo/redo doesn't properly restore component state with nested properties
- Editing nested properties (like tab names) affects all history entries
- Event handler modifications propagate to historical states

## Location
File: `src/apps/faceplate-builder/composables/useHistoryManager.ts`, lines 27-64

## Current Code
```typescript
props: { ...node.props },  // Shallow copy - nested objects are shared
// eventHandlers not cloned at all
```

## Fix
```typescript
props: structuredClone(node.props),
eventHandlers: node.eventHandlers ? structuredClone(node.eventHandlers) : undefined,
```

## Steps to Reproduce
1. Create a tabs container with two tabs
2. Edit a tab name
3. Undo the change
4. Bug: The tab name persists because the tabs array is shared

## Related
See bug-reports/BUG-005-shallow-clone-in-history.md for full details and complete fix.
```

---

### BUG-002: Metadata Not Cleared in Undo/Redo

**Title**: `[High Priority] Undo/redo doesn't properly clear metadata properties`

**Labels**: `bug`, `high-priority`, `faceplate-builder`, `history`, `state-management`

**Description**:
```markdown
## Description
The `applyState` function uses `Object.assign` to restore metadata during undo/redo, but this doesn't remove properties that exist in the current state but not in the historical state.

## Impact
- Metadata properties accumulate and are never removed
- Viewport size and custom metadata don't properly restore
- Undo doesn't fully revert to previous state

## Location
File: `src/apps/faceplate-builder/composables/useHistoryManager.ts`, line 63

## Current Code
```typescript
Object.assign(metadata, state.metadata);
```

## Fix
```typescript
Object.keys(metadata).forEach(key => delete metadata[key]);
Object.assign(metadata, state.metadata);
```

## Steps to Reproduce
1. Create a faceplate with initial viewport metadata
2. Change viewport size (adds/modifies metadata)
3. Add custom metadata property
4. Undo the changes
5. Inspect metadata - it still contains properties that shouldn't exist

## Related
See bug-reports/BUG-002-metadata-not-cleared-in-undo-redo.md for full details.
```

---

### BUG-001: Duplicate onMounted Hooks

**Title**: `[Medium Priority] Duplicate onMounted lifecycle hooks cause double initialization`

**Labels**: `bug`, `medium-priority`, `faceplate-builder`, `code-quality`

**Description**:
```markdown
## Description
FaceplateBuilderApp.vue has two separate `onMounted` lifecycle hooks, causing initialization logic to run twice when the component is mounted.

## Impact
- Initialization code runs twice (but doesn't cause errors)
- Code is harder to maintain and understand
- Could lead to future bugs if developers add conflicting logic

## Location
File: `src/apps/faceplate-builder/FaceplateBuilderApp.vue`, lines 1273 and 1287

## Fix
Merge both hooks into a single `onMounted`:

```typescript
onMounted(async () => {
  // Event listeners
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('beforeunload', handleBeforeUnload);
  
  // Initialize history
  if (!history.stack.length) {
    pushHistory(nodes.value, bindings.value, viewportSize.value, faceplateMetadata.value);
    markSaved();
  }
  
  // Load faceplate if provided
  if (props.faceplateId) {
    try {
      await loadFaceplateData(props.faceplateId);
    } catch (error) {
      logger.error('Failed to load faceplate on mount:', error);
    }
  }
});
```

## Related
See bug-reports/BUG-001-duplicate-onMounted-hooks.md for full details.
```

---

### BUG-006: Inconsistent componentId in Auto-generated Handlers

**Title**: `[Low Priority] Auto-generated event handlers use component ID instead of name`

**Labels**: `bug`, `low-priority`, `faceplate-runtime`, `consistency`

**Description**:
```markdown
## Description
Auto-generated event handlers for two-way bindings use `slot.id` (component ID) instead of `slot.name` (component name) for the `componentId` field, which is inconsistent with manually-created handlers.

## Impact
- Low functional impact (only affects logging)
- Debug logs show component IDs instead of names
- Inconsistent with manually-created handlers

## Location
File: `src/apps/faceplate-builder/components/FaceplateRuntime.vue`, line 211

## Current Code
```typescript
componentId: String(slot.id),
```

## Fix
```typescript
componentId: slot.name,
```

## Example Impact
Before: `Event triggered: onChange on component 12345 value: true`
After: `Event triggered: onChange on component MyToggleButton value: true`

## Related
See bug-reports/BUG-006-inconsistent-componentid-in-autogenerated-handlers.md for full details.
```

---

## After Creating Issues

1. Update bug report files to include GitHub issue numbers
2. Create a milestone for "Faceplate Stability" to track these issues
3. Consider creating a project board to track progress
4. Assign issues based on team expertise
5. Link related issues together (e.g., BUG-003, BUG-004, BUG-006 are all ID/name issues)

## Testing After Fixes

After all issues are resolved, run the test scenarios documented in `bug-reports/README.md`:

- [ ] Two-way binding test
- [ ] Container hierarchy test  
- [ ] Undo/redo with metadata test
- [ ] Undo/redo with nested props test
- [ ] Undo/redo with event handlers test
- [ ] Initialization test
- [ ] Debug logging test
