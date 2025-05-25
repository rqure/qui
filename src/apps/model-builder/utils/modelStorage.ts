import type { ModelConfig } from './modelTypes';
import { ValueFactories, ValueType } from '@/core/data/types';

/**
 * Export a model configuration to JSON string
 * @param model The model configuration to export
 * @returns JSON string representation of the model
 */
export function exportModelToJSON(model: ModelConfig): string {
  try {
    return JSON.stringify(model, null, 2);
  } catch (err) {
    console.error('Error exporting model to JSON:', err);
    throw new Error('Failed to export model to JSON');
  }
}

/**
 * Import a model configuration from JSON string
 * @param jsonData JSON string representation of the model
 * @returns Parsed ModelConfig object or null if invalid
 */
export function importModelFromJSON(jsonData: string): ModelConfig | null {
  try {
    const parsed = JSON.parse(jsonData);
    
    // Validate that the parsed data has the required fields for a ModelConfig
    if (
      !parsed ||
      typeof parsed.name !== 'string' ||
      typeof parsed.width !== 'number' ||
      typeof parsed.height !== 'number' ||
      !Array.isArray(parsed.shapes)
    ) {
      console.error('Invalid model data structure');
      return null;
    }
    
    // Ensure version is present
    if (!parsed.version) {
      parsed.version = '1.0';
    }
    
    return parsed as ModelConfig;
  } catch (err) {
    console.error('Error importing model from JSON:', err);
    return null;
  }
}

/**
 * Creates a thumbnail preview image for a model
 * @param model The model configuration
 * @returns Base64 encoded image data URL
 */
export async function createModelThumbnail(model: ModelConfig): Promise<string> {
  // This is a placeholder implementation
  // In a real application, this would render the model to a canvas
  // and generate a thumbnail image
  
  // For now, we'll just return a basic SVG as a data URL
  const svgContent = `
    <svg xmlns="http://www.w3.org/2000/svg" width="150" height="100" viewBox="0 0 150 100">
      <rect width="150" height="100" fill="${model.background || '#1e1e1e'}" />
      ${model.shapes.slice(0, 10).map(shape => {
        if (shape.type === 'rect') {
          return `<rect x="${shape.x * 0.2}" y="${shape.y * 0.2}" width="${(shape.width || 0) * 0.2}" height="${(shape.height || 0) * 0.2}" fill="${shape.fill || '#ffffff'}" stroke="${shape.stroke || '#000000'}" stroke-width="${shape.strokeWidth || 1}" />`;
        } else if (shape.type === 'circle') {
          return `<circle cx="${shape.x * 0.2}" cy="${shape.y * 0.2}" r="${((shape.width || 0) / 2) * 0.2}" fill="${shape.fill || '#ffffff'}" stroke="${shape.stroke || '#000000'}" stroke-width="${shape.strokeWidth || 1}" />`;
        } else if (shape.type === 'line' && shape.points) {
          return `<line x1="${shape.points[0] * 0.2}" y1="${shape.points[1] * 0.2}" x2="${shape.points[2] * 0.2}" y2="${shape.points[3] * 0.2}" stroke="${shape.stroke || '#000000'}" stroke-width="${shape.strokeWidth || 1}" />`;
        } else if (shape.type === 'text') {
          return `<text x="${shape.x * 0.2}" y="${shape.y * 0.2}" fill="${shape.fill || '#ffffff'}" font-family="${shape.fontFamily || 'Arial'}" font-size="${(shape.fontSize || 12) * 0.2}">Text</text>`;
        }
        return '';
      }).join('')}
    </svg>
  `;
  
  // Convert SVG to a data URL
  const encoded = btoa(svgContent);
  return `data:image/svg+xml;base64,${encoded}`;
}

/**
 * Validates a model configuration for correctness
 * @param model The model configuration to validate
 * @returns Object with validation result and errors
 */
export function validateModel(model: ModelConfig): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check required properties
  if (!model.name) {
    errors.push('Model name is required');
  }
  
  if (!model.width || model.width <= 0) {
    errors.push('Model width must be a positive number');
  }
  
  if (!model.height || model.height <= 0) {
    errors.push('Model height must be a positive number');
  }
  
  // Validate each shape
  model.shapes.forEach((shape, index) => {
    if (!shape.id) {
      errors.push(`Shape at index ${index} is missing an id`);
    }
    
    if (!shape.type) {
      errors.push(`Shape at index ${index} is missing a type`);
    }
    
    // Type-specific validations
    switch (shape.type) {
      case 'rect':
        if (shape.width === undefined || shape.width <= 0) {
          errors.push(`Rectangle shape (id: ${shape.id}) must have a positive width`);
        }
        if (shape.height === undefined || shape.height <= 0) {
          errors.push(`Rectangle shape (id: ${shape.id}) must have a positive height`);
        }
        break;
      
      case 'circle':
        if (shape.width === undefined || shape.width <= 0) {
          errors.push(`Circle shape (id: ${shape.id}) must have a positive diameter (width)`);
        }
        break;
        
      case 'line':
      case 'arrow':
        if (!shape.points || shape.points.length < 4) {
          errors.push(`Line/arrow shape (id: ${shape.id}) must have points array with at least 4 values`);
        }
        break;
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Save a model to a UIModel entity
 * @param dataStore Reference to the data store
 * @param model The model configuration to save
 * @param modelId Optional ID of an existing model entity to update
 * @returns The ID of the saved model entity
 */
export async function saveModelToEntity(
  dataStore: any,
  model: ModelConfig,
  modelId?: string
): Promise<string> {
  try {
    // Export model to JSON
    const modelJson = exportModelToJSON(model);
    
    // Generate a thumbnail
    const thumbnail = await createModelThumbnail(model);
    
    if (modelId) {
      // Update existing entity fields
      const nameField = dataStore.field(modelId, "Name");
      nameField.value = ValueFactories.newString(model.name);
      
      const descField = dataStore.field(modelId, "Description");
      descField.value = ValueFactories.newString(`Model: ${model.name} (${model.width}x${model.height})`);
      
      const lastModifiedField = dataStore.field(modelId, "LastModified");
      lastModifiedField.value = ValueFactories.newTimestamp(new Date());
      
      // Update fields in database
      await dataStore.write([nameField, descField, lastModifiedField]);
      
      // Update the configuration file as binary data
      const configField = dataStore.field(modelId, "ConfigurationFile");
      configField.value = ValueFactories.newBinaryFile(modelJson);
      await dataStore.write([configField]);
      
      // Update thumbnail
      const thumbnailField = dataStore.field(modelId, "Thumbnail");
      thumbnailField.value = ValueFactories.newBinaryFile(thumbnail);
      await dataStore.write([thumbnailField]);
      
      return modelId;
    } else {
      // Create new entity - first we need to create the UIModel entity itself
      const entityResponse = await dataStore.createEntity("UIModel", "", model.name);
      const newEntityId = entityResponse.id;
      
      // Set the name field
      const nameField = dataStore.field(newEntityId, "Name");
      nameField.value = ValueFactories.newString(model.name);
      
      // Set description field
      const descField = dataStore.field(newEntityId, "Description");
      descField.value = ValueFactories.newString(`Model: ${model.name} (${model.width}x${model.height})`);
      
      // Set creation and modified dates
      const createdField = dataStore.field(newEntityId, "CreatedDate");
      createdField.value = ValueFactories.newTimestamp(new Date());
      
      const modifiedField = dataStore.field(newEntityId, "LastModified");
      modifiedField.value = ValueFactories.newTimestamp(new Date());
      
      // Write basic fields
      await dataStore.write([nameField, descField, createdField, modifiedField]);
      
      // Set the configuration file as binary data
      const configField = dataStore.field(newEntityId, "ConfigurationFile");
      configField.value = ValueFactories.newBinaryFile(modelJson);
      await dataStore.write([configField]);
      
      // Set thumbnail
      const thumbnailField = dataStore.field(newEntityId, "Thumbnail");
      thumbnailField.value = ValueFactories.newBinaryFile(thumbnail);
      await dataStore.write([thumbnailField]);
      
      return newEntityId;
    }
  } catch (err) {
    console.error('Error saving model to entity:', err);
    throw new Error('Failed to save model to entity: ' + (err as Error).message);
  }
}

/**
 * Load a model from a UIModel entity
 * @param dataStore Reference to the data store
 * @param modelId The ID of the model entity to load
 * @returns The loaded model configuration or null if not found
 */
export async function loadModelFromEntity(
  dataStore: any,
  modelId: string
): Promise<ModelConfig | null> {
  try {
    // Get the configuration file field
    const configField = dataStore.field(modelId, "ConfigurationFile");
    
    // Read the field from database
    await dataStore.read([configField]);
    
    if (!configField.value) {
      console.error('Model configuration file not found');
      return null;
    }
    
    // Get the binary data value
    let jsonData: string;
    
    // Handle different ways the binary data might be returned
    if (configField.value.type === ValueType.BinaryFile) {
      jsonData = configField.value.getBinaryFile();
    } else if (typeof configField.value.raw === 'string') {
      jsonData = configField.value.raw;
    } else {
      console.error('Invalid configuration file format');
      return null;
    }
    
    // Parse the JSON data
    return importModelFromJSON(jsonData);
  } catch (err) {
    console.error('Error loading model from entity:', err);
    return null;
  }
}
