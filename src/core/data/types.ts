/**
 * Simplified type definitions for qweb-based data layer
 * Removes protobuf dependencies while maintaining similar interfaces
 */

export type EntityId = string;
export type EntityType = string;
export type FieldType = string;
export type WriteTime = Date;

export enum ValueType {
  Int = "Int",
  Float = "Float",
  String = "String",
  Bool = "Bool",
  BinaryFile = "BinaryFile",
  EntityReference = "EntityReference",
  Timestamp = "Timestamp",
  Choice = "Choice",
  EntityList = "EntityList"
}

export enum WriteOpt {
  WriteNormal = 0,
  WriteChanges = 1
}

/**
 * Value implementation for qweb
 */
export class Value {
  type: ValueType;
  raw: any;

  constructor(type: ValueType, raw: any) {
    this.type = type;
    this.raw = raw;
  }

  getInt(): number { return this.raw as number; }
  getFloat(): number { return this.raw as number; }
  getString(): string { return this.raw as string; }
  getBool(): boolean { return this.raw as boolean; }
  getBinaryFile(): string { return this.raw as string; }
  getEntityReference(): EntityId { return this.raw as EntityId; }
  getTimestamp(): Date { return this.raw as Date; }
  getChoice(): number { return this.raw as number; }
  getEntityList(): EntityId[] { return this.raw as EntityId[]; }

  setInt(value: number): void { this.raw = value; }
  setFloat(value: number): void { this.raw = value; }
  setString(value: string): void { this.raw = value; }
  setBool(value: boolean): void { this.raw = value; }
  setBinaryFile(value: string): void { this.raw = value; }
  setEntityReference(value: EntityId): void { this.raw = value; }
  setTimestamp(value: Date): void { this.raw = value; }
  setChoice(value: number): void { this.raw = value; }
  setEntityList(value: EntityId[]): void { this.raw = value; }

  clone(): Value {
    return new Value(this.type, this.raw);
  }

  asString(): string {
    if (this.type === ValueType.Timestamp) {
      return (this.raw as Date).toISOString();
    }
    return String(this.raw);
  }

  equals(other: Value): boolean {
    if (this.type !== other.type) return false;
    if (this.type === ValueType.EntityList) {
      const a = this.raw as EntityId[];
      const b = other.raw as EntityId[];
      return a.length === b.length && a.every((v, i) => v === b[i]);
    }
    return this.raw === other.raw;
  }

  // Conversion to qweb JSON format
  toJSON(): any {
    if (this.type === ValueType.Timestamp) {
      return (this.raw as Date).toISOString();
    }
    return this.raw;
  }

  // Parse from qweb JSON format
  static fromJSON(type: ValueType, json: any): Value {
    if (type === ValueType.Timestamp && typeof json === 'string') {
      return new Value(type, new Date(json));
    }
    return new Value(type, json);
  }
}

/**
 * Field implementation
 */
export class Field {
  entityId: EntityId;
  fieldType: FieldType;
  value: Value;
  writeTime: WriteTime;
  writerId: EntityId;

  constructor(entityId: EntityId, fieldType: FieldType, value: Value) {
    this.entityId = entityId;
    this.fieldType = fieldType;
    this.value = value;
    this.writeTime = new Date(0);
    this.writerId = '';
  }

  clone(): Field {
    const cloned = new Field(this.entityId, this.fieldType, this.value.clone());
    cloned.writeTime = this.writeTime;
    cloned.writerId = this.writerId;
    return cloned;
  }
}

/**
 * FieldSchema implementation
 */
export class FieldSchema {
  entityType: EntityType;
  fieldType: FieldType;
  valueType: ValueType;
  readPermissions: string[];
  writePermissions: string[];
  rank: number;
  choices: string[];

  constructor(entityType: EntityType, fieldType: FieldType, valueType: ValueType) {
    this.entityType = entityType;
    this.fieldType = fieldType;
    this.valueType = valueType;
    this.readPermissions = [];
    this.writePermissions = [];
    this.rank = 0;
    this.choices = [];
  }

  clone(): FieldSchema {
    const cloned = new FieldSchema(this.entityType, this.fieldType, this.valueType);
    cloned.readPermissions = [...this.readPermissions];
    cloned.writePermissions = [...this.writePermissions];
    cloned.rank = this.rank;
    cloned.choices = [...this.choices];
    return cloned;
  }
}

/**
 * Entity implementation
 */
export class Entity {
  entityId: EntityId;
  entityType: EntityType;
  fields: Record<FieldType, Field>;

  constructor(entityId: EntityId) {
    this.entityId = entityId;
    this.entityType = '';
    this.fields = {};
  }

  field(fieldType: FieldType, value?: Value): Field {
    if (!this.fields[fieldType]) {
      this.fields[fieldType] = new Field(
        this.entityId,
        fieldType,
        value || new Value(ValueType.String, '')
      );
    }
    return this.fields[fieldType];
  }
}

/**
 * EntitySchema implementation
 */
export class EntitySchema {
  entityType: EntityType;
  fields: Record<FieldType, FieldSchema>;

  constructor(entityType: EntityType) {
    this.entityType = entityType;
    this.fields = {};
  }

  field(fieldType: FieldType, valueType?: ValueType): FieldSchema {
    if (!this.fields[fieldType]) {
      this.fields[fieldType] = new FieldSchema(
        this.entityType,
        fieldType,
        valueType || ValueType.String
      );
    }
    return this.fields[fieldType];
  }

  clone(): EntitySchema {
    const cloned = new EntitySchema(this.entityType);
    Object.keys(this.fields).forEach(key => {
      cloned.fields[key] = this.fields[key].clone();
    });
    return cloned;
  }
}

/**
 * Notification interface
 */
export interface Notification {
  token: string;
  entityId: EntityId;
  fieldType: FieldType;
  value: any;
  writeTime: Date;
  writerId: EntityId;
}

/**
 * Notification Manager
 */
export class NotificationManager {
  private listeners: Map<string, Array<(notification: Notification) => void>>;

  constructor() {
    this.listeners = new Map();
  }

  addListener(token: string, callback: (notification: Notification) => void) {
    if (!this.listeners.has(token)) {
      this.listeners.set(token, []);
    }
    this.listeners.get(token)!.push(callback);
  }

  removeListener(token: string, callback: (notification: Notification) => void) {
    const callbacks = this.listeners.get(token);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
      if (callbacks.length === 0) {
        this.listeners.delete(token);
      }
    }
  }

  hasListener(token: string): boolean {
    const callbacks = this.listeners.get(token);
    return callbacks !== undefined && callbacks.length > 0;
  }

  dispatch(token: string, notification: Notification) {
    const callbacks = this.listeners.get(token);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(notification);
        } catch (error) {
          console.error('Error in notification callback:', error);
        }
      });
    }
  }
}

/**
 * Value factories
 */
export const ValueFactories = {
  newInt: (value: number): Value => new Value(ValueType.Int, value),
  newFloat: (value: number): Value => new Value(ValueType.Float, value),
  newString: (value: string): Value => new Value(ValueType.String, value),
  newBool: (value: boolean): Value => new Value(ValueType.Bool, value),
  newBinaryFile: (value: string): Value => new Value(ValueType.BinaryFile, value),
  newEntityReference: (value: EntityId): Value => new Value(ValueType.EntityReference, value),
  newTimestamp: (value: Date): Value => new Value(ValueType.Timestamp, value),
  newChoice: (value: number): Value => new Value(ValueType.Choice, value),
  newEntityList: (value: EntityId[]): Value => new Value(ValueType.EntityList, value),
};

/**
 * Entity factories
 */
export const EntityFactories = {
  newEntity: (entityId: EntityId): Entity => new Entity(entityId),
  newEntitySchema: (entityType: EntityType): EntitySchema => new EntitySchema(entityType),
  newField: (entityId: EntityId, fieldType: FieldType, value: Value): Field => 
    new Field(entityId, fieldType, value),
  newFieldSchema: (entityType: EntityType, fieldType: FieldType, valueType: ValueType): FieldSchema =>
    new FieldSchema(entityType, fieldType, valueType),
};

/**
 * Entity options (for fluent API)
 */
export const EntityOptions = {
  withField: (fieldType: FieldType): ((entity: Entity) => void) => {
    return (entity: Entity) => {
      entity.field(fieldType);
    };
  },
  withEntityType: (entityType: EntityType): ((entity: Entity) => void) => {
    return (entity: Entity) => {
      entity.entityType = entityType;
    };
  },
};

/**
 * EntitySchema options (for fluent API)
 */
export const EntitySchemaOptions = {
  withField: (fieldType: FieldType): ((schema: EntitySchema) => void) => {
    return (schema: EntitySchema) => {
      schema.field(fieldType);
    };
  },
};

/**
 * Field schema options
 */
export const FieldSchemaOptions = {
  withValueType: (valueType: ValueType): ((schema: FieldSchema) => void) => {
    return (schema: FieldSchema) => {
      schema.valueType = valueType;
    };
  },
  withRank: (rank: number): ((schema: FieldSchema) => void) => {
    return (schema: FieldSchema) => {
      schema.rank = rank;
    };
  },
  withChoices: (choices: string[]): ((schema: FieldSchema) => void) => {
    return (schema: FieldSchema) => {
      schema.choices = choices;
    };
  },
};

/**
 * Utility functions
 */
export const Utils = {
  parseIndirection: (indirection: string): string[] => {
    return indirection.split('->');
  },
  getEntityTypeFromId: (entityId: string): string => {
    // In qweb, entity IDs don't encode type info, so we return empty string
    // Apps will need to query the entity to get its type
    return '';
  },
};

export const INDIRECTION_DELIMITER = '->';
