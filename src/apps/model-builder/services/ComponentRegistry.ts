import { markRaw, defineAsyncComponent } from 'vue';

// Import component renderers using defineAsyncComponent for lazy loading
const Rectangle = defineAsyncComponent(() => import('../components/renderers/RectangleRenderer.vue'));
const Circle = defineAsyncComponent(() => import('../components/renderers/CircleRenderer.vue'));
const Text = defineAsyncComponent(() => import('../components/renderers/TextRenderer.vue'));
const Gauge = defineAsyncComponent(() => import('../components/renderers/GaugeRenderer.vue'));
const BarIndicator = defineAsyncComponent(() => import('../components/renderers/BarIndicatorRenderer.vue'));
const StatusIndicator = defineAsyncComponent(() => import('../components/renderers/StatusIndicatorRenderer.vue'));
const Button = defineAsyncComponent(() => import('../components/renderers/ButtonRenderer.vue'));
const Switch = defineAsyncComponent(() => import('../components/renderers/SwitchRenderer.vue'));

// More renderers could be imported here

// Default renderer for components that don't have a specific renderer
const DefaultRenderer = defineAsyncComponent(() => import('../components/renderers/DefaultRenderer.vue'));

// Registry mapping component types to their renderer components
export const componentRegistry: Record<string, any> = {
  Rectangle: markRaw(Rectangle),
  Circle: markRaw(Circle),
  Text: markRaw(Text),
  Gauge: markRaw(Gauge),
  BarIndicator: markRaw(BarIndicator),
  StatusIndicator: markRaw(StatusIndicator),
  Button: markRaw(Button),
  Switch: markRaw(Switch),
  
  // Add more renderers here as they are created
  
  // Add a getter that returns the default renderer for unknown components
  get default() {
    return markRaw(DefaultRenderer);
  }
};

// Function to get a component renderer, falling back to the default if not found
export function getComponentRenderer(type: string): any {
  return componentRegistry[type] || componentRegistry.default;
}
