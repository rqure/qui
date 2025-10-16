/**
 * FaceplateContext - Execution context for faceplate callbacks
 * 
 * This class provides the execution context for all callback types:
 * - Notification channel callbacks
 * - Event handlers (click, mouseover, etc.)
 * - Custom methods
 * - Initialization scripts
 * 
 * The context gives callbacks access to:
 * - Store operations (read/write)
 * - Shape navigation (getShapes, findShapeByType)
 * - Canvas reference
 * - Target entity
 */

import type { EntityId, FieldType, Value } from '@/core/data/types';
import type { Model } from '@/core/canvas/model';
import type { Canvas } from '@/core/canvas/canvas';
import type { Drawable } from '@/core/canvas/shapes/base';

export class FaceplateContext {
  private dataStore: any;
  private model: Model;
  private targetEntityId: EntityId;
  private canvas: Canvas;
  
  constructor(
    model: Model,
    canvas: Canvas,
    targetEntityId: EntityId,
    dataStore: any
  ) {
    this.model = model;
    this.canvas = canvas;
    this.targetEntityId = targetEntityId;
    this.dataStore = dataStore;
  }
  
  // ============================================================
  // Store Operations
  // ============================================================
  
  /**
   * Read a field from the target entity
   * 
   * @param fieldPath - Array of field names for indirection
   *                    ['TestValue'] reads TestValue on target
   *                    ['Parent', 'Name'] reads Parent->Name
   * @returns The field value
   * 
   * Example:
   * ```javascript
   * const value = await this.read(['TestValue']);
   * const parentName = await this.read(['Parent', 'Name']);
   * ```
   */
  async read(fieldPath: string[]): Promise<Value> {
    // Convert field names to FieldType
    const fieldTypes: FieldType[] = [];
    for (const fieldName of fieldPath) {
      const fieldType = await this.dataStore.getFieldType(fieldName);
      if (!fieldType) {
        throw new Error(`Unknown field type: ${fieldName}`);
      }
      fieldTypes.push(fieldType);
    }
    
    // Read from Store
    const result = await this.dataStore.read(this.targetEntityId, fieldTypes);
    return result.value;
  }
  
  /**
   * Write a field to the target entity (supports indirection)
   * 
   * @param fieldPath - Array of field names for indirection
   *                    ['TestValue'] writes TestValue on target
   *                    ['Parent', 'Name'] writes Parent->Name
   * @param value - Value to write
   * 
   * Example:
   * ```javascript
   * await this.write(['TestValue'], { Int: 42 });
   * await this.write(['Parent', 'Name'], { String: 'New Name' });
   * ```
   */
  async write(fieldPath: string[], value: Value): Promise<void> {
    // Convert field names to FieldType
    const fieldTypes: FieldType[] = [];
    for (const fieldName of fieldPath) {
      const fieldType = await this.dataStore.getFieldType(fieldName);
      if (!fieldType) {
        throw new Error(`Unknown field type: ${fieldName}`);
      }
      fieldTypes.push(fieldType);
    }
    
    await this.dataStore.write(
      this.targetEntityId,
      fieldTypes,
      value,
      undefined,  // timestamp (auto-generated)
      undefined,  // writerId (auto-assigned)
      undefined,  // pushCondition
      undefined   // adjustBehavior
    );
  }  // ============================================================
  // Model Navigation
  // ============================================================
  
  /**
   * Get all top-level shapes in the model
   * 
   * Example:
   * ```javascript
   * const shapes = this.getShapes();
   * shapes[0].setFillColor('red');
   * ```
   */
  getShapes(): Drawable[] {
    return this.model.getShapes();
  }
  
  /**
   * Get a shape by index
   * 
   * @param index - Zero-based index
   * @returns The shape at the index, or undefined if not found
   * 
   * Example:
   * ```javascript
   * const circle = this.getShape(0);
   * if (circle) {
   *   circle.setRadius(50);
   * }
   * ```
   */
  getShape(index: number): Drawable | undefined {
    return this.model.getShape(index);
  }
  
  /**
   * Find a shape by type name (searches recursively)
   * 
   * @param typeName - Type name to search for ('Circle', 'Polygon', etc.)
   * @returns The first matching shape, or undefined if not found
   * 
   * Example:
   * ```javascript
   * const circle = this.findShapeByType('Circle');
   * if (circle) {
   *   circle.setFillColor('green');
   * }
   * ```
   */
  findShapeByType(typeName: string): Drawable | undefined {
    return this.model.findShapeByType(typeName);
  }
  
  /**
   * Iterate over all shapes with a callback
   * 
   * Example:
   * ```javascript
   * this.forEachShape(shape => {
   *   if (shape.getTypeName() === 'Circle') {
   *     shape.setFillColor('blue');
   *   }
   * });
   * ```
   */
  forEachShape(callback: (shape: Drawable, index: number) => void): void {
    this.model.forEach(callback);
  }
  
  // ============================================================
  // Canvas Access
  // ============================================================
  
  /**
   * Get the canvas instance
   * 
   * Example:
   * ```javascript
   * const canvas = this.getCanvas();
   * canvas.moveTo({ x: 500, y: 300 }, 2);
   * ```
   */
  getCanvas(): Canvas {
    return this.canvas;
  }
  
  // ============================================================
  // Internal Access (for CallbackManager)
  // ============================================================
  
  /**
   * Get the target entity ID (internal use)
   */
  getTargetEntityId(): EntityId {
    return this.targetEntityId;
  }
  
  /**
   * Get the data store (internal use)
   */
  getDataStore(): any {
    return this.dataStore;
  }
  
  /**
   * Get the model (internal use)
   */
  getModel(): Model {
    return this.model;
  }
}
