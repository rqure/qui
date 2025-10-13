# Faceplate App Bug Reports

This directory contains detailed bug reports for issues found in the faceplate builder and runtime components.

## Summary of Bugs

| Bug ID | Severity | Title | Location |
|--------|----------|-------|----------|
| BUG-001 | Medium | Duplicate onMounted Lifecycle Hooks | `FaceplateBuilderApp.vue:1273,1287` |
| BUG-002 | High | Metadata Not Properly Cleared During Undo/Redo | `useHistoryManager.ts:63` |
| BUG-003 | Critical | Inconsistent Component Binding Lookup | `FaceplateRuntime.vue:197` |
| BUG-004 | High | Incorrect Layout Lookup for Parent Containers | `FaceplateRuntime.vue:190` |
| BUG-005 | High | Shallow Clone of Props/EventHandlers in History | `useHistoryManager.ts:27-64` |
| BUG-006 | Low | Inconsistent componentId in Auto-generated Handlers | `FaceplateRuntime.vue:211` |

## Critical Bugs (Require Immediate Attention)

### BUG-003: Inconsistent Component Binding Lookup
**Impact**: Two-way data binding does not work, breaking interactive components like toggles and input fields.

**Quick Fix**: Change line 197 in `FaceplateRuntime.vue` from:
```typescript
const componentBindings = allBindings.value.filter((b: any) => String(b.componentId) === String(slot.id));
```
to:
```typescript
const componentBindings = allBindings.value.filter((b: any) => b.component === slot.name);
```

## High Priority Bugs

### BUG-005: Shallow Clone of Props/EventHandlers in History
**Impact**: Nested objects (like tabs arrays) and eventHandlers are shared between history states, causing mutations to affect multiple history entries.

**Quick Fix**: Use `structuredClone()` for deep cloning in `useHistoryManager.ts`:
```typescript
props: structuredClone(node.props),
eventHandlers: node.eventHandlers ? structuredClone(node.eventHandlers) : undefined,
```

### BUG-004: Incorrect Layout Lookup for Parent Containers
**Impact**: Container components don't properly contain child components, breaking layout hierarchy.

**Quick Fix**: Change line 190 in `FaceplateRuntime.vue` from:
```typescript
const layoutItem = layout.find(item => item.component === String(slot.id));
```
to:
```typescript
const layoutItem = layout.find(item => item.component === slot.name);
```

### BUG-002: Metadata Not Properly Cleared During Undo/Redo
**Impact**: Undo/redo operations don't fully restore previous state, particularly viewport and custom metadata.

**Quick Fix**: In `useHistoryManager.ts` line 63, replace:
```typescript
Object.assign(metadata, state.metadata);
```
with:
```typescript
Object.keys(metadata).forEach(key => delete metadata[key]);
Object.assign(metadata, state.metadata);
```

## Medium Priority Bugs

### BUG-001: Duplicate onMounted Lifecycle Hooks
**Impact**: Initialization logic runs twice, causing confusion and potential issues.

**Quick Fix**: Merge the two `onMounted` hooks in `FaceplateBuilderApp.vue` (lines 1273 and 1287) into a single hook.

## Low Priority Bugs

### BUG-006: Inconsistent componentId in Auto-generated Handlers
**Impact**: Auto-generated event handlers use component IDs instead of names, affecting debug logs.

**Quick Fix**: Change line 211 in `FaceplateRuntime.vue` from:
```typescript
componentId: String(slot.id),
```
to:
```typescript
componentId: slot.name,
```

## How to Use These Reports

Each bug report includes:
- **Severity**: Critical, High, Medium, or Low
- **Description**: What the bug is
- **Location**: File and line numbers
- **Code**: The problematic code snippet
- **Problem**: Detailed explanation of why it's a bug
- **Expected Behavior**: What should happen
- **Suggested Fix**: Concrete code changes to fix the bug
- **Impact**: What problems the bug causes
- **Steps to Reproduce**: How to see the bug in action

## Creating GitHub Issues

To create GitHub issues from these reports:

1. Go to the repository's Issues page
2. Click "New Issue"
3. Use the bug report title as the issue title
4. Copy the bug report content as the issue description
5. Add appropriate labels (bug, critical/high/medium priority, faceplate-builder/faceplate-runtime)
6. Assign to the appropriate team member

## Testing After Fixes

After fixing these bugs, test the following scenarios:

1. **Two-way binding**: Create a toggle with two-way binding and verify it updates the entity field
2. **Container hierarchy**: Create nested containers and verify children render inside parents
3. **Undo/redo with metadata**: Change viewport size, add metadata, then undo and verify metadata is fully restored
4. **Undo/redo with nested props**: Create a tabs container, modify tab names, undo, and verify tabs are restored correctly
5. **Undo/redo with event handlers**: Add/modify event handlers, undo, and verify handlers are restored correctly
6. **Initialization**: Add logging to verify onMounted only runs once with all initialization complete
7. **Debug logging**: Check that event handler logs show component names instead of IDs

## Related Documentation

- [Faceplate Builder Architecture](../docs/faceplate-builder.md) (if exists)
- [Component Binding System](../docs/bindings.md) (if exists)
- [History Management](../docs/history.md) (if exists)
