import type { ModelComponent, FieldBinding, FormulaBinding, UIModelEntity } from '../types';
import { useDataStore } from '@/stores/data';
import { evaluateFormula } from './FormulaParser';

// Map to track active notification subscriptions by component ID and property
const activeSubscriptions = new Map<string, Array<{ token: string, unsubscribe: () => Promise<any> }>>();

/**
 * Set up notifications for all data bindings in the model
 */
export async function setupModelBindings(model: UIModelEntity, onComponentUpdate: (component: ModelComponent) => void): Promise<void> {
  // Clean up any existing subscriptions first
  await cleanupAllSubscriptions();
  
  // Set up subscriptions for each component that has bindings
  for (const component of model.components) {
    await setupComponentBindings(component, onComponentUpdate);
  }
}

/**
 * Set up notifications for a single component
 */
export async function setupComponentBindings(
  component: ModelComponent, 
  onComponentUpdate: (component: ModelComponent) => void
): Promise<void> {
  const dataStore = useDataStore();
  
  // Clean up existing subscriptions for this component first
  await cleanupComponentSubscriptions(component.id);
  
  // Track subscriptions for this component
  const componentSubscriptions: Array<{ token: string, unsubscribe: () => Promise<any> }> = [];
  
  // Find all properties with direct entity field bindings
  if (component.entityBindings) {
    for (const [propName, binding] of Object.entries(component.entityBindings)) {
      try {
        const bindingParts = binding.split('.');
        if (bindingParts.length !== 2) {
          console.warn(`Invalid binding format for ${propName}: ${binding}`);
          continue;
        }
        
        const [entityType, fieldType] = bindingParts;
        
        // Register notification for this binding
        const subscription = await dataStore.notify(
          { entityType, fieldType },
          (notification) => {
            // When notification arrives, update the component property
            if (notification.current) {
              // Update the component property with the new value
              component.properties[propName] = notification.current.value;
              
              // Notify parent about the update
              onComponentUpdate(component);
            }
          }
        );
        
        componentSubscriptions.push(subscription);
      } catch (error) {
        console.error(`Error setting up binding for ${propName}:`, error);
      }
    }
  }
  
  // Handle formula bindings
  if (component.formulaBindings) {
    for (const [propName, formula] of Object.entries(component.formulaBindings)) {
      // We need to track values for all fields in the formula
      const fieldValues: Record<string, number> = {};
      const fieldSubscriptions: Array<{ token: string, unsubscribe: () => Promise<any> }> = [];
      
      // Create a helper function to re-evaluate the formula when any field changes
      const recalculateFormula = () => {
        try {
          const result = evaluateFormula(formula, fieldValues);
          component.properties[propName] = result;
          onComponentUpdate(component);
        } catch (error) {
          console.error(`Error evaluating formula for ${propName}:`, error);
        }
      };
      
      // Extract the entity fields referenced in the formula
      const fieldBindings = component.formulaBindings[propName];
      
      // Subscribe to each field in the formula
      if (Array.isArray(fieldBindings)) {
        for (const binding of fieldBindings) {
          try {
            const subscription = await dataStore.notify(
              { entityType: binding.entityType, fieldType: binding.fieldType },
              (notification) => {
                // Store the field value
                fieldValues[binding.fieldType] = parseFloat(notification.current?.value?.toString() || '0');
                
                // Re-evaluate the formula with updated values
                recalculateFormula();
              }
            );
            
            fieldSubscriptions.push(subscription);
          } catch (error) {
            console.error(`Error setting up formula binding for ${binding.fieldType}:`, error);
          }
        }
      }
      
      componentSubscriptions.push(...fieldSubscriptions);
    }
  }
  
  // Store all subscriptions for this component
  if (componentSubscriptions.length > 0) {
    activeSubscriptions.set(component.id, componentSubscriptions);
  }
}

/**
 * Clean up subscriptions for a specific component
 */
export async function cleanupComponentSubscriptions(componentId: string): Promise<void> {
  const subscriptions = activeSubscriptions.get(componentId);
  
  if (subscriptions && subscriptions.length > 0) {
    // Unsubscribe from all notifications for this component
    await Promise.all(
      subscriptions.map(subscription => 
        subscription.unsubscribe().catch(err => 
          console.error(`Error unsubscribing from notification:`, err)
        )
      )
    );
    
    // Remove from our tracking map
    activeSubscriptions.delete(componentId);
  }
}

/**
 * Clean up all active subscriptions
 */
export async function cleanupAllSubscriptions(): Promise<void> {
  const allComponentIds = [...activeSubscriptions.keys()];
  
  // Clean up each component's subscriptions
  await Promise.all(
    allComponentIds.map(componentId => cleanupComponentSubscriptions(componentId))
  );
  
  // Clear the map to be safe
  activeSubscriptions.clear();
}

/**
 * Update a binding for a component
 */
export async function updateComponentBinding(
  component: ModelComponent,
  propertyName: string,
  binding: string,
  onComponentUpdate: (component: ModelComponent) => void
): Promise<void> {
  // Ensure entityBindings object exists
  if (!component.entityBindings) {
    component.entityBindings = {};
  }
  
  // Update the binding
  component.entityBindings[propertyName] = binding;
  
  // Re-setup bindings for this component
  await setupComponentBindings(component, onComponentUpdate);
}

/**
 * Update a formula binding for a component
 */
export async function updateComponentFormula(
  component: ModelComponent,
  propertyName: string,
  formula: string,
  entityFields: { entityType: string, fieldType: string }[],
  onComponentUpdate: (component: ModelComponent) => void
): Promise<void> {
  // Ensure formulaBindings object exists
  if (!component.formulaBindings) {
    component.formulaBindings = {};
  }
  
  // Update the formula
  component.formulaBindings[propertyName] = formula;
  
  // Re-setup bindings for this component
  await setupComponentBindings(component, onComponentUpdate);
}
