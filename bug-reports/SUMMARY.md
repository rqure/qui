# Faceplate App Bug Analysis Summary

## Overview
This analysis identified **6 bugs** in the faceplate builder and runtime components, ranging from critical functionality-breaking issues to minor consistency problems.

## Bugs by Category

### State Management Issues (3 bugs)
- **BUG-002**: Metadata not cleared during undo/redo operations
- **BUG-005**: Shallow cloning causes shared state in history
- **BUG-001**: Duplicate onMounted hooks causing double initialization

### Component Identification Issues (3 bugs)
- **BUG-003**: Binding lookup uses wrong identifier (CRITICAL)
- **BUG-004**: Layout lookup uses wrong identifier
- **BUG-006**: Auto-generated handlers use wrong identifier

## Root Causes

### 1. ID vs Name Confusion
**Affected bugs**: BUG-003, BUG-004, BUG-006

The codebase has an inconsistency in how components are identified:
- **Builder side**: Uses node IDs (`node.id`) for internal tracking
- **Runtime side**: Uses component names (`component.name`) for binding/layout lookups
- **Configuration**: Stores component names in layout and bindings

This mismatch causes lookups to fail because the code compares IDs with names.

**Pattern**:
```typescript
// In runtime, slot.id is the component ID (number)
// But layout and bindings store component names (strings)

// WRONG:
layout.find(item => item.component === String(slot.id))

// CORRECT:
layout.find(item => item.component === slot.name)
```

### 2. Shallow Cloning
**Affected bugs**: BUG-002, BUG-005

The history manager uses shallow object spread (`{ ...obj }`) for cloning, which doesn't handle:
- Nested objects in props (e.g., tabs arrays)
- Event handler objects
- Metadata objects with nested values
- Dependencies arrays in bindings

**Solution**: Use `structuredClone()` for deep cloning.

### 3. Lifecycle Hook Organization
**Affected bugs**: BUG-001

Vue allows multiple lifecycle hooks of the same type, but having two separate `onMounted` hooks is poor practice and confusing.

## Impact Assessment

### Critical (Immediate Fix Required)
- **BUG-003**: Two-way binding completely broken
  - Users cannot interact with form components
  - Data cannot be written back to entities

### High (Fix Soon)
- **BUG-002**: Undo/redo doesn't fully restore state
  - Viewport settings persist incorrectly
  - Custom metadata accumulates
  
- **BUG-004**: Container hierarchies don't work
  - Parent-child relationships fail
  - Nested components render incorrectly
  
- **BUG-005**: History state corruption
  - Nested props shared between states
  - Undo doesn't restore complex components

### Medium (Fix When Convenient)
- **BUG-001**: Code organization issue
  - Initialization runs twice (but works)
  - Maintenance burden

### Low (Cosmetic)
- **BUG-006**: Inconsistent logging
  - Debug messages show IDs instead of names
  - No functional impact

## Recommended Fix Order

1. **BUG-003** (Critical) - 5 minutes
   - One line change
   - Fixes two-way binding
   
2. **BUG-004** (High) - 5 minutes
   - One line change
   - Fixes container hierarchies
   
3. **BUG-005** (High) - 30 minutes
   - Use `structuredClone()` in multiple places
   - Fixes history state corruption
   - Test thoroughly with nested components
   
4. **BUG-002** (High) - 10 minutes
   - Add property clearing before Object.assign
   - Fixes metadata restoration
   
5. **BUG-001** (Medium) - 5 minutes
   - Merge two onMounted hooks
   - Improves code clarity
   
6. **BUG-006** (Low) - 5 minutes
   - One line change
   - Improves debugging experience

**Total estimated fix time**: ~60 minutes for all bugs

## Testing Checklist

After fixes are applied, verify:

- [ ] Two-way bindings work (toggle updates entity)
- [ ] Container hierarchies render correctly
- [ ] Undo/redo fully restores all state including:
  - [ ] Viewport size
  - [ ] Custom metadata
  - [ ] Tab names in containers
  - [ ] Event handlers
- [ ] Initialization only happens once
- [ ] Debug logs show component names

## Code Quality Recommendations

### Naming Conventions
Consider standardizing on either IDs or names throughout:
- Option A: Use IDs everywhere (requires refactoring bindings/layout storage)
- Option B: Use names everywhere (current approach, just needs fixes)
- Option C: Always clarify with explicit naming (`componentId` vs `componentName`)

### Deep Cloning
Establish a pattern for state cloning:
```typescript
// Good: Use structuredClone for complex objects
const clone = structuredClone(obj);

// Acceptable: Use spread for simple flat objects
const clone = { ...obj };

// Bad: Don't use spread for nested objects
const clone = { ...obj }; // if obj.nested is an object
```

### Type Safety
Consider stricter types to catch these issues:
```typescript
type ComponentId = number;
type ComponentName = string;

// Make it impossible to mix them up
interface LayoutItem {
  component: ComponentName;  // Not ComponentId
  // ...
}
```

## Files Modified

The fixes will touch these files:
- `src/apps/faceplate-builder/composables/useHistoryManager.ts` (BUG-002, BUG-005)
- `src/apps/faceplate-builder/components/FaceplateRuntime.vue` (BUG-003, BUG-004, BUG-006)
- `src/apps/faceplate-builder/FaceplateBuilderApp.vue` (BUG-001)

## Conclusion

All identified bugs have clear root causes and straightforward fixes. The most critical issues (BUG-003, BUG-004) are one-line changes. The more complex issues (BUG-005) require careful testing but have well-defined solutions using modern JavaScript APIs like `structuredClone()`.

These bugs likely went unnoticed because:
1. The app may not have been tested with complex scenarios (nested containers, tabs, two-way bindings)
2. TypeScript's type system didn't catch the ID vs name mismatches (they're both strings/numbers)
3. The shallow clone issue only manifests with specific component types

Fixing these bugs will significantly improve the stability and usability of the faceplate builder.
