/**
 * Faceplate Builder Utilities
 * 
 * Shared utility functions for the faceplate builder.
 */

import type { Drawable } from '@/core/canvas/shapes/base';
import type { FaceplateShapeConfig } from './types';

/**
 * Convert a shape to its configuration object
 */
export function shapeToConfig(shape: Drawable): FaceplateShapeConfig {
  const config: FaceplateShapeConfig = {
    type: shape.constructor.name,
    id: shape.getId() || undefined,
    location: shape.getOffset(),
    rotation: shape.getRotation(),
    scale: shape.getScale(),
    pivot: shape.getPivot()
  };
  
  // Add optional properties only if they have values
  const minZoom = shape.getMinZoom();
  if (minZoom !== null) config.minZoom = minZoom;
  
  const maxZoom = shape.getMaxZoom();
  if (maxZoom !== null) config.maxZoom = maxZoom;
  
  const pane = shape.getPane();
  if (pane) config.pane = pane;
  
  const shapeAny = shape as any;
  
  // Add shape-specific properties
  if (shapeAny.getRadius) config.radius = shapeAny.getRadius();
  if (shapeAny.getColor) config.color = shapeAny.getColor();
  if (shapeAny.getFillColor) config.fillColor = shapeAny.getFillColor();
  if (shapeAny.getFillOpacity) config.fillOpacity = shapeAny.getFillOpacity();
  if (shapeAny.getWeight) config.weight = shapeAny.getWeight();
  if (shapeAny.getOpacity) config.opacity = shapeAny.getOpacity();
  if (shapeAny.getText) config.text = shapeAny.getText();
  if (shapeAny.getFontSize) config.fontSize = shapeAny.getFontSize();
  if (shapeAny.getDirection) config.direction = shapeAny.getDirection();
  if (shapeAny.getEdges) config.edges = shapeAny.getEdges();
  if (shapeAny.getHtml) config.html = shapeAny.getHtml();
  if (shapeAny.getClassName) config.className = shapeAny.getClassName();
  if (shapeAny.getWidth) config.width = shapeAny.getWidth();
  if (shapeAny.getHeight) config.height = shapeAny.getHeight();
  if (shapeAny.getUrl) config.url = shapeAny.getUrl();
  if (shapeAny.getCss) config.css = shapeAny.getCss();
  if (shapeAny.getKeyframes) config.keyframes = shapeAny.getKeyframes();
  
  // Add callback properties
  const handlers = shapeAny.getHandlers?.();
  if (handlers && Object.keys(handlers).length > 0) config.handlers = handlers;
  
  const methods = shapeAny.getMethods?.();
  if (methods && Object.keys(methods).length > 0) config.methods = methods;
  
  const contextMenu = shapeAny.getContextMenu?.();
  if (contextMenu && Object.keys(contextMenu).length > 0) config.contextMenu = contextMenu;
  
  return config;
}