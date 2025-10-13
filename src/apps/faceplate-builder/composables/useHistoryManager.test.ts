import { describe, it, expect } from 'vitest';
import { useHistoryManager } from './useHistoryManager';
import type { CanvasNode, Binding, Vector2 } from '../types';

describe('useHistoryManager', () => {
  describe('applyState metadata handling', () => {
    it('should completely replace metadata during undo/redo operations', () => {
      const { pushHistory, undo } = useHistoryManager();
      
      // Initial state
      const nodes: CanvasNode[] = [];
      const bindings: Binding[] = [];
      const viewport: Vector2 = { x: 0, y: 0 };
      const metadata: Record<string, unknown> = { foo: 'a', bar: 'b' };
      
      // Push initial state
      pushHistory(nodes, bindings, viewport, metadata);
      
      // Add a new property to metadata
      metadata.baz = 'c';
      
      // Push new state with additional metadata
      pushHistory(nodes, bindings, viewport, metadata);
      
      // Undo to go back to the first state
      undo(nodes, bindings, viewport, metadata);
      
      // The metadata should now only have { foo: 'a', bar: 'b' }
      // The 'baz' property should be removed
      expect(metadata).toEqual({ foo: 'a', bar: 'b' });
      expect(metadata).not.toHaveProperty('baz');
    });
    
    it('should handle metadata property removal correctly', () => {
      const { pushHistory, undo, redo } = useHistoryManager();
      
      // State with three properties
      const nodes: CanvasNode[] = [];
      const bindings: Binding[] = [];
      const viewport: Vector2 = { x: 0, y: 0 };
      const metadata: Record<string, unknown> = { a: 1, b: 2, c: 3 };
      
      pushHistory(nodes, bindings, viewport, metadata);
      
      // Remove a property
      delete metadata.b;
      pushHistory(nodes, bindings, viewport, metadata);
      
      // Undo should restore the property
      undo(nodes, bindings, viewport, metadata);
      expect(metadata).toEqual({ a: 1, b: 2, c: 3 });
      
      // Redo should remove it again
      redo(nodes, bindings, viewport, metadata);
      expect(metadata).toEqual({ a: 1, c: 3 });
      expect(metadata).not.toHaveProperty('b');
    });
    
    it('should handle empty metadata correctly', () => {
      const { pushHistory, undo } = useHistoryManager();
      
      const nodes: CanvasNode[] = [];
      const bindings: Binding[] = [];
      const viewport: Vector2 = { x: 0, y: 0 };
      const metadata: Record<string, unknown> = {};
      
      pushHistory(nodes, bindings, viewport, metadata);
      
      // Add properties
      metadata.prop1 = 'value1';
      metadata.prop2 = 'value2';
      pushHistory(nodes, bindings, viewport, metadata);
      
      // Undo should clear all properties
      undo(nodes, bindings, viewport, metadata);
      expect(metadata).toEqual({});
      expect(Object.keys(metadata)).toHaveLength(0);
    });
    
    it('should handle viewport metadata correctly during undo/redo', () => {
      const { pushHistory, undo, redo } = useHistoryManager();
      
      const nodes: CanvasNode[] = [];
      const bindings: Binding[] = [];
      const viewport: Vector2 = { x: 800, y: 600 };
      const metadata: Record<string, unknown> = {
        viewport: { width: 800, height: 600 }
      };
      
      pushHistory(nodes, bindings, viewport, metadata);
      
      // Change viewport size and add custom property
      viewport.x = 1024;
      viewport.y = 768;
      metadata.viewport = { width: 1024, height: 768 };
      metadata.customProp = 'custom';
      pushHistory(nodes, bindings, viewport, metadata);
      
      // Undo should restore original viewport metadata and remove custom property
      undo(nodes, bindings, viewport, metadata);
      expect(metadata).toEqual({
        viewport: { width: 800, height: 600 }
      });
      expect(metadata).not.toHaveProperty('customProp');
      
      // Redo should restore the changes
      redo(nodes, bindings, viewport, metadata);
      expect(metadata).toEqual({
        viewport: { width: 1024, height: 768 },
        customProp: 'custom'
      });
    });
  });
});
