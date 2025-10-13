# Bug #7: Resize Handles Don't Work Properly for Components

## Severity
**High** - Multiple critical issues make resizing components nearly unusable in many scenarios.

## Description
The resize handle system has several fundamental problems that make it broken in common use cases:

1. **Resize changes don't visually update the component** - Dragging resize handles updates the internal node data but the rendered component doesn't reflect the changes during the drag operation
2. **Resize handles misaligned for child components** - When a component is inside a container, the resize handles appear at the wrong position (based on stored position) while the actual component is rendered elsewhere (based on calculated layout position)
3. **Position drift with minimum size constraints** - When resizing from west/north handles and hitting minimum size, the position continues updating while size is clamped, causing drift

These issues combine to make resizing feel broken and unpredictable.

## Locations

### Issue 1: No Visual Update During Resize
File: `src/apps/faceplate-builder/components/BuilderCanvas.vue`
Lines: 459-507 (resize handling in `handlePointerMove`)

### Issue 2: Misaligned Handles for Children  
File: `src/apps/faceplate-builder/components/BuilderCanvas.vue`
Lines: 904-927 (resize handle positioning)

### Issue 3: Position Drift with Min Size
File: `src/apps/faceplate-builder/components/BuilderCanvas.vue`
Lines: 469-482 (position calculation during resize)

## Problem Details

### Issue 1: No Visual Update During Resize

**Root Cause:** During resize, the code emits `node-resized` and `nodes-updated` events which update the internal `nodes` array. However, the visual component doesn't re-render during the drag because:

1. The resize happens in `handlePointerMove` (lines 459-507)
2. It emits events that update the parent's `nodes` array
3. But the component rendering likely doesn't react to these changes synchronously
4. The user sees the resize handles moving but the actual component stays the same size

**Code Flow:**
```typescript
// BuilderCanvas.vue - handlePointerMove
emit('nodes-updated', [{ nodeId, position: snappedPos }]);
emit('node-resized', { nodeId, size: snappedSize });

// FaceplateBuilderApp.vue - handleNodeResized
function handleNodeResized(payload: { nodeId: string; size: Vector2 }) {
  nodes.value = nodes.value.map((node) =>
    node.id === payload.nodeId
      ? { ...node, size: { ...payload.size } }
      : node,
  );
}
```

The nodes array is updated, but the rendered component doesn't visually change until pointer up.

### Issue 2: Misaligned Handles for Child Components

**Root Cause:** Resize handles are positioned using `node.position`, but child components are rendered at calculated layout positions.

```typescript
// BuilderCanvas.vue - lines 910-914
:style="{
  left: `${node.position.x * zoom + pan.x}px`,  // ❌ Uses stored position
  top: `${node.position.y * zoom + pan.y}px`,
  width: `${node.size.x * zoom}px`,
  height: `${node.size.y * zoom}px`,
}"
```

But child components are rendered with positions calculated by `calculateChildLayout`:

```typescript
// FaceplateCanvas.vue / ComponentNode.vue
function calculateChildLayout(container, children) {
  // Calculates positions based on layout direction, padding, gap
  return children.map(child => {
    const position = { x: currentX, y: currentY };  // New position!
    return { ...child, position };
  });
}
```

**Example:**
- Node stored position: `{ x: 40, y: 40 }`
- Container calculates child at: `{ x: 16, y: 16 }` (padding offset)
- Resize handles appear at (40, 40) but component renders at (16, 16) inside container
- Result: Handles are completely misaligned!

### Issue 3: Position Drift with Minimum Size Constraints

**Root Cause:** When resizing from west/north handles and minimum size is hit:

```typescript
// Lines 469-482
if (handle.includes('w')) {
  newPos.x = originalPosition.x + deltaX;  // ❌ Position always updates
  newSize.x = Math.max(80, originalSize.x - deltaX);  // But size is clamped
}
if (handle.includes('n')) {
  newPos.y = originalPosition.y + deltaY;  // ❌ Position always updates
  newSize.y = Math.max(60, originalSize.y - deltaY);  // But size is clamped
}
```

When size is clamped to minimum but position continues to update, the component drifts away from the resize handle.

**Example:**
1. Component at x=100, width=200
2. User drags west handle left by 150px (deltaX = -150)
3. Size calculation: `Math.max(80, 200 - (-150))` = 350 → clamped to 80
4. Position update: `100 + (-150)` = -50 (still updates!)
5. Component moves to x=-50 with width=80 instead of keeping right edge fixed

## Expected Behavior

1. **Visual Feedback:** Component should visually resize in real-time as the user drags the handle
2. **Correct Handle Positioning:** Resize handles should always appear at the edges of the actually rendered component, accounting for parent container layouts
3. **No Position Drift:** When minimum size is reached, the opposite edge should stay fixed (right edge for west handle, bottom edge for north handle)

## Suggested Fixes

### Fix 1: Immediate Visual Feedback

The component needs to update visually during resize, not just when pointer is released. Options:

**Option A: Direct DOM Manipulation (Quick Fix)**
Update the component's DOM element directly during resize for immediate feedback:

```typescript
// In handlePointerMove, after calculating snappedSize
const componentElement = document.querySelector(`[data-component-id="${nodeId}"]`);
if (componentElement) {
  componentElement.style.width = `${snappedSize.x}px`;
  componentElement.style.height = `${snappedSize.y}px`;
  if (snappedPos.x !== originalPosition.x || snappedPos.y !== originalPosition.y) {
    componentElement.style.left = `${snappedPos.x}px`;
    componentElement.style.top = `${snappedPos.y}px`;
  }
}
```

**Option B: Reactive Approach (Better)**
Create a reactive `resizingNodeData` state that overlays during active resize:

```typescript
const resizingNodeData = ref<{ nodeId: string; size: Vector2; position: Vector2 } | null>(null);

// During resize
resizingNodeData.value = { nodeId, size: snappedSize, position: snappedPos };

// In template, use resizingNodeData for the component being resized
// On pointer up, clear resizingNodeData
```

### Fix 2: Calculate Absolute Position for Child Components

Resize handles need to account for parent container offsets:

```typescript
// New function to calculate absolute position
function getAbsolutePosition(node: CanvasNode): Vector2 {
  if (!node.parentId) {
    return node.position;
  }
  
  // Find parent
  const parent = props.nodes.find(n => n.id === node.parentId);
  if (!parent) {
    return node.position;
  }
  
  // Get parent's absolute position
  const parentAbsPos = getAbsolutePosition(parent);
  
  // Calculate child's layout position within parent
  const parentChildren = props.nodes.filter(n => n.parentId === node.parentId);
  const childIndex = parentChildren.findIndex(n => n.id === node.id);
  
  // Replicate container layout logic
  const config = parent.props || {};
  const padding = Number(config.padding) || 16;
  const gap = Number(config.gap) || 12;
  const direction = config.layoutDirection === 'horizontal' ? 'horizontal' : 'vertical';
  
  let offsetX = padding;
  let offsetY = padding;
  
  // Calculate position based on siblings before this one
  for (let i = 0; i < childIndex; i++) {
    const sibling = parentChildren[i];
    if (direction === 'horizontal') {
      offsetX += sibling.size.x + gap;
    } else {
      offsetY += sibling.size.y + gap;
    }
  }
  
  return {
    x: parentAbsPos.x + offsetX,
    y: parentAbsPos.y + offsetY,
  };
}

// Use in resize handles positioning
const absolutePos = getAbsolutePosition(node);
:style="{
  left: `${absolutePos.x * zoom + pan.x}px`,
  top: `${absolutePos.y * zoom + pan.y}px`,
  // ...
}"
```

### Fix 3: Position Drift Correction

Keep opposite edge fixed when minimum size is reached:

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

### Comprehensive Solution

For a complete fix, all three issues need to be addressed:

1. Implement immediate visual feedback (Fix 1)
2. Calculate absolute positions for handle placement (Fix 2)
3. Fix position drift with min size (Fix 3)
4. **Bonus:** Consider disabling resize for child components or showing a warning, since resizing children breaks the container's layout calculation

## Impact
- **High**: Resize functionality is fundamentally broken in multiple ways
- Issue 1 makes it impossible to see resize results until drag completes (no feedback)
- Issue 2 makes resizing child components unusable (handles in wrong place)
- Issue 3 causes unpredictable behavior when size limits are hit
- Users will struggle to resize components accurately
- Severely affects builder usability and perceived quality

## Steps to Reproduce

### Issue 1: No Visual Update
1. Open faceplate builder
2. Create a component
3. Start dragging a resize handle
4. **Bug:** Component doesn't change size during drag, only when you release

### Issue 2: Misaligned Handles for Children
1. Create a container component (panel or tabs)
2. Add a child component inside the container
3. Select the child component
4. **Bug:** Resize handles appear at wrong position (not at component edges)
5. The handles are offset from where the component actually renders

### Issue 3: Position Drift
1. Create a component
2. Resize from west handle, dragging far enough to hit minimum width (80px)
3. Continue dragging left
4. **Bug:** Component drifts left away from handle instead of staying fixed

## Visual Demonstration

### Issue 2: Misaligned Handles
```
Container at (100, 100) with padding=16
Child stored position: (40, 40)
Child rendered position: (116, 116)  [container x + padding]

Resize handles appear at: (40, 40)   ❌ WRONG
Component renders at:     (116, 116) ✓ Actual position

Result: Handles are 76px away from component!
```

### Issue 3: Position Drift
```
Before: Component at x=100, width=200
         ┌──────────────────────┐
         │                      │
         └──────────────────────┘
         100                    300

User drags west handle left (min width = 80):
    ┌──┐                            ← Drifts to x=-50 ❌
    │  │
    └──┘
   -50  30

Should be:
                     ┌──┐           ← Should stay at x=220 ✓
                     │  │            (right edge fixed)
                     └──┘
                    220 300
```

## Related Files
- `src/apps/faceplate-builder/components/BuilderCanvas.vue` (resize logic, handle positioning)
- `src/apps/faceplate-builder/components/FaceplateCanvas.vue` (child layout calculation)
- `src/apps/faceplate-builder/components/ComponentNode.vue` (child positioning)
- `src/apps/faceplate-builder/composables/useComponentNode.ts` (component style calculation)
- `src/apps/faceplate-builder/FaceplateBuilderApp.vue` (resize event handlers)
- `src/apps/faceplate-builder/constants.ts` (minimum size constants)

## Notes
- **Critical Design Issue:** Resizing child components conflicts with container layout logic. When a child is resized, the container should recalculate layout, but currently both systems operate independently.
- The minimum size constants are 80px for width and 60px for height
- Position drift (Issue 3) only affects west, north, northwest, northeast, and southwest handles
- East, south, and southeast handles don't have position drift because they don't move the origin

## Potential Design Decision Needed
Should child components be resizable at all? When a child of a container is manually resized, it breaks the automatic layout. Options:
1. Disable resize handles for child components (simplest)
2. Make resize update both the component size AND the container's layout (complex)
3. Allow resize but show warning that it will break out of container layout
4. Implement a "manual layout" mode for containers where children can be freely positioned/sized
