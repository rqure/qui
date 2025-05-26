import { v4 as uuidv4 } from 'uuid';
import type { UIModelEntity, ModelComponent, ModelConfig, FieldBinding, FormulaBinding } from '../types';
import type { EntityId, FieldType, Entity } from '@/core/data/types';
import { EntityFactories, ValueFactories } from '@/core/data/types';
import { useDataStore } from '@/stores/data';

export class ModelManager {
  private dataStore: ReturnType<typeof useDataStore>;
  private models: UIModelEntity[] = [];
  private activeEntityBindings: Map<string, { subscription: any, fields: FieldBinding[] }> = new Map();
  private activeFormulaBindings: Map<string, { subscription: any, formula: FormulaBinding }> = new Map();

  constructor() {
    this.dataStore = useDataStore();
  }

  /**
   * Load all available models from the database
   */
  async loadModels(): Promise<UIModelEntity[]> {
    try {
      // Search for all UIModel entities in the database
      console.log('Loading models from the database...');
      const entities: Entity[] = await this.dataStore.find('UIModel');
      console.log(`Found ${entities.length} models in the database.`);
      
      // Convert entities to UIModelEntity objects
      this.models = entities.map(entity => this.entityToModel(entity));
      
      return this.models;
    } catch (error) {
      console.error('Failed to load models:', error);
      throw new Error(`Failed to load models: ${error}`);
    }
  }

  /**
   * Load a specific model by ID
   */
  async loadModel(modelId: EntityId): Promise<UIModelEntity> {
    try {
      // Check if the model already exists in our cache
      let cachedModel = this.models.find(m => m.id === modelId);
      
      if (!cachedModel) {
        // Fetch the entity from the database
        const entity = EntityFactories.newEntity(modelId);
        
        if (!entity) {
          throw new Error(`Model with ID ${modelId} not found`);
        }
        
        cachedModel = this.entityToModel(entity);
        this.models.push(cachedModel);
      }
      
      // Parse the configuration file to get the components
      if (cachedModel.configurationFile) {
        try {
          const config = JSON.parse(cachedModel.configurationFile);
          cachedModel.components = config.components || [];
          cachedModel.width = config.width || 1920;
          cachedModel.height = config.height || 1080;
        } catch (parseError) {
          console.error('Failed to parse configuration file:', parseError);
          cachedModel.components = [];
          cachedModel.width = 1920;
          cachedModel.height = 1080;
        }
      } else {
        cachedModel.components = [];
        cachedModel.width = 1920;
        cachedModel.height = 1080;
      }
      
      return cachedModel;
    } catch (error) {
      console.error('Failed to load model:', error);
      throw new Error(`Failed to load model: ${error}`);
    }
  }

  /**
   * Save a model to the database
   */
  async saveModel(model: UIModelEntity): Promise<boolean> {
    try {
      // Convert model components and settings to JSON
      const config: ModelConfig = {
        id: model.id,
        name: model.name,
        components: model.components,
        width: model.width,
        height: model.height,
      };
      
      const configJson = JSON.stringify(config);
      
      // Fetch the entity from the database
      const entity = EntityFactories.newEntity(model.id);
      
      if (!entity) {
        throw new Error(`Model with ID ${model.id} not found`);
      }
      
      // Update entity fields
      entity.field('Name').value = ValueFactories.newString(model.name);
      entity.field('ConfigurationFile').value = ValueFactories.newString(configJson);

      // Add description if available
      if (model.description !== undefined) {
        entity.field('Description').value = ValueFactories.newString(model.description);
      }
      
      // Write the entity back to the database
      await this.dataStore.write([entity.field('Name'), entity.field('ConfigurationFile')]);
      
      return true;
    } catch (error) {
      console.error('Failed to save model:', error);
      throw new Error(`Failed to save model: ${error}`);
    }
  }

  /**
   * Create a new model in the database
   */
  async createModel(name: string): Promise<UIModelEntity> {
    try {
      const folders = await this.dataStore.find(
        'Folder',
        ["Name"],
        (entity: Entity) => entity.field('Name').value.getString() === 'UI Models');

      let folder: Entity | undefined;
      
      if (folders.length === 0) {
        const root = await this.dataStore.find("Root", []);
        if (root.length === 0) {
          throw new Error('Root not found');
        }

        folder = await this.dataStore.createEntity(
          root[0].entityId,
          'Folder',
          'UI Models'
        );
      } else {
        folder = folders[0];
      }

      // Create a new entity in the database
      const entity = await this.dataStore.createEntity(
        folder.entityId,
        'UIModel',
        name
      );
      
      // Initialize with empty configuration
      const config: ModelConfig = {
        id: entity.entityId,
        name,
        components: [],
        width: 1920,
        height: 1080
      };
      
      const configJson = JSON.stringify(config);
      
      // Set the configuration file field
      entity.field('ConfigurationFile').value = ValueFactories.newString(configJson);

      // Write the configuration to the database
      await this.dataStore.write([entity.field('ConfigurationFile')]);
      
      // Create a UIModelEntity object
      const model: UIModelEntity = {
        id: entity.entityId,
        name,
        components: [],
        width: 1920,
        height: 1080,
        lastModified: new Date()
      };
      
      // Add to model cache
      this.models.push(model);
      
      return model;
    } catch (error) {
      console.error('Failed to create model:', error);
      throw new Error(`Failed to create model: ${error}`);
    }
  }

  /**
   * Delete a model from the database
   */
  async deleteModel(modelId: string): Promise<boolean> {
    try {
      // Delete the entity from the database
      await this.dataStore.deleteEntity(modelId);
      
      // Remove from model cache
      this.models = this.models.filter(m => m.id !== modelId);
      
      return true;
    } catch (error) {
      console.error('Failed to delete model:', error);
      throw new Error(`Failed to delete model: ${error}`);
    }
  }

  /**
   * Create a new component instance
   */
  createComponent(componentType: string): ModelComponent {
    return {
      id: uuidv4(),
      type: componentType,
      x: 100,
      y: 100,
      width: 200,
      height: 150,
      z: 1,
      properties: {}
    };
  }

  /**
   * Update a binding between a component property and a database field
   */
  async updateBinding(component: ModelComponent, binding: string): Promise<void> {
    // Parse binding string (format: entityType.fieldType)
    const parts = binding.split('.');
    if (parts.length !== 2) {
      console.error('Invalid binding format:', binding);
      return;
    }
    
    const entityType = parts[0];
    const fieldType = parts[1];
    
    // Set up a notification subscription for this binding
    const bindingKey = `${component.id}:${binding}`;
    
    // Clean up existing subscription if any
    if (this.activeEntityBindings.has(bindingKey)) {
      const existingBinding = this.activeEntityBindings.get(bindingKey);
      if (existingBinding?.subscription?.unsubscribe) {
        await existingBinding.subscription.unsubscribe();
      }
      this.activeEntityBindings.delete(bindingKey);
    }
    
    // Create a new subscription
    try {
      const config = {
        entityType,
        fieldType
      };
      
      const subscription = await this.dataStore.notify(
        config,
        (notification: any) => this.handleFieldNotification(notification, component)
      );
      
      // Store the subscription for later cleanup
      this.activeEntityBindings.set(bindingKey, {
        subscription,
        fields: [{
          entityType,
          fieldType,
          propertyName: 'value' // Default property name
        }]
      });
    } catch (error) {
      console.error('Failed to set up binding notification:', error);
    }
  }

  /**
   * Handle a notification from the database for a bound field
   */
  private handleFieldNotification(notification: any, component: ModelComponent): void {
    // Extract the field value from the notification
    if (!notification.current) return;
    
    // Update the component property based on the field value
    const value = notification.current.value;
    if (value) {
      // Find the property name for this binding
      const fieldType = notification.current.fieldType;
      const entityType = notification.current?.entityId?.split('$')[0];
      
      // Look for binding in our map
      for (const [key, binding] of this.activeEntityBindings.entries()) {
        if (key.startsWith(component.id)) {
          const matchingField = binding.fields.find(f => 
            f.fieldType === fieldType && f.entityType === entityType
          );
          
          if (matchingField) {
            // Update the component property
            component.properties[matchingField.propertyName] = value;
            break;
          }
        }
      }
    }
  }

  /**
   * Convert a database entity to a UIModelEntity
   */
  private entityToModel(entity: Entity): UIModelEntity {
    const nameField = entity.field('Name');
    const configField = entity.field('ConfigurationFile');
    const descField = entity.field('Description');
    
    return {
      id: entity.entityId,
      name: nameField.value.getString(),
      description: descField?.value?.getString(),
      configurationFile: configField.value.getString(),
      components: [],
      width: 1920,
      height: 1080,
      lastModified: new Date()
    };
  }
}
