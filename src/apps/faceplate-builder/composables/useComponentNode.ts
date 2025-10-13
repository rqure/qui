import { computed } from 'vue';
import type { CanvasComponent } from '../components/FaceplateCanvas.vue';

export function useComponentNode(props: {
  component: CanvasComponent;
  editMode: boolean;
  parentVisible: boolean;
  parentOpacity: number;
  isInsideContainer: boolean;
  dropTargetContainerId: string | number | null;
}) {
  const isContainerType = computed(() => {
    return props.component.type === 'primitive.container' || props.component.type === 'primitive.container.tabs';
  });

  const isDropTarget = computed(() => {
    return isContainerType.value && props.dropTargetContainerId === props.component.id;
  });

  // Check if this component should be visible (cascades from parent)
  const isVisible = computed(() => {
    if (!props.parentVisible) return false;
    // Check if component has visible property (for containers and other components)
    const visible = props.component.config?.visible ?? true;
    // Also check bindings if present
    if (props.component.bindings?.visible !== undefined) {
      return props.component.bindings.visible && visible;
    }
    return visible;
  });

  // Calculate effective opacity (cascades from parent)
  const effectiveOpacity = computed(() => {
    const componentOpacity = Number(props.component.config?.opacity) || 1;
    const bindingOpacity = Number(props.component.bindings?.opacity) || 1;
    return props.parentOpacity * componentOpacity * bindingOpacity;
  });

  const componentStyle = computed(() => {
    // If inside a container (in runtime/view mode), don't use absolute positioning
    // Let flexbox handle it
    if (props.isInsideContainer && !props.editMode) {
      const style: Record<string, any> = {
        width: `${props.component.size.x}px`,
        height: `${props.component.size.y}px`,
        // Don't set position - let it be default (static) for flexbox
      };
      if (effectiveOpacity.value !== 1) {
        style.opacity = effectiveOpacity.value;
      }
      return style;
    }

    // Top-level components or edit mode use absolute positioning
    const baseStyle: Record<string, any> = {
      position: 'absolute',
      left: `${props.component.position.x}px`,
      top: `${props.component.position.y}px`,
      width: `${props.component.size.x}px`,
      height: `${props.component.size.y}px`,
    };

    if (effectiveOpacity.value !== 1) {
      baseStyle.opacity = effectiveOpacity.value;
    }
    return baseStyle;
  });

  return {
    isContainerType,
    isDropTarget,
    isVisible,
    effectiveOpacity,
    componentStyle,
  };
}