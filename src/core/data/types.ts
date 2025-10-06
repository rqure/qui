/**
 * Type definitions matching backend exactly
 * EntityId: u64, EntityType: u32, FieldType: u64
 */

export type EntityId = number;
export type EntityType = number;
export type FieldType = number;
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
  getString(): string {
    if (typeof this.raw === 'string') {
      return this.raw;
    } else if (this.raw instanceof Uint8Array) {
      return new TextDecoder().decode(this.raw);
    }
    return String(this.raw);
  }
  getBool(): boolean { return this.raw as boolean; }
  getBinaryFile(): string { return this.raw as string; }
  getEntityReference(): EntityId | null { return this.raw as EntityId | null; }
  getTimestamp(): Date { return this.raw as Date; }
  getChoice(): number { return this.raw as number; }
  getEntityList(): EntityId[] { return this.raw as EntityId[]; }

  setInt(value: number): void { this.raw = value; }
  setFloat(value: number): void { this.raw = value; }
  setString(value: string): void { this.raw = value; }
  setBool(value: boolean): void { this.raw = value; }
  setBinaryFile(value: string): void { this.raw = value; }
  setEntityReference(value: EntityId | null): void { this.raw = value; }
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
  fieldType: FieldType | string;
  value: Value;
  writeTime: WriteTime;
  writerId: EntityId | null;

  constructor(entityId: EntityId, fieldType: FieldType | string, value: Value) {
    this.entityId = entityId;
    this.fieldType = fieldType as FieldType | string;
    this.value = value;
    this.writeTime = new Date(0);
    this.writerId = null;
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
  // Use string keys so fields can be referenced by numeric id or by name
  fields: Record<string, Field>;

  constructor(entityId: EntityId) {
    this.entityId = entityId;
    this.entityType = 0;
    this.fields = {};
  }

  field(fieldType: FieldType | string, value?: Value): Field {
    // Coerce numeric-looking string field types into numbers so the
    // rest of the app can treat most field IDs as numeric internally.
    const resolvedFieldType: FieldType | string = (typeof fieldType === 'string' && !isNaN(Number(fieldType)))
      ? Number(fieldType)
      : fieldType;

    const key = resolvedFieldType.toString();
    if (!this.fields[key]) {
      this.fields[key] = new Field(
        this.entityId,
        resolvedFieldType as FieldType,
        value || new Value(ValueType.String, '')
      );
      // ensure the Field stores the resolved (possibly numeric) fieldType
      this.fields[key].fieldType = resolvedFieldType as FieldType | string;
    }
    return this.fields[key];
  }
}

/**
 * EntitySchema implementation
 */
export class EntitySchema {
  entityType: EntityType;
  // Use string keys for schema fields as well
  fields: Record<string, FieldSchema>;

  constructor(entityType: EntityType) {
    this.entityType = entityType;
    this.fields = {};
  }

  field(fieldType: FieldType | string, valueType?: ValueType): FieldSchema {
    const key = fieldType.toString();
    if (!this.fields[key]) {
      this.fields[key] = new FieldSchema(
        this.entityType,
        fieldType as FieldType,
        valueType || ValueType.String
      );
      // ensure FieldSchema stores numeric fieldType where applicable
      this.fields[key].fieldType = (typeof fieldType === 'string' && !isNaN(Number(fieldType))) ? Number(fieldType) as FieldType : (fieldType as FieldType);
    }
    return this.fields[key];
  }

  clone(): EntitySchema {
    const cloned = new EntitySchema(this.entityType);
    Object.keys(this.fields).forEach(key => {
      const fieldType = Number(key) as FieldType;
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
  newEntityReference: (value: EntityId | null): Value => new Value(ValueType.EntityReference, value),
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
  getEntityTypeFromId: (entityId: string | number): number => {
    // In qweb, entity IDs encode type info in upper 32 bits
    // Accept both numeric and string IDs; convert to string for BigInt.
    try {
      const idStr = typeof entityId === 'number' ? entityId.toString() : entityId;
      const id = BigInt(idStr);
      const entityType = Number(id >> 32n);
      return entityType;
    } catch (e) {
      console.error('Failed to extract entity type from ID:', e);
      return 0;
    }
  },
};

export const INDIRECTION_DELIMITER = '->';
