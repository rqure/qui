import type { EntityId, EntityType, FieldType, Value } from '@/core/data/types';
import { ValueHelpers, FieldSchemaHelpers, extractEntityType } from '@/core/data/types';
import { useDataStore } from '@/stores/data';
import type { BindingMode } from '@/apps/faceplate-builder/types';

export type DataStore = ReturnType<typeof useDataStore>;

export interface SchematicBindingDefinition {
  component: string;
  property: string;
  expression: string;
  transform?: string;
  mode?: BindingMode;
  dependencies?: string[];
  description?: string;
}

export interface SchematicLayoutItem {
  component: string;
  x: number;
  y: number;
  w?: number;
  h?: number;
  parentId?: string | null;
}

export interface SchematicNotificationChannel {
  fields: string[];
  entityType?: string;
  triggerOnChange?: boolean;
}

export interface SchematicScriptModule {
  name: string;
  description?: string;
  code: string;
}

export interface SchematicConfiguration {
  layout: SchematicLayoutItem[];
  bindings: SchematicBindingDefinition[];
  eventHandlers?: Array<{
    id: string;
    componentId: string;
    trigger: string;
    action: Record<string, unknown>;
    description?: string;
    enabled?: boolean;
  }>;
  metadata?: Record<string, unknown>;
}

export interface SchematicRecord {
  id: EntityId;
  name: string;
  configurationRaw: string;
  configuration: SchematicConfiguration;
  bindingsRaw: string;
  bindings: SchematicBindingDefinition[];
  components: EntityId[];
  notificationChannelsRaw: string;
  notificationChannels: SchematicNotificationChannel[];
  scriptModulesRaw: string;
  scriptModules: SchematicScriptModule[];
}

export interface SchematicComponentRecord {
  id: EntityId;
  name: string;
  componentType: string;
  configurationRaw: string;
  configuration: Record<string, unknown>;
  bindingsRaw: string;
  bindings: SchematicBindingDefinition[];
  animationRulesRaw: string;
  animationRules: Array<Record<string, unknown>>;
}

function safeParseJson<T>(input: string | null | undefined, fallback: T): T {
  if (!input) {
    return fallback;
  }
  try {
    return JSON.parse(input) as T;
  } catch (error) {
    console.warn('Failed to parse JSON:', input, error);
    return fallback;
  }
}

function ensureArray<T>(value: T[] | T | null | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export class SchematicDataService {
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

  async getChoiceLabelForField(entityId: EntityId, fieldName: string, choiceIndex: number): Promise<string | null> {
    const cacheKey = `${entityId}:${fieldName}`;
    if (!this.choiceLabelCache.has(cacheKey)) {
      try {
        // For now, just return null as we don't have a way to get entity types by ID
        // This is a limitation we can work with for the initial implementation
        return null;
      } catch (error) {
        console.warn(`Failed to get choice labels for ${fieldName}:`, error);
        return null;
      }
    }
    const labels = this.choiceLabelCache.get(cacheKey);
    return labels?.[choiceIndex] ?? null;
  }

  async readSchematic(schematicId: EntityId): Promise<SchematicRecord> {
    const name = await this.readString(schematicId, 'Name', `Schematic ${schematicId}`);
    const configurationRaw = await this.readString(schematicId, 'Configuration', '{}');
    const bindingsRaw = await this.readString(schematicId, 'Bindings', '[]');
    const components = await this.readEntityList(schematicId, 'Components');
    const notificationChannelsRaw = await this.readString(schematicId, 'NotificationChannels', '[]');
    const scriptModulesRaw = await this.readString(schematicId, 'ScriptModules', '[]');

    const configuration = safeParseJson<SchematicConfiguration>(configurationRaw, { layout: [], bindings: [] });
    configuration.layout = ensureArray(configuration.layout);
    configuration.bindings = ensureArray(configuration.bindings);

    const bindings = safeParseJson<SchematicBindingDefinition[]>(bindingsRaw, []);
    const notificationChannels = safeParseJson<SchematicNotificationChannel[]>(notificationChannelsRaw, []);
    const scriptModules = safeParseJson<SchematicScriptModule[]>(scriptModulesRaw, []);

    return {
      id: schematicId,
      name,
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

  async readSchematics(schematicIds: EntityId[]): Promise<SchematicRecord[]> {
    return Promise.all(schematicIds.map((id) => this.readSchematic(id)));
  }

  async readComponent(componentId: EntityId): Promise<SchematicComponentRecord> {
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
    const bindings = safeParseJson<SchematicBindingDefinition[]>(bindingsRaw, []);
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

  async readComponents(componentIds: EntityId[]): Promise<SchematicComponentRecord[]> {
    return Promise.all(componentIds.map((id) => this.readComponent(id)));
  }

  async writeValue(entityId: EntityId, fieldName: string, value: any): Promise<void> {
    const fieldType = await this.getFieldType(fieldName);
    
    let valueObj: Value;
    if (typeof value === 'boolean') {
      valueObj = ValueHelpers.bool(value);
    } else if (typeof value === 'number') {
      valueObj = Number.isInteger(value) ? ValueHelpers.int(value) : ValueHelpers.float(value);
    } else if (typeof value === 'string') {
      valueObj = ValueHelpers.string(value);
    } else if (Array.isArray(value) && value.every(v => typeof v === 'number' && Number.isInteger(v))) {
      valueObj = ValueHelpers.entityList(value);
    } else {
      valueObj = ValueHelpers.string(JSON.stringify(value));
    }
    
    await this.dataStore.write(entityId, [fieldType], valueObj);
  }

  async readValueIndirect(entityId: EntityId, fieldPath: string): Promise<any> {
    const INDIRECTION_DELIMITER = '->';
    
    if (!fieldPath.includes(INDIRECTION_DELIMITER)) {
      const value = await this.readValue(entityId, fieldPath);
      return value ? ValueHelpers.extract(value) : null;
    }

    const segments = fieldPath.split(INDIRECTION_DELIMITER).map(s => s.trim());
    const fieldTypes: FieldType[] = [];
    
    for (const segment of segments) {
      const fieldType = await this.getFieldType(segment);
      fieldTypes.push(fieldType);
    }

    const [value] = await this.dataStore.read(entityId, fieldTypes);
    return value ? ValueHelpers.extract(value) : null;
  }

  async writeValueIndirect(entityId: EntityId, fieldPath: string, value: any): Promise<void> {
    const INDIRECTION_DELIMITER = '->';
    
    if (!fieldPath.includes(INDIRECTION_DELIMITER)) {
      return this.writeValue(entityId, fieldPath, value);
    }

    const segments = fieldPath.split(INDIRECTION_DELIMITER).map(s => s.trim());
    const fieldTypes: FieldType[] = [];
    
    for (const segment of segments) {
      const fieldType = await this.getFieldType(segment);
      fieldTypes.push(fieldType);
    }

    let currentEntityId = entityId;
    for (let i = 0; i < fieldTypes.length - 1; i++) {
      const readResult = await this.dataStore.read(currentEntityId, [fieldTypes[i]]);
      if (!readResult) {
        throw new Error(`Failed to read field at segment ${segments[i]}`);
      }
      const [value] = readResult;
      if (!ValueHelpers.isEntityRef(value)) {
        throw new Error(`Field at segment ${segments[i]} is not an entity reference`);
      }
      const nextEntityId = value.EntityReference;
      if (nextEntityId === null) {
        throw new Error(`Null entity reference at segment ${segments[i]}`);
      }
      currentEntityId = nextEntityId;
    }

    const finalFieldName = segments[segments.length - 1];
    await this.writeValue(currentEntityId, finalFieldName, value);
  }

  async writeString(entityId: EntityId, fieldName: string, value: string): Promise<void> {
    const fieldType = await this.getFieldType(fieldName);
    await this.dataStore.write(entityId, [fieldType], ValueHelpers.string(value));
  }

  async writeEntityList(entityId: EntityId, fieldName: string, items: EntityId[]): Promise<void> {
    const fieldType = await this.getFieldType(fieldName);
    await this.dataStore.write(entityId, [fieldType], ValueHelpers.entityList(items));
  }

  async writeSchematic(schematic: {
    id: EntityId;
    name: string;
    configuration: SchematicConfiguration;
    components: EntityId[];
    notificationChannels: SchematicNotificationChannel[];
    scriptModules: SchematicScriptModule[];
  }): Promise<void> {
    await Promise.all([
      this.writeString(schematic.id, 'Name', schematic.name),
      this.writeString(schematic.id, 'Configuration', JSON.stringify(schematic.configuration)),
      this.writeEntityList(schematic.id, 'Components', schematic.components),
      this.writeString(schematic.id, 'NotificationChannels', JSON.stringify(schematic.notificationChannels)),
      this.writeString(schematic.id, 'ScriptModules', JSON.stringify(schematic.scriptModules ?? [])),
    ]);
  }

  async writeComponent(component: SchematicComponentRecord): Promise<void> {
    await Promise.all([
      this.writeString(component.id, 'Name', component.name),
      this.writeString(component.id, 'ComponentType', component.componentType),
      this.writeString(component.id, 'Configuration', JSON.stringify(component.configuration)),
      this.writeString(component.id, 'Bindings', JSON.stringify(component.bindings)),
      this.writeString(component.id, 'AnimationRules', JSON.stringify(component.animationRules)),
    ]);
  }

  async createSchematic(parentId: EntityId, name: string): Promise<EntityId> {
    const schematicEntityType = await this.getEntityType('Schematic');
    const schematicId = await this.dataStore.createEntity(schematicEntityType, parentId, name);
    
    await Promise.all([
      this.writeString(schematicId, 'Configuration', JSON.stringify({ layout: [], bindings: [], metadata: {} })),
      this.writeEntityList(schematicId, 'Components', []),
      this.writeString(schematicId, 'NotificationChannels', JSON.stringify([])),
      this.writeString(schematicId, 'ScriptModules', JSON.stringify([])),
    ]);
    
    return schematicId;
  }

  async createComponent(parentId: EntityId, name: string, componentType: string): Promise<EntityId> {
    const componentEntityType = await this.getEntityType('SchematicComponent');
    const componentId = await this.dataStore.createEntity(componentEntityType, parentId, name);
    
    await Promise.all([
      this.writeString(componentId, 'ComponentType', componentType),
      this.writeString(componentId, 'Configuration', JSON.stringify({})),
      this.writeString(componentId, 'Bindings', JSON.stringify([])),
      this.writeString(componentId, 'AnimationRules', JSON.stringify([])),
    ]);
    
    return componentId;
  }

  async getSchematicsForEntity(entityId: EntityId): Promise<SchematicRecord[]> {
    const schematicIds = await this.readEntityList(entityId, 'Schematics');
    return this.readSchematics(schematicIds);
  }

  async deleteComponent(componentId: EntityId): Promise<void> {
    await this.dataStore.deleteEntity(componentId);
  }

  async deleteSchematic(schematicId: EntityId): Promise<void> {
    await this.dataStore.deleteEntity(schematicId);
  }
}
