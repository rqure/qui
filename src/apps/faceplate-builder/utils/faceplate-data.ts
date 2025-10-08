import type { EntityId, EntityType, FieldType, Value } from '@/core/data/types';
import { ValueHelpers, FieldSchemaHelpers, extractEntityType } from '@/core/data/types';
import { useDataStore } from '@/stores/data';
import type { BindingMode } from '../types';

export type DataStore = ReturnType<typeof useDataStore>;

export interface FaceplateBindingDefinition {
  component: string;
  property: string;
  expression: string;
  transform?: string;
  mode?: BindingMode;
  dependencies?: string[];
  description?: string;
}

export interface FaceplateLayoutItem {
  component: string;
  x: number;
  y: number;
  w?: number;
  h?: number;
}

export interface FaceplateNotificationChannel {
  fields: string[];
  entityType?: string;
  triggerOnChange?: boolean;
}

export interface FaceplateScriptModule {
  name: string;
  description?: string;
  code: string;
}

export interface FaceplateConfiguration {
  layout: FaceplateLayoutItem[];
  bindings: FaceplateBindingDefinition[];
  metadata?: Record<string, unknown>;
}

export interface FaceplateRecord {
  id: EntityId;
  name: string;
  targetEntityType: string;
  configurationRaw: string;
  configuration: FaceplateConfiguration;
  bindingsRaw: string;
  bindings: FaceplateBindingDefinition[];
  components: EntityId[];
  notificationChannelsRaw: string;
  notificationChannels: FaceplateNotificationChannel[];
  scriptModulesRaw: string;
  scriptModules: FaceplateScriptModule[];
}

export interface FaceplateComponentRecord {
  id: EntityId;
  name: string;
  componentType: string;
  configurationRaw: string;
  configuration: Record<string, unknown>;
  bindingsRaw: string;
  bindings: FaceplateBindingDefinition[];
  animationRulesRaw: string;
  animationRules: Array<Record<string, unknown>>;
}

export interface FaceplateBindingLibraryRecord {
  id: EntityId;
  name: string;
  expression: string;
  targetComponent: EntityId | null;
  targetProperty: string;
  valueTransform: string;
  subscriptionConfigRaw: string;
  subscriptionConfig: FaceplateNotificationChannel[];
}

function safeParseJson<T>(input: string | null | undefined, fallback: T): T {
  if (!input) {
    return fallback;
  }
  try {
    const parsed = JSON.parse(input);
    return (parsed ?? fallback) as T;
  } catch (error) {
    console.warn('Failed to parse JSON', input, error);
    return fallback;
  }
}

function ensureArray<T>(value: T[] | T | null | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export class FaceplateDataService {
  private fieldTypeCache = new Map<string, FieldType>();
  private entityTypeCache = new Map<string, EntityType>();
  private choiceLabelCache = new Map<string, string[]>();

  constructor(private readonly dataStore: DataStore) {}

  async getFieldType(fieldName: string): Promise<FieldType> {
    if (!this.fieldTypeCache.has(fieldName)) {
      const fieldType = await this.dataStore.getFieldType(fieldName);
      this.fieldTypeCache.set(fieldName, fieldType);
    }
    return this.fieldTypeCache.get(fieldName)!;
  }

  async getEntityType(entityTypeName: string): Promise<EntityType> {
    if (!this.entityTypeCache.has(entityTypeName)) {
      const entityType = await this.dataStore.getEntityType(entityTypeName);
      this.entityTypeCache.set(entityTypeName, entityType);
    }
    return this.entityTypeCache.get(entityTypeName)!;
  }

  async readValue(entityId: EntityId, fieldName: string): Promise<Value | null> {
    const fieldType = await this.getFieldType(fieldName);
    const [value] = await this.dataStore.read(entityId, [fieldType]);
    return value ?? null;
  }

  async readString(entityId: EntityId, fieldName: string, fallback = ''): Promise<string> {
    const value = await this.readValue(entityId, fieldName);
    if (!value) return fallback;
    if (ValueHelpers.isString(value)) {
      return value.String ?? fallback;
    }
    if (ValueHelpers.isChoice(value)) {
      const label = await this.getChoiceLabelForField(entityId, fieldName, value.Choice);
      return label ?? String(value.Choice);
    }
    if (ValueHelpers.isInt(value)) {
      return String(value.Int);
    }
    if (ValueHelpers.isFloat(value)) {
      return String(value.Float);
    }
    if (ValueHelpers.isBool(value)) {
      return value.Bool ? 'true' : 'false';
    }
    return fallback;
  }

  async readEntityList(entityId: EntityId, fieldName: string): Promise<EntityId[]> {
    const value = await this.readValue(entityId, fieldName);
    if (value && ValueHelpers.isEntityList(value)) {
      return value.EntityList;
    }
    return [];
  }

  async readFaceplate(faceplateId: EntityId): Promise<FaceplateRecord> {
    const name = await this.readString(faceplateId, 'Name', `Faceplate ${faceplateId}`);
    const targetEntityType = await this.readString(faceplateId, 'TargetEntityType', '');
    const configurationRaw = await this.readString(faceplateId, 'Configuration', '{}');
    const bindingsRaw = await this.readString(faceplateId, 'Bindings', '[]');
    const components = await this.readEntityList(faceplateId, 'Components');
    const notificationChannelsRaw = await this.readString(faceplateId, 'NotificationChannels', '[]');
    const scriptModulesRaw = await this.readString(faceplateId, 'ScriptModules', '[]');

    const configuration = safeParseJson<FaceplateConfiguration>(configurationRaw, { layout: [], bindings: [] });
    configuration.layout = ensureArray(configuration.layout);
    configuration.bindings = ensureArray(configuration.bindings);

    const bindings = safeParseJson<FaceplateBindingDefinition[]>(bindingsRaw, []);
    const notificationChannels = safeParseJson<FaceplateNotificationChannel[]>(notificationChannelsRaw, []);
    const scriptModules = safeParseJson<FaceplateScriptModule[]>(scriptModulesRaw, []);

    return {
      id: faceplateId,
      name,
      targetEntityType,
      configurationRaw,
      configuration,
      bindingsRaw,
      bindings,
      components,
      notificationChannelsRaw,
      notificationChannels,
      scriptModulesRaw,
      scriptModules,
    };
  }

  async readFaceplates(faceplateIds: EntityId[]): Promise<FaceplateRecord[]> {
    return Promise.all(faceplateIds.map((id) => this.readFaceplate(id)));
  }

  async readComponent(componentId: EntityId): Promise<FaceplateComponentRecord> {
    const name = await this.readString(componentId, 'Name', `Component ${componentId}`);
    const componentTypeRaw = await this.readValue(componentId, 'ComponentType');

    let componentType = 'Custom';
    if (componentTypeRaw && ValueHelpers.isChoice(componentTypeRaw)) {
      const label = await this.getChoiceLabelForField(componentId, 'ComponentType', componentTypeRaw.Choice);
      componentType = label ?? `Choice ${componentTypeRaw.Choice}`;
    } else if (componentTypeRaw && ValueHelpers.isString(componentTypeRaw)) {
      componentType = componentTypeRaw.String;
    }

    const configurationRaw = await this.readString(componentId, 'Configuration', '{}');
    const bindingsRaw = await this.readString(componentId, 'Bindings', '[]');
    const animationRulesRaw = await this.readString(componentId, 'AnimationRules', '[]');

    const configuration = safeParseJson<Record<string, unknown>>(configurationRaw, {});
    const bindings = safeParseJson<FaceplateBindingDefinition[]>(bindingsRaw, []);
    const animationRules = safeParseJson<Array<Record<string, unknown>>>(animationRulesRaw, []);

    return {
      id: componentId,
      name,
      componentType,
      configurationRaw,
      configuration,
      bindingsRaw,
      bindings,
      animationRulesRaw,
      animationRules,
    };
  }

  async readComponents(componentIds: EntityId[]): Promise<FaceplateComponentRecord[]> {
    return Promise.all(componentIds.map((id) => this.readComponent(id)));
  }

  async readBinding(bindingId: EntityId): Promise<FaceplateBindingLibraryRecord> {
    const name = await this.readString(bindingId, 'Name', `Binding ${bindingId}`);
    const expression = await this.readString(bindingId, 'Expression', '');
    const targetProperty = await this.readString(bindingId, 'TargetProperty', '');
    const valueTransform = await this.readString(bindingId, 'ValueTransform', '');
    const subscriptionConfigRaw = await this.readString(bindingId, 'SubscriptionConfig', '[]');

    let targetComponent: EntityId | null = null;
    const targetComponentValue = await this.readValue(bindingId, 'TargetComponent');
    if (targetComponentValue && ValueHelpers.isEntityRef(targetComponentValue)) {
      targetComponent = targetComponentValue.EntityReference ?? null;
    }

    const subscriptionConfig = safeParseJson<FaceplateNotificationChannel[]>(subscriptionConfigRaw, []);

    return {
      id: bindingId,
      name,
      expression,
      targetComponent,
      targetProperty,
      valueTransform,
      subscriptionConfigRaw,
      subscriptionConfig,
    };
  }

  async readBindingLibrary(bindingIds: EntityId[]): Promise<FaceplateBindingLibraryRecord[]> {
    return Promise.all(bindingIds.map((id) => this.readBinding(id)));
  }

  async writeString(entityId: EntityId, fieldName: string, value: string): Promise<void> {
    const fieldType = await this.getFieldType(fieldName);
    await this.dataStore.write(entityId, [fieldType], ValueHelpers.string(value));
  }

  async writeEntityList(entityId: EntityId, fieldName: string, items: EntityId[]): Promise<void> {
    const fieldType = await this.getFieldType(fieldName);
    await this.dataStore.write(entityId, [fieldType], ValueHelpers.entityList(items));
  }

  async writeFaceplate(faceplate: {
    id: EntityId;
    name: string;
    targetEntityType: string;
    configuration: FaceplateConfiguration;
    components: EntityId[];
    notificationChannels: FaceplateNotificationChannel[];
    scriptModules: FaceplateScriptModule[];
  }): Promise<void> {
    await Promise.all([
      this.writeString(faceplate.id, 'Name', faceplate.name),
      this.writeString(faceplate.id, 'TargetEntityType', faceplate.targetEntityType),
      this.writeString(faceplate.id, 'Configuration', JSON.stringify(faceplate.configuration)),
      this.writeEntityList(faceplate.id, 'Components', faceplate.components),
      this.writeString(faceplate.id, 'NotificationChannels', JSON.stringify(faceplate.notificationChannels)),
      this.writeString(faceplate.id, 'ScriptModules', JSON.stringify(faceplate.scriptModules ?? [])),
    ]);
  }

  async writeComponent(component: FaceplateComponentRecord): Promise<void> {
    await Promise.all([
      this.writeString(component.id, 'Name', component.name),
      this.writeString(component.id, 'ComponentType', component.componentType),
      this.writeString(component.id, 'Configuration', JSON.stringify(component.configuration)),
      this.writeString(component.id, 'Bindings', JSON.stringify(component.bindings)),
      this.writeString(component.id, 'AnimationRules', JSON.stringify(component.animationRules)),
    ]);
  }

  async writeBinding(binding: FaceplateBindingLibraryRecord): Promise<void> {
    const targetComponentValue = binding.targetComponent 
      ? ValueHelpers.entityRef(binding.targetComponent)
      : ValueHelpers.entityRef(null);
    
    const targetComponentFieldType = await this.getFieldType('TargetComponent');
    
    await Promise.all([
      this.writeString(binding.id, 'Name', binding.name),
      this.writeString(binding.id, 'Expression', binding.expression),
      this.dataStore.write(binding.id, [targetComponentFieldType], targetComponentValue),
      this.writeString(binding.id, 'TargetProperty', binding.targetProperty),
      this.writeString(binding.id, 'ValueTransform', binding.valueTransform),
      this.writeString(binding.id, 'SubscriptionConfig', JSON.stringify(binding.subscriptionConfig)),
    ]);
  }

  async createFaceplate(parentId: EntityId, name: string, targetEntityType: string): Promise<EntityId> {
    const faceplateEntityType = await this.getEntityType('Faceplate');
    const faceplateId = await this.dataStore.createEntity(faceplateEntityType, parentId, name);
    
    await Promise.all([
      this.writeString(faceplateId, 'TargetEntityType', targetEntityType),
      this.writeString(faceplateId, 'Configuration', JSON.stringify({ layout: [], bindings: [], metadata: {} })),
      this.writeEntityList(faceplateId, 'Components', []),
      this.writeString(faceplateId, 'NotificationChannels', JSON.stringify([])),
      this.writeString(faceplateId, 'ScriptModules', JSON.stringify([])),
    ]);
    
    return faceplateId;
  }

  async createComponent(parentId: EntityId, name: string, componentType: string): Promise<EntityId> {
    const componentEntityType = await this.getEntityType('FaceplateComponent');
    const componentId = await this.dataStore.createEntity(componentEntityType, parentId, name);
    
    await Promise.all([
      this.writeString(componentId, 'ComponentType', componentType),
      this.writeString(componentId, 'Configuration', JSON.stringify({})),
      this.writeString(componentId, 'Bindings', JSON.stringify([])),
      this.writeString(componentId, 'AnimationRules', JSON.stringify([])),
    ]);
    
    return componentId;
  }

  async createBinding(parentId: EntityId, name: string, expression: string): Promise<EntityId> {
    const bindingEntityType = await this.getEntityType('FaceplateBindingLibrary');
    const bindingId = await this.dataStore.createEntity(bindingEntityType, parentId, name);
    
    const targetComponentFieldType = await this.getFieldType('TargetComponent');
    
    await Promise.all([
      this.writeString(bindingId, 'Expression', expression),
      this.dataStore.write(bindingId, [targetComponentFieldType], ValueHelpers.entityRef(null)),
      this.writeString(bindingId, 'TargetProperty', ''),
      this.writeString(bindingId, 'ValueTransform', ''),
      this.writeString(bindingId, 'SubscriptionConfig', JSON.stringify([])),
    ]);
    
    return bindingId;
  }

  async deleteFaceplate(faceplateId: EntityId): Promise<void> {
    await this.dataStore.deleteEntity(faceplateId);
  }

  async deleteComponent(componentId: EntityId): Promise<void> {
    await this.dataStore.deleteEntity(componentId);
  }

  async deleteBinding(bindingId: EntityId): Promise<void> {
    await this.dataStore.deleteEntity(bindingId);
  }

  async associateFaceplateWithEntity(entityId: EntityId, faceplateId: EntityId): Promise<void> {
    const currentFaceplates = await this.readEntityList(entityId, 'Faceplates');
    if (!currentFaceplates.includes(faceplateId)) {
      await this.writeEntityList(entityId, 'Faceplates', [...currentFaceplates, faceplateId]);
    }
  }

  async dissociateFaceplateFromEntity(entityId: EntityId, faceplateId: EntityId): Promise<void> {
    const currentFaceplates = await this.readEntityList(entityId, 'Faceplates');
    const updated = currentFaceplates.filter((id) => id !== faceplateId);
    await this.writeEntityList(entityId, 'Faceplates', updated);
  }

  async getFaceplatesForEntity(entityId: EntityId): Promise<FaceplateRecord[]> {
    const faceplateIds = await this.readEntityList(entityId, 'Faceplates');
    return this.readFaceplates(faceplateIds);
  }

  async getChoiceLabelForField(entityId: EntityId, fieldName: string, index: number): Promise<string | null> {
    // Cache choices per field name to avoid repeated schema fetches
    if (!this.choiceLabelCache.has(fieldName)) {
      try {
        const entityTypeId = await this.inferEntityType(entityId);
        if (!entityTypeId) {
          return null;
        }
        const fieldType = await this.getFieldType(fieldName);
        const schema = await this.dataStore.getFieldSchema(entityTypeId, fieldType);
        const choices = FieldSchemaHelpers.getChoices(schema) || [];
        this.choiceLabelCache.set(fieldName, choices);
      } catch (error) {
        console.warn(`Failed to load choices for field ${fieldName}`, error);
        this.choiceLabelCache.set(fieldName, []);
      }
    }
    const choices = this.choiceLabelCache.get(fieldName) || [];
    if (index >= 0 && index < choices.length) {
      return choices[index];
    }
    return null;
  }

  private async inferEntityType(entityId: EntityId): Promise<EntityType | null> {
    try {
      return extractEntityType(entityId);
    } catch {
      return null;
    }
  }

  // Custom Component Methods
  async createCustomComponent(parentId: EntityId, name: string, definition: string): Promise<EntityId> {
    // For now, we'll store custom components as special Faceplate entities with a marker
    // In the future, a dedicated CustomComponent entity type could be added to the schema
    const customComponentType = await this.getEntityType('Faceplate');
    const componentId = await this.dataStore.createEntity(customComponentType, parentId, name);
    
    await Promise.all([
      this.writeString(componentId, 'TargetEntityType', '__CUSTOM_COMPONENT__'), // Marker to identify custom components
      this.writeString(componentId, 'Configuration', definition),
    ]);
    
    return componentId;
  }

  async readCustomComponent(componentId: EntityId): Promise<string> {
    const [value] = await this.dataStore.read(componentId, [await this.getFieldType('Configuration')]);
    if (!value || !('String' in value)) {
      return '{}';
    }
    return value.String;
  }

  async updateCustomComponent(componentId: EntityId, name: string, definition: string): Promise<void> {
    await Promise.all([
      this.writeString(componentId, 'Name', name),
      this.writeString(componentId, 'Configuration', definition),
    ]);
  }

  async deleteCustomComponent(componentId: EntityId): Promise<void> {
    await this.dataStore.deleteEntity(componentId);
  }

  async listCustomComponents(parentId?: EntityId): Promise<Array<{ id: EntityId; name: string; definition: string }>> {
    try {
      const faceplateType = await this.getEntityType('Faceplate');
      const allFaceplates = await this.dataStore.findEntities(faceplateType, null);
      
      const customComponents: Array<{ id: EntityId; name: string; definition: string }> = [];
      
      for (const id of allFaceplates) {
        const [targetTypeValue] = await this.dataStore.read(id, [await this.getFieldType('TargetEntityType')]);
        if (targetTypeValue && 'String' in targetTypeValue && targetTypeValue.String === '__CUSTOM_COMPONENT__') {
          const [nameValue] = await this.dataStore.read(id, [await this.getFieldType('Name')]);
          const [defValue] = await this.dataStore.read(id, [await this.getFieldType('Configuration')]);
          
          customComponents.push({
            id,
            name: nameValue && 'String' in nameValue ? nameValue.String : 'Unnamed',
            definition: defValue && 'String' in defValue ? defValue.String : '{}',
          });
        }
      }
      
      return customComponents;
    } catch (error) {
      console.error('Failed to list custom components:', error);
      return [];
    }
  }
}
