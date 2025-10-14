/**
 * FaceplateRenderer - Loads and renders faceplates from Store
 * 
 * This class:
 * 1. Loads faceplate configuration from Store
 * 2. Creates canvas and model from configuration
 * 3. Sets up FaceplateContext and CallbackManager
 * 4. Applies all callbacks to shapes
 * 5. Registers notification channels
 * 6. Executes initialization script
 */

import type { EntityId } from '@/core/data/types';
import { Canvas } from '@/core/canvas/canvas';
import { Model } from '@/core/canvas/model';
import { createShape } from '@/core/canvas/shapes';
import type { Drawable } from '@/core/canvas/shapes/base';
import type { FaceplateConfig, FaceplateShapeConfig, FaceplateRendererOptions } from '../types';
import { FaceplateContext } from './FaceplateContext';
import { CallbackManager } from './CallbackManager';

export class FaceplateRenderer {
  private containerId: string;
  private dataStore: any;
  private canvas: Canvas | null = null;
  private model: Model | null = null;
  private context: FaceplateContext | null = null;
  private callbackManager: CallbackManager | null = null;
  private faceplateId: EntityId | null = null;
  private targetEntityId: EntityId | null = null;
  
  constructor(options: FaceplateRendererOptions) {
    this.containerId = options.containerId;
    this.dataStore = options.dataStore;
  }
  
  // ============================================================
  // Loading and Rendering
  // ============================================================
  
  /**
   * Load and render a faceplate
   * 
   * @param faceplateId - Entity ID of the Faceplate entity
   * @param targetEntityId - Entity ID of the entity this faceplate is for
   */
  async loadFaceplate(faceplateId: EntityId, targetEntityId: EntityId): Promise<void> {
    try {
      console.log('Loading faceplate:', faceplateId, 'for target:', targetEntityId);
      
      // Clean up previous faceplate if any
      await this.destroy();
      
      this.faceplateId = faceplateId;
      this.targetEntityId = targetEntityId;
      
      // Step 1: Load configuration from Store
      const config = await this.loadConfiguration(faceplateId);
      console.log('Faceplate configuration loaded:', config);
      
      // Step 2: Create canvas
      this.canvas = this.createCanvas(config);
      console.log('Canvas created');
      
      // Step 3: Create model and shapes
      this.model = await this.createModel(config);
      console.log('Model created with', this.model.getShapes().length, 'shapes');
      
      // Step 4: Create context
      this.context = new FaceplateContext(
        this.model,
        this.canvas,
        targetEntityId,
        this.dataStore
      );
      console.log('FaceplateContext created');
      
      // Step 5: Create callback manager
      this.callbackManager = new CallbackManager(this.context);
      console.log('CallbackManager created');
      
      // Step 6: Apply callbacks to all shapes
      this.applyCallbacksToModel(this.model, config);
      console.log('Callbacks applied to shapes');
      
      // Step 7: Set up notification channels
      if (config.notificationChannels) {
        for (const channel of config.notificationChannels) {
          await this.callbackManager.setupNotificationChannel(channel);
        }
        console.log('Notification channels registered:', config.notificationChannels.length);
      }
      
      // Step 8: Draw model to canvas
      this.model.draw(this.canvas);
      console.log('Model drawn to canvas');
      
      // Step 9: Execute initialization script
      if (config.initScript) {
        await this.callbackManager.executeInitScript(config.initScript);
        console.log('Initialization script executed');
      }
      
      console.log('Faceplate loaded successfully');
      
    } catch (error) {
      console.error('Error loading faceplate:', error);
      await this.destroy();
      throw error;
    }
  }
  
  // ============================================================
  // Configuration Loading
  // ============================================================
  
  /**
   * Load faceplate configuration from Store
   */
  private async loadConfiguration(faceplateId: EntityId): Promise<FaceplateConfig> {
    // Get Configuration field type
    const configFieldType = await this.dataStore.getFieldType('Configuration');
    if (!configFieldType) {
      throw new Error('Configuration field type not found');
    }
    
    // Read Configuration field
    const [value, timestamp, writerId] = await this.dataStore.read(faceplateId, [configFieldType]);
    if (!value || !value.String) {
      throw new Error('Faceplate Configuration field is empty or not a string');
    }
    
    // Parse JSON
    const config: FaceplateConfig = JSON.parse(value.String);
    
    // Validate config
    if (!config.model) {
      throw new Error('Faceplate configuration missing model');
    }
    
    return config;
  }
  
  // ============================================================
  // Canvas Creation
  // ============================================================
  
  /**
   * Create canvas from configuration
   */
  private createCanvas(config: FaceplateConfig): Canvas {
    const canvas = new Canvas(this.containerId, {
      minZoom: config.model.minZoom ?? 0.5,
      maxZoom: config.model.maxZoom ?? 4,
      zoom: 1,
      canvasBackground: config.model.canvasBackground ?? '#1a1a1a'
    });
    
    // Set boundary if provided
    if (config.model.boundary) {
      canvas.setBoundary(config.model.boundary.from, config.model.boundary.to);
    }
    
    return canvas;
  }
  
  // ============================================================
  // Model and Shape Creation
  // ============================================================
  
  /**
   * Create model from configuration (recursive)
   */
  private async createModel(config: FaceplateConfig): Promise<Model> {
    const model = new Model();
    
    if (config.model.shapes) {
      for (const shapeConfig of config.model.shapes) {
        const shape = await this.createShapeFromConfig(shapeConfig);
        if (shape) {
          model.addShape(shape);
        }
      }
    }
    
    return model;
  }
  
  /**
   * Create a shape from configuration (recursive for nested models)
   */
  private async createShapeFromConfig(config: FaceplateShapeConfig): Promise<Drawable | null> {
    try {
      // Handle nested Model
      if (config.type === 'Model') {
        const model = new Model();
        if (config.shapes) {
          for (const childConfig of config.shapes) {
            const child = await this.createShapeFromConfig(childConfig);
            if (child) {
              model.addShape(child);
            }
          }
        }
        return model;
      }
      
      // Create shape from registry
      const shape = createShape(config.type);
      if (!shape) {
        console.warn(`Unknown shape type: ${config.type}`);
        return null;
      }
      
      // Apply configuration properties to shape
      this.applyShapeProperties(shape, config);
      
      return shape;
      
    } catch (error) {
      console.error(`Error creating shape of type ${config.type}:`, error);
      return null;
    }
  }
  
  /**
   * Apply configuration properties to a shape
   */
  private applyShapeProperties(shape: Drawable, config: FaceplateShapeConfig): void {
    // Transform properties
    if (config.location) shape.setLocation(config.location);
    if (config.rotation !== undefined) shape.setRotation(config.rotation);
    if (config.scale) shape.setScale(config.scale);
    if (config.pivot) shape.setPivot(config.pivot);
    if (config.offset) shape.setOffset(config.offset);
    
    // Zoom visibility
    if (config.minZoom !== undefined) shape.setMinZoom(config.minZoom);
    if (config.maxZoom !== undefined) shape.setMaxZoom(config.maxZoom);
    
    // Shape-specific properties (use fluent API if available)
    const shapeAny = shape as any;
    
    // Circle properties
    if (config.radius !== undefined && shapeAny.setRadius) {
      shapeAny.setRadius(config.radius);
    }
    if (config.fillColor && shapeAny.setFillColor) {
      shapeAny.setFillColor(config.fillColor);
    }
    if (config.fillOpacity !== undefined && shapeAny.setFillOpacity) {
      shapeAny.setFillOpacity(config.fillOpacity);
    }
    if (config.color && shapeAny.setColor) {
      shapeAny.setColor(config.color);
    }
    
    // Polygon/Polyline properties
    if (config.edges && shapeAny.setEdges) {
      shapeAny.setEdges(config.edges);
    }
    if (config.weight !== undefined && shapeAny.setWeight) {
      shapeAny.setWeight(config.weight);
    }
    
    // Text properties
    if (config.text && shapeAny.setText) {
      shapeAny.setText(config.text);
    }
    if (config.fontSize !== undefined && shapeAny.setFontSize) {
      shapeAny.setFontSize(config.fontSize);
    }
    if (config.direction && shapeAny.setDirection) {
      shapeAny.setDirection(config.direction);
    }
    
    // TODO: Add more shape-specific properties as needed (Div, Image, SvgText)
  }
  
  // ============================================================
  // Callback Application
  // ============================================================
  
  /**
   * Apply callbacks to all shapes in model (recursive)
   */
  private applyCallbacksToModel(model: Model, config: FaceplateConfig): void {
    if (!this.callbackManager || !config.model.shapes) return;
    
    const shapes = model.getShapes();
    
    for (let i = 0; i < shapes.length; i++) {
      const shape = shapes[i];
      const shapeConfig = config.model.shapes[i];
      
      if (shapeConfig) {
        this.applyCallbacksToShape(shape, shapeConfig);
      }
    }
  }
  
  /**
   * Apply callbacks to a single shape (recursive for nested models)
   */
  private applyCallbacksToShape(shape: Drawable, config: FaceplateShapeConfig): void {
    if (!this.callbackManager) return;
    
    // Apply handlers, methods, and context menu
    this.callbackManager.applyHandlers(shape, config);
    this.callbackManager.applyMethods(shape, config);
    this.callbackManager.applyContextMenu(shape, config);
    
    // Recursively apply to nested shapes
    if (shape instanceof Model && config.shapes) {
      const childShapes = shape.getShapes();
      for (let i = 0; i < childShapes.length; i++) {
        const childShape = childShapes[i];
        const childConfig = config.shapes[i];
        if (childConfig) {
          this.applyCallbacksToShape(childShape, childConfig);
        }
      }
    }
  }
  
  // ============================================================
  // Cleanup
  // ============================================================
  
  /**
   * Clean up all resources
   */
  async destroy(): Promise<void> {
    // Clean up callback manager (unregister notifications)
    if (this.callbackManager) {
      await this.callbackManager.destroy();
      this.callbackManager = null;
    }
    
    // Clean up model
    if (this.model) {
      this.model.destroy();
      this.model = null;
    }
    
    // Clean up canvas
    if (this.canvas) {
      this.canvas.destroy();
      this.canvas = null;
    }
    
    // Clear references
    this.context = null;
    this.faceplateId = null;
    this.targetEntityId = null;
    
    console.log('FaceplateRenderer destroyed');
  }
  
  // ============================================================
  // Getters
  // ============================================================
  
  getCanvas(): Canvas | null {
    return this.canvas;
  }
  
  getModel(): Model | null {
    return this.model;
  }
  
  getContext(): FaceplateContext | null {
    return this.context;
  }
  
  getFaceplateId(): EntityId | null {
    return this.faceplateId;
  }
  
  getTargetEntityId(): EntityId | null {
    return this.targetEntityId;
  }
}
