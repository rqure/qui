import type { BindingConfig } from './modelTypes';
import type { EntityId } from '@/core/data/types';

/**
 * Subscribe to entity field changes for binding updates
 * 
 * @param dataStore Reference to the data store
 * @param bindings Dictionary of bindings
 * @returns Array of subscription tokens for cleanup
 */
export async function subscribeToBindings(
  dataStore: any, 
  bindings: Record<string, BindingConfig>
): Promise<Array<{ token: string; unsubscribe: () => Promise<boolean> }>> {
  const subscriptions = [];
  
  for (const [bindingKey, binding] of Object.entries(bindings)) {
    try {
      // Subscribe to the field updates
      const subscription = await dataStore.subscribeToField(
        binding.entityId,
        binding.fieldName,
        (notification: any) => {
          // This callback will be called when the field value changes
          console.log(`Field update for binding ${bindingKey}:`, notification);
          // The handler for applying updates will need to be implemented
          // in the component using this utility
        }
      );
      
      subscriptions.push(subscription);
    } catch (err) {
      console.error(`Failed to subscribe to binding ${bindingKey}:`, err);
    }
  }
  
  return subscriptions;
}

/**
 * Unsubscribe from all bindings when component unmounts
 * 
 * @param subscriptions Array of subscription objects with unsubscribe methods
 */
export async function unsubscribeFromBindings(
  subscriptions: Array<{ token: string; unsubscribe: () => Promise<boolean> }>
): Promise<void> {
  for (const subscription of subscriptions) {
    try {
      await subscription.unsubscribe();
    } catch (err) {
      console.error('Error unsubscribing from binding:', err);
    }
  }
}

/**
 * Process binding animations based on value changes
 * 
 * @param bindingKey Identifier for the binding (shapeId:property)
 * @param binding Binding configuration 
 * @param newValue The new value from the field update
 * @param updateCallback Callback to update the model
 */
export function processBindingAnimation(
  bindingKey: string,
  binding: BindingConfig,
  newValue: any,
  updateCallback: (shapeId: string, property: string, value: any) => void
): void {
  // Extract shape ID and property from binding key
  const [shapeId, property] = bindingKey.split(':');
  
  // Handle different animation types
  switch (binding.animation) {
    case 'none':
      // Direct update without animation
      updateCallback(shapeId, property, newValue);
      break;
      
    case 'fade':
      // Implement fade animation
      // This would use requestAnimationFrame or a tween library
      // For now, just do direct update
      updateCallback(shapeId, property, newValue);
      break;
      
    case 'flash':
      // Flash animation (e.g., for alerts)
      // For now, just do direct update
      updateCallback(shapeId, property, newValue);
      break;
      
    case 'tween':
      // Smooth transition between values
      // Would use requestAnimationFrame or a tween library
      updateCallback(shapeId, property, newValue);
      break;
      
    case 'spring':
      // Spring effect for numeric values
      updateCallback(shapeId, property, newValue);
      break;
      
    case 'typewriter':
      // Typewriter effect for text
      if (property === 'text' && typeof newValue === 'string') {
        // This would normally animate character by character
        updateCallback(shapeId, property, newValue);
      }
      break;
      
    default:
      // Default to direct update
      updateCallback(shapeId, property, newValue);
      break;
  }
}

/**
 * Apply initial binding values when loading a model
 * 
 * @param dataStore Reference to the data store
 * @param bindings Dictionary of bindings
 * @returns Object with shape property values from bindings
 */
export async function fetchInitialBindingValues(
  dataStore: any,
  bindings: Record<string, BindingConfig>
): Promise<Record<string, any>> {
  const values: Record<string, any> = {};
  
  for (const [bindingKey, binding] of Object.entries(bindings)) {
    try {
      // Fetch the current field value
      const field = await dataStore.getEntityField(
        binding.entityId,
        binding.fieldName
      );
      
      if (field && field.value) {
        // Store the value with the binding key
        values[bindingKey] = field.value;
      }
    } catch (err) {
      console.error(`Failed to fetch initial value for binding ${bindingKey}:`, err);
    }
  }
  
  return values;
}

/**
 * Extract bindings from a model configuration
 * 
 * @param model The model configuration
 * @returns Dictionary of binding configurations
 */
export function extractBindingsFromModel(model: any): Record<string, BindingConfig> {
  const bindings: Record<string, BindingConfig> = {};
  
  if (!model || !Array.isArray(model.shapes)) {
    return bindings;
  }
  
  model.shapes.forEach((shape: any) => {
    if (shape.properties) {
      for (const [propName, propConfig] of Object.entries(shape.properties)) {
        const typedPropConfig = propConfig as any;
        if (typedPropConfig.binding && 
            typedPropConfig.entityId && 
            typedPropConfig.fieldName) {
          const bindingKey = `${shape.id}:${propName}`;
          
          bindings[bindingKey] = {
            entityId: typedPropConfig.entityId,
            fieldName: typedPropConfig.fieldName,
            animation: typedPropConfig.animation || 'none'
          };
        }
      }
    }
  });
  
  return bindings;
}
