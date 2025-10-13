import { ref } from 'vue';
import type { EntityId } from '@/core/data/types';
import type { FaceplateRecord, FaceplateComponentRecord, FaceplateBindingDefinition } from '../utils/faceplate-data';
import type { CanvasNode, Binding } from '../types';
import { logger } from '../utils/logger';

/**
 * Composable for faceplate operations (load, save, etc.)
 */
export function useFaceplateOperations(
  dataStore: any,
  service: any,
  workspaceState: ReturnType<typeof import('./useWorkspaceState').useWorkspaceState>
) {
  const isSaving = ref(false);

  async function loadFaceplate(faceplateId: EntityId): Promise<{
    faceplate: FaceplateRecord;
    components: FaceplateComponentRecord[];
    nodes: CanvasNode[];
    bindings: Binding[];
  }> {
    const faceplate = await service.readFaceplate(faceplateId);
    const components = await service.readComponents(faceplate.components);

    // Convert to canvas nodes
    const nodes = faceplate.configuration.layout.map((layoutItem: any) => {
      const component = components.find((c: any) => c.name === layoutItem.component);
      if (!component) return null;

      return {
        id: String(component.id),
        componentId: findTemplateForPrimitive(component.componentType),
        name: component.name,
        position: { x: layoutItem.x, y: layoutItem.y },
        size: { x: layoutItem.w || 4, y: layoutItem.h || 3 },
        props: component.configuration,
      } as CanvasNode;
    }).filter(Boolean) as CanvasNode[];

    // Convert bindings
    const bindings = faceplate.configuration.bindings.map((b: any, idx: number) => {
      const node = nodes.find(n => n.name === b.component);
      return {
        id: `binding-${idx}`,
        componentId: node?.id || '',
        componentName: b.component,
        property: b.property,
        expression: b.expression,
        mode: b.mode ?? 'field',
        transform: b.transform ?? null,
        dependencies: Array.isArray(b.dependencies) ? b.dependencies : undefined,
        description: b.description,
      } as Binding;
    });

    return { faceplate, components, nodes, bindings };
  }

  async function saveFaceplate(): Promise<void> {
    if (isSaving.value || !workspaceState.currentFaceplateId.value) {
      return;
    }

    try {
      isSaving.value = true;
      logger.info('Starting faceplate save...');

      // Get existing components to delete after new ones are created
      const existingFaceplate = await service.readFaceplate(workspaceState.currentFaceplateId.value);
      const oldComponentIds = existingFaceplate.components;

      // Build NEW component entities
      const componentIds: EntityId[] = [];
      const nodeIdToComponentId = new Map<string, EntityId>();

      for (const node of workspaceState.nodes.value) {
        const componentId = await service.createComponent(
          workspaceState.currentFaceplateId.value,
          node.name,
          node.componentId // This should be the primitive ID
        );
        componentIds.push(componentId);
        nodeIdToComponentId.set(node.id, componentId);

        // Find bindings for this node
        const nodeBindings = workspaceState.bindings.value.filter(b => b.componentId === node.id);
        const bindingsData = nodeBindings.map(b => ({
          component: node.name,
          property: b.property,
          expression: b.expression,
          mode: b.mode ?? 'field',
          transform: b.transform ?? undefined,
          dependencies: b.dependencies?.length ? b.dependencies : undefined,
          description: b.description,
        }));

        // Update component data
        await service.writeComponent({
          id: componentId,
          name: node.name,
          componentType: node.componentId,
          configuration: node.props,
          configurationRaw: JSON.stringify(node.props),
          bindings: bindingsData,
          bindingsRaw: JSON.stringify(bindingsData),
          animationRules: [],
          animationRulesRaw: '[]',
        });
      }

      // Build layout configuration
      const layout = workspaceState.nodes.value.map(node => {
        const componentId = nodeIdToComponentId.get(node.id);
        if (!componentId) return null;

        const layoutItem = existingFaceplate.configuration.layout.find((l: any) =>
          existingFaceplate.components.some((cId: EntityId, idx: number) =>
            cId === componentId && existingFaceplate.configuration.layout[idx]?.component === String(cId)
          )
        );

        return {
          component: node.name,
          x: node.position.x,
          y: node.position.y,
          w: node.size.x,
          h: node.size.y,
          parentId: layoutItem?.parentId,
        };
      }).filter(Boolean);

      const bindingsData = workspaceState.bindings.value.map(b => {
        const node = workspaceState.nodes.value.find(n => n.id === b.componentId);
        if (!node) return null;
        return {
          component: b.componentName,
          property: b.property,
          expression: b.expression,
          mode: b.mode ?? 'field',
          transform: b.transform ?? undefined,
          dependencies: b.dependencies?.length ? b.dependencies : undefined,
          description: b.description,
        };
      }).filter(Boolean);

      // Build event handlers
      const eventHandlersData = workspaceState.nodes.value
        .filter(node => node.eventHandlers && node.eventHandlers.length > 0)
        .flatMap(node =>
          (node.eventHandlers || []).map(handler => ({
            id: handler.id,
            componentId: node.name,
            trigger: handler.trigger,
            action: handler.action,
            description: handler.description,
            enabled: handler.enabled !== false,
          }))
        );

      const metadata = {
        ...workspaceState.faceplateMetadata.value,
        viewport: {
          width: workspaceState.viewportSize.value.x,
          height: workspaceState.viewportSize.value.y,
        },
      };

      // Save faceplate configuration
      await service.writeFaceplate({
        id: workspaceState.currentFaceplateId.value,
        name: workspaceState.currentFaceplateName.value,
        targetEntityType: workspaceState.currentTargetEntityType.value,
        configuration: {
          layout,
          bindings: bindingsData,
          eventHandlers: eventHandlersData.length > 0 ? eventHandlersData : undefined,
          metadata
        },
        components: componentIds,
        notificationChannels: [],
        scriptModules: [],
      });

      // Delete old components
      if (oldComponentIds.length > 0) {
        await Promise.all(oldComponentIds.map((compId: EntityId) =>
          service.deleteComponent(compId).catch((err: any) => {
            logger.warn(`Failed to delete old component ${compId}:`, err);
          })
        ));
      }

      workspaceState.faceplateMetadata.value = metadata;

    } catch (error) {
      logger.error('Failed to save faceplate:', error);
      throw error;
    } finally {
      isSaving.value = false;
    }
  }

  function findTemplateForPrimitive(primitiveId: string): string {
    // This is a simplified version - in reality we'd need access to the template map
    return primitiveId;
  }

  return {
    isSaving,
    loadFaceplate,
    saveFaceplate,
  };
}