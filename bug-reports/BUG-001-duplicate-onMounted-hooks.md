# Bug #1: Duplicate onMounted Lifecycle Hooks in FaceplateBuilderApp.vue

## Severity
**Medium** - This causes the initialization code to run twice, which can lead to unexpected behavior.

## Description
The `FaceplateBuilderApp.vue` file contains two separate `onMounted` lifecycle hooks, which causes initialization logic to execute twice when the component is mounted.

## Location
File: `src/apps/faceplate-builder/FaceplateBuilderApp.vue`
- First `onMounted`: Line 1273
- Second `onMounted`: Line 1287

## Code
```javascript
// First onMounted hook (line 1273)
onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('beforeunload', handleBeforeUnload);
});

// Second onMounted hook (line 1287) 
onMounted(async () => {
  if (!history.stack.length) {
    pushHistory(nodes.value, bindings.value, viewportSize.value, faceplateMetadata.value);
    markSaved();
  }
  
  // If a faceplate ID was provided, load it
  if (props.faceplateId) {
    try {
      await loadFaceplateData(props.faceplateId);
    } catch (error) {
      logger.error('Failed to load faceplate on mount:', error);
    }
  }
});
```

## Problem
Vue's composition API allows multiple lifecycle hooks of the same type, and they all execute. While this doesn't cause an immediate error, having two separate `onMounted` hooks makes the code harder to maintain and understand. The initialization logic is split unnecessarily.

## Expected Behavior
All initialization logic should be in a single `onMounted` hook for clarity and maintainability.

## Suggested Fix
Merge both `onMounted` hooks into a single one:

```javascript
onMounted(async () => {
  // Event listeners
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('beforeunload', handleBeforeUnload);
  
  // Initialize history
  if (!history.stack.length) {
    pushHistory(nodes.value, bindings.value, viewportSize.value, faceplateMetadata.value);
    markSaved();
  }
  
  // If a faceplate ID was provided, load it
  if (props.faceplateId) {
    try {
      await loadFaceplateData(props.faceplateId);
    } catch (error) {
      logger.error('Failed to load faceplate on mount:', error);
    }
  }
});
```

## Impact
- Low runtime impact (code runs twice but doesn't cause errors)
- Medium maintainability impact (confusing code structure)
- Could lead to future bugs if developers add conflicting initialization logic to different hooks

## Steps to Reproduce
1. Open the faceplate builder app
2. Add console logs to both `onMounted` hooks
3. Observe that both hooks execute in sequence

## Related Files
- `src/apps/faceplate-builder/FaceplateBuilderApp.vue`
