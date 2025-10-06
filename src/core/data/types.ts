/**
 * Type definitions matching backend exactly
 * EntityId: u64, EntityType: u32, FieldType: u64
 */

export class EntityId {
  constructor(id: string, entity_type: EntityType) {
    this.id = id;
    this.entityType = entity_type;
  }

  id: string;
  entityType: EntityType;
};

export class EntityType {
  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
  }

  id: string;
  name: string;
};

export class FieldType {
  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
  }

  id: string;
  name: string;
};

export type WriteTime = Date;

export enum ValueType {
  Int = "Int",
  Float = "Float",
  String = "String",
  Bool = "Bool",
  Blob = "Blob",
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
 * Value factories
 */
export const ValueFactories = {
  newInt: (value: number): Value => new Value(ValueType.Int, value),
  newFloat: (value: number): Value => new Value(ValueType.Float, value),
  newString: (value: string): Value => new Value(ValueType.String, value),
  newBool: (value: boolean): Value => new Value(ValueType.Bool, value),
  newBlob: (value: string): Value => new Value(ValueType.Blob, value),
  newEntityReference: (value: EntityId | null): Value => new Value(ValueType.EntityReference, value),
  newTimestamp: (value: Date): Value => new Value(ValueType.Timestamp, value),
  newChoice: (value: number): Value => new Value(ValueType.Choice, value),
  newEntityList: (value: EntityId[]): Value => new Value(ValueType.EntityList, value),
};

/**
 * Utility functions
 */
export const Utils = {
  parseIndirection: (indirection: string): string[] => {
    return indirection.split('->');
  },
};

export const INDIRECTION_DELIMITER = '->';