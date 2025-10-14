/**
 * CallbackManager - Manages all callback types for faceplates
 * 
 * This class handles:
 * - Event handlers (click, mouseover, etc.)
 * - Custom methods attached to shapes
 * - Context menu actions
 * - Notification channels that listen to Store changes
 * 
 * All callbacks are compiled and bound to appropriate contexts.
 */

import type { Notification } from '@/core/data/types';
import type { Drawable } from '@/core/canvas/shapes/base';
import type { FaceplateShapeConfig, NotificationChannel, NotificationContext } from '../types';
import { FaceplateContext } from './FaceplateContext';

export class CallbackManager {
  private context: FaceplateContext;
  private subscriptions: Array<() => Promise<void>> = [];
  private compiledFunctions: Map<string, Function> = new Map();
  
  constructor(context: FaceplateContext) {
    this.context = context;
  }
  
  // ============================================================
  // Apply Callbacks to Shapes
  // ============================================================
  
  /**
   * Apply event handlers from config to a shape
   * 
   * Handlers are bound to the shape itself, so 'this' inside the handler
   * refers to the shape. To access context, use shape.context.
   * 
   * @param shape - The shape to attach handlers to
   * @param config - Shape configuration with handlers
   */
  applyHandlers(shape: Drawable, config: FaceplateShapeConfig): void {
    if (!config.handlers) return;
    
    for (const [eventName, handlerCode] of Object.entries(config.handlers)) {
      try {
        // Compile the handler function
        const handler = this.compileFunction(handlerCode, 'event');
        
        // Store context reference on shape for handler access
        (shape as any).context = this.context;
        
        // Bind handler to shape and attach to event
        const boundHandler = handler.bind(shape);
        shape.on(eventName, boundHandler);
        
      } catch (error) {
        console.error(`Error compiling handler for event '${eventName}':`, error);
      }
    }
  }
  
  /**
   * Apply custom methods from config to a shape
   * 
   * Methods are attached directly to the shape object and can be called
   * by other callbacks or notification handlers.
   * 
   * @param shape - The shape to attach methods to
   * @param config - Shape configuration with methods
   */
  applyMethods(shape: Drawable, config: FaceplateShapeConfig): void {
    if (!config.methods) return;
    
    for (const [methodName, methodCode] of Object.entries(config.methods)) {
      try {
        // Compile the method function
        const method = this.compileFunction(methodCode, 'args');
        
        // Store context reference on shape
        (shape as any).context = this.context;
        
        // Bind method to shape and attach as property
        (shape as any)[methodName] = method.bind(shape);
        
      } catch (error) {
        console.error(`Error compiling method '${methodName}':`, error);
      }
    }
  }
  
  /**
   * Apply context menu from config to a shape
   * 
   * Context menu actions are compiled and stored on the shape.
   * The actual menu rendering/handling is done by the UI layer.
   * 
   * @param shape - The shape to attach context menu to
   * @param config - Shape configuration with contextMenu
   */
  applyContextMenu(shape: Drawable, config: FaceplateShapeConfig): void {
    if (!config.contextMenu) return;
    
    const compiledMenu: Record<string, Function> = {};
    
    for (const [label, actionCode] of Object.entries(config.contextMenu)) {
      try {
        // Compile the action function
        const action = this.compileFunction(actionCode, 'event');
        
        // Store context reference on shape
        (shape as any).context = this.context;
        
        // Bind action to shape
        compiledMenu[label] = action.bind(shape);
        
      } catch (error) {
        console.error(`Error compiling context menu action '${label}':`, error);
      }
    }
    
    // Store compiled menu on shape
    (shape as any).contextMenu = compiledMenu;
  }
  
  // ============================================================
  // Notification Channels
  // ============================================================
  
  /**
   * Set up a notification channel that listens to Store changes
   * 
   * The callback is bound to FaceplateContext, giving access to:
   * - this.read() / this.write() - Store operations
   * - this.getShapes() - Access to all shapes
   * - this.getCanvas() - Canvas reference
   * 
   * @param channel - Notification channel configuration
   */
  async setupNotificationChannel(channel: NotificationChannel): Promise<void> {
    try {
      // Compile the callback function
      const callback = this.compileFunction(channel.callback, 'notification');
      
      // Bind callback to context
      const boundCallback = callback.bind(this.context);
      
      // Create notification handler that transforms Notification to NotificationContext
      const handler = async (notification: Notification) => {
        try {
          // Skip if current value is null
          if (!notification.current.value || notification.current.timestamp === null) {
            console.warn(`Notification channel '${channel.name}' received null value, skipping`);
            return;
          }
          
          // Transform notification to context format
          const notifContext: NotificationContext = {
            current: {
              value: notification.current.value,
              timestamp: notification.current.timestamp,
              writerId: notification.current.writer_id || null
            },
            context: {}
          };
          
          // Add previous value if available
          if (notification.previous && notification.previous.value && notification.previous.timestamp !== null) {
            notifContext.previous = {
              value: notification.previous.value,
              timestamp: notification.previous.timestamp,
              writerId: notification.previous.writer_id || null
            };
          }
          
          // Add context fields
          if (notification.context) {
            for (const [key, value] of Object.entries(notification.context)) {
              // Skip null context values
              if (value.value && value.timestamp !== null) {
                notifContext.context[key] = {
                  value: value.value,
                  timestamp: value.timestamp,
                  writerId: value.writer_id || null
                };
              }
            }
          }
          
          // Execute callback with transformed notification
          await boundCallback(notifContext);
          
        } catch (error) {
          console.error(`Error executing notification callback for channel '${channel.name}':`, error);
        }
      };
      
      // Register with data store
      const dataStore = this.context.getDataStore();
      await dataStore.registerNotification(channel.config, handler);
      
      // Store cleanup function
      this.subscriptions.push(async () => {
        await dataStore.unregisterNotification(channel.config, handler);
      });
      
      console.log(`Notification channel '${channel.name}' registered successfully`);
      
    } catch (error) {
      console.error(`Error setting up notification channel '${channel.name}':`, error);
      throw error;
    }
  }
  
  // ============================================================
  // Utility Functions
  // ============================================================
  
  /**
   * Compile a JavaScript function from code string
   * 
   * @param code - JavaScript code string
   * @param paramName - Parameter name for the function
   * @returns Compiled function
   */
  private compileFunction(code: string, paramName: string): Function {
    // Check cache first
    const cacheKey = `${paramName}:${code}`;
    if (this.compiledFunctions.has(cacheKey)) {
      return this.compiledFunctions.get(cacheKey)!;
    }
    
    try {
      // Wrap code in function if it's not already a function
      let functionCode = code.trim();
      
      // If code doesn't start with 'function', wrap it
      if (!functionCode.startsWith('function')) {
        functionCode = `function(${paramName}) { ${functionCode} }`;
      }
      
      // Use Function constructor to compile (allows async)
      const compiledFn = new Function('return ' + functionCode)();
      
      // Cache for reuse
      this.compiledFunctions.set(cacheKey, compiledFn);
      
      return compiledFn;
      
    } catch (error) {
      console.error('Error compiling function:', code, error);
      throw new Error(`Failed to compile callback: ${error}`);
    }
  }
  
  /**
   * Execute initialization script
   * 
   * @param scriptCode - Initialization script code
   */
  async executeInitScript(scriptCode: string): Promise<void> {
    try {
      const script = this.compileFunction(scriptCode, '');
      const boundScript = script.bind(this.context);
      await boundScript();
      console.log('Initialization script executed successfully');
    } catch (error) {
      console.error('Error executing initialization script:', error);
      throw error;
    }
  }
  
  // ============================================================
  // Cleanup
  // ============================================================
  
  /**
   * Clean up all subscriptions and handlers
   */
  async destroy(): Promise<void> {
    // Unregister all notification channels
    for (const cleanup of this.subscriptions) {
      try {
        await cleanup();
      } catch (error) {
        console.error('Error during cleanup:', error);
      }
    }
    
    this.subscriptions = [];
    this.compiledFunctions.clear();
    
    console.log('CallbackManager destroyed');
  }
}
