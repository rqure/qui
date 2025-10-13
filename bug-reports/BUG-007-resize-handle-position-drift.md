# Bug #7: Resize Handle Position Drift When Minimum Size Constraint is Hit

## Severity
**Medium** - Affects user experience when resizing components but doesn't break core functionality.

## Description
When resizing a component using the west (w) or north (n) handles and hitting the minimum size constraint, the position continues to update even though the size is clamped. This causes the component to drift/move away from the resize handle, creating a confusing and frustrating user experience.

## Location
File: `src/apps/faceplate-builder/components/BuilderCanvas.vue`
Lines: 469-482

## Code
```typescript
// Calculate new size and position based on handle
if (handle.includes('w')) {
  newPos.x = originalPosition.x + deltaX;  // ❌ Position always updates
  newSize.x = Math.max(80, originalSize.x - deltaX);  // But size is clamped
}
if (handle.includes('e')) {
  newSize.x = Math.max(80, originalSize.x + deltaX);
}
if (handle.includes('n')) {
  newPos.y = originalPosition.y + deltaY;  // ❌ Position always updates
  newSize.y = Math.max(60, originalSize.y - deltaY);  // But size is clamped
}
if (handle.includes('s')) {
  newSize.y = Math.max(60, originalSize.y + deltaY);
}
```

## Problem
When resizing from the west or north handles:
1. The position is calculated as `originalPosition + deltaX/Y`
2. The size is calculated as `Math.max(MIN_SIZE, originalSize - deltaX/Y)`
3. When the minimum size is reached, the size stops changing but the position continues to update
4. This breaks the invariant that `position + size` should remain constant when resizing from top/left

### Example Scenario
1. Component is at position x=100, width=200
2. User drags west handle left by 150 pixels (deltaX = -150)
3. Intended: position x=0, width=250 (moved left, got wider)
4. But when minimum size (80) is hit:
   - Calculated size: `Math.max(80, 200 - (-150))` = `Math.max(80, 350)` = 350 → clamped to 80
   - Position: `100 + (-150)` = -50 (still updates!)
   - Result: Component moves to x=-50 with width=80 instead of staying at x=20 with width=80

The right edge position should stay fixed when resizing from the left, but instead the component drifts.

## Expected Behavior
When resizing from west or north handles and the minimum size constraint is hit, the position should adjust to compensate for the clamped size, keeping the opposite edge fixed in place.

## Suggested Fix
Calculate the actual size change after clamping, then adjust the position based on the actual size change:

```typescript
// Calculate new size and position based on handle
if (handle.includes('w')) {
  const targetWidth = originalSize.x - deltaX;
  newSize.x = Math.max(80, targetWidth);
  // Position only changes by the actual size change, not the requested delta
  const actualSizeChange = newSize.x - originalSize.x;
  newPos.x = originalPosition.x - actualSizeChange;
}
if (handle.includes('e')) {
  newSize.x = Math.max(80, originalSize.x + deltaX);
}
if (handle.includes('n')) {
  const targetHeight = originalSize.y - deltaY;
  newSize.y = Math.max(60, targetHeight);
  // Position only changes by the actual size change, not the requested delta
  const actualSizeChange = newSize.y - originalSize.y;
  newPos.y = originalPosition.y - actualSizeChange;
}
if (handle.includes('s')) {
  newSize.y = Math.max(60, originalSize.y + deltaY);
}
```

## Alternative Fix (Simpler)
Another approach is to keep the opposite edge fixed:

```typescript
if (handle.includes('w')) {
  // Keep right edge fixed
  const rightEdge = originalPosition.x + originalSize.x;
  newSize.x = Math.max(80, originalSize.x - deltaX);
  newPos.x = rightEdge - newSize.x;
}
if (handle.includes('e')) {
  newSize.x = Math.max(80, originalSize.x + deltaX);
}
if (handle.includes('n')) {
  // Keep bottom edge fixed
  const bottomEdge = originalPosition.y + originalSize.y;
  newSize.y = Math.max(60, originalSize.y - deltaY);
  newPos.y = bottomEdge - newSize.y;
}
if (handle.includes('s')) {
  newSize.y = Math.max(60, originalSize.y + deltaY);
}
```

## Impact
- **Medium**: Makes resizing from west/north handles feel broken and unpredictable
- Users may think resizing is buggy when it "jumps" or "drifts"
- Particularly noticeable when trying to resize small components
- Affects user experience and perceived quality of the builder tool

## Steps to Reproduce
1. Open the faceplate builder
2. Create a component on the canvas
3. Select the component
4. Try to resize it from the west (left) handle, dragging inward past the minimum size
5. Observe that the component "drifts" away from the resize handle
6. The same issue occurs with the north (top) handle
7. Also affects northwest, northeast, and southwest handles (any handle with 'w' or 'n')

## Visual Behavior
```
Before fix:
┌─────────────┐
│  Component  │  ← Original position
└─────────────┘

User drags left handle further left, hitting min size:
    ┌──┐         ← Component drifts left (wrong!)
    │  │
    └──┘

After fix:
┌─────────────┐
│  Component  │  ← Original position
└─────────────┘

User drags left handle further left, hitting min size:
          ┌──┐  ← Right edge stays fixed (correct!)
          │  │
          └──┘
```

## Related Files
- `src/apps/faceplate-builder/components/BuilderCanvas.vue` (resize logic)
- `src/apps/faceplate-builder/constants.ts` (minimum size constants)

## Notes
- This bug only affects west, north, northwest, northeast, and southwest handles
- East, south, and southeast handles work correctly because they don't need position adjustment
- The minimum size constants are 80px for width and 60px for height
