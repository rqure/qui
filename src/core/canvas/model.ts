/**
 * Model - Container for nested shapes
 * 
 * Like qschematic's Model, this provides hierarchical structure
 * without requiring unique IDs for each shape.
 */

import { Drawable, type ICanvas } from './shapes/base';

export class Model extends Drawable {
  private shapes: Drawable[] = [];

  /**
   * Add a shape to this model
   */
  addShape(shape: Drawable): this {
    shape.setParent(this);
    this.shapes.push(shape);
    return this;
  }

  /**
   * Remove a shape from this model
   */
  removeShape(shape: Drawable): boolean {
    const index = this.shapes.indexOf(shape);
    if (index > -1) {
      this.shapes.splice(index, 1);
      shape.setParent(null);
      return true;
    }
    return false;
  }

  /**
   * Remove shape at index
   */
  removeShapeAt(index: number): Drawable | null {
    if (index >= 0 && index < this.shapes.length) {
      const shape = this.shapes[index];
      this.shapes.splice(index, 1);
      shape.setParent(null);
      return shape;
    }
    return null;
  }

  /**
   * Get all shapes
   */
  getShapes(): Drawable[] {
    return this.shapes;
  }

  /**
   * Get shape at index
   */
  getShape(index: number): Drawable | undefined {
    return this.shapes[index];
  }

  /**
   * Get number of shapes
   */
  getShapeCount(): number {
    return this.shapes.length;
  }

  /**
   * Clear all shapes
   */
  clearShapes(): void {
    this.shapes.forEach(shape => {
      shape.destroy();
    });
    this.shapes = [];
  }

  /**
   * Find shape by type name
   */
  findShapeByType(typeName: string): Drawable | undefined {
    return this.findShapeRecursive(this, typeName);
  }

  /**
   * Find shape by unique ID
   */
  findShapeById(id: string): Drawable | undefined {
    return this.findShapeByIdRecursive(this, id);
  }

  /**
   * Recursively search for a shape by type
   */
  private findShapeRecursive(drawable: Drawable, typeName: string): Drawable | undefined {
    if (drawable.constructor.name === typeName) {
      return drawable;
    }

    if (drawable instanceof Model) {
      for (const shape of drawable.shapes) {
        const found = this.findShapeRecursive(shape, typeName);
        if (found) {
          return found;
        }
      }
    }

    return undefined;
  }

  /**
   * Recursively search for a shape by ID
   */
  private findShapeByIdRecursive(drawable: Drawable, id: string): Drawable | undefined {
    if (drawable.getId() === id) {
      return drawable;
    }

    if (drawable instanceof Model) {
      for (const shape of drawable.shapes) {
        const found = this.findShapeByIdRecursive(shape, id);
        if (found) {
          return found;
        }
      }
    }

    return undefined;
  }

  /**
   * Find all shapes matching a predicate
   */
  findShapes(predicate: (shape: Drawable) => boolean): Drawable[] {
    const results: Drawable[] = [];
    this.findShapesRecursive(this, predicate, results);
    return results;
  }

  /**
   * Recursively find shapes matching predicate
   */
  private findShapesRecursive(
    drawable: Drawable,
    predicate: (shape: Drawable) => boolean,
    results: Drawable[]
  ): void {
    if (predicate(drawable)) {
      results.push(drawable);
    }

    if (drawable instanceof Model) {
      for (const shape of drawable.shapes) {
        this.findShapesRecursive(shape, predicate, results);
      }
    }
  }

  /**
   * Draw all shapes in this model
   */
  draw(canvas: ICanvas): void {
    this.canvas = canvas;
    
    // Draw all child shapes
    this.shapes.forEach(shape => {
      shape.draw(canvas);
    });
  }

  /**
   * Erase all shapes in this model
   */
  erase(): void {
    this.shapes.forEach(shape => {
      shape.erase();
    });
  }

  /**
   * Destroy this model and all child shapes
   */
  destroy(): void {
    this.shapes.forEach(shape => {
      shape.destroy();
    });
    this.shapes = [];
    super.destroy();
  }

  /**
   * For each shape in the model
   */
  forEach(callback: (shape: Drawable, index: number) => void): void {
    this.shapes.forEach(callback);
  }

  /**
   * Map over shapes
   */
  map<T>(callback: (shape: Drawable, index: number) => T): T[] {
    return this.shapes.map(callback);
  }

  /**
   * Filter shapes
   */
  filter(predicate: (shape: Drawable, index: number) => boolean): Drawable[] {
    return this.shapes.filter(predicate);
  }
}
