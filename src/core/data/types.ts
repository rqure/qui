/**
 * Type definitions matching qlib_rs exactly
 * EntityId: u64, EntityType: u32, FieldType: u64
 * All serialize as simple numbers via Serde
 */

export type EntityId = number;
export type EntityType = number;
export type FieldType = number;
export type Timestamp = number;

/**
 * Value type matching qlib_rs Value enum exactly
 * Serializes via Serde with tagged enum format: { "type": "Int", "Int": 42 }
 */
export type Value = 
  | { Bool: boolean }
  | { Int: number }
  | { Float: number }
  | { String: string }
  | { Blob: number[] }  // Vec<u8> serializes as array of numbers
  | { EntityReference: EntityId | null }
  | { EntityList: EntityId[] }
  | { Choice: number }
  | { Timestamp: Timestamp };

/**
 * Helper functions to create Value types
 */
export const ValueHelpers = {
  bool: (value: boolean): Value => ({ Bool: value }),
  int: (value: number): Value => ({ Int: value }),
  float: (value: number): Value => ({ Float: value }),
  string: (value: string): Value => ({ String: value }),
  blob: (value: number[]): Value => ({ Blob: value }),
  entityRef: (value: EntityId | null): Value => ({ EntityReference: value }),
  entityList: (value: EntityId[]): Value => ({ EntityList: value }),
  choice: (value: number): Value => ({ Choice: value }),
  timestamp: (value: Timestamp): Value => ({ Timestamp: value }),

  // Type guards
  isBool: (v: Value): v is { Bool: boolean } => 'Bool' in v,
  isInt: (v: Value): v is { Int: number } => 'Int' in v,
  isFloat: (v: Value): v is { Float: number } => 'Float' in v,
  isString: (v: Value): v is { String: string } => 'String' in v,
  isBlob: (v: Value): v is { Blob: number[] } => 'Blob' in v,
  isEntityRef: (v: Value): v is { EntityReference: EntityId | null } => 'EntityReference' in v,
  isEntityList: (v: Value): v is { EntityList: EntityId[] } => 'EntityList' in v,
  isChoice: (v: Value): v is { Choice: number } => 'Choice' in v,
  isTimestamp: (v: Value): v is { Timestamp: Timestamp } => 'Timestamp' in v,

  // Extract value
  extract: (v: Value): any => {
    if ('Bool' in v) return v.Bool;
    if ('Int' in v) return v.Int;
    if ('Float' in v) return v.Float;
    if ('String' in v) return v.String;
    if ('Blob' in v) return v.Blob;
    if ('EntityReference' in v) return v.EntityReference;
    if ('EntityList' in v) return v.EntityList;
    if ('Choice' in v) return v.Choice;
    if ('Timestamp' in v) return v.Timestamp;
    throw new Error('Unknown Value type');
  }
};

/**
 * Helper to extract EntityType from EntityId
 * In qlib_rs: EntityId has type embedded in upper 32 bits
 */
export function extractEntityType(entityId: EntityId): EntityType {
  // Type is in upper 32 bits
  return Math.floor(entityId / 0x100000000);
}

export const INDIRECTION_DELIMITER = '->';

/**
 * Field schema matching qlib_rs::FieldSchema enum
 * Rust serializes enums as tagged objects with the variant name as key
 */
export type FieldSchema = 
  | { Blob: { field_type: FieldType; default_value: number[]; rank: number; storage_scope: 'Runtime' | 'Configuration' } }
  | { Bool: { field_type: FieldType; default_value: boolean; rank: number; storage_scope: 'Runtime' | 'Configuration' } }
  | { Choice: { field_type: FieldType; default_value: number; rank: number; choices: string[]; storage_scope: 'Runtime' | 'Configuration' } }
  | { EntityList: { field_type: FieldType; default_value: EntityId[]; rank: number; storage_scope: 'Runtime' | 'Configuration' } }
  | { EntityReference: { field_type: FieldType; default_value: EntityId | null; rank: number; storage_scope: 'Runtime' | 'Configuration' } }
  | { Float: { field_type: FieldType; default_value: number; rank: number; storage_scope: 'Runtime' | 'Configuration' } }
  | { Int: { field_type: FieldType; default_value: number; rank: number; storage_scope: 'Runtime' | 'Configuration' } }
  | { String: { field_type: FieldType; default_value: string; rank: number; storage_scope: 'Runtime' | 'Configuration' } }
  | { Timestamp: { field_type: FieldType; default_value: Timestamp; rank: number; storage_scope: 'Runtime' | 'Configuration' } };

/**
 * Helper functions to work with FieldSchema enum
 */
export const FieldSchemaHelpers = {
  getRank: (schema: FieldSchema): number => {
    if ('Blob' in schema) return schema.Blob.rank;
    if ('Bool' in schema) return schema.Bool.rank;
    if ('Choice' in schema) return schema.Choice.rank;
    if ('EntityList' in schema) return schema.EntityList.rank;
    if ('EntityReference' in schema) return schema.EntityReference.rank;
    if ('Float' in schema) return schema.Float.rank;
    if ('Int' in schema) return schema.Int.rank;
    if ('String' in schema) return schema.String.rank;
    if ('Timestamp' in schema) return schema.Timestamp.rank;
    return 0;
  },
  
  setRank: (schema: FieldSchema, rank: number): FieldSchema => {
    if ('Blob' in schema) return { Blob: { ...schema.Blob, rank } };
    if ('Bool' in schema) return { Bool: { ...schema.Bool, rank } };
    if ('Choice' in schema) return { Choice: { ...schema.Choice, rank } };
    if ('EntityList' in schema) return { EntityList: { ...schema.EntityList, rank } };
    if ('EntityReference' in schema) return { EntityReference: { ...schema.EntityReference, rank } };
    if ('Float' in schema) return { Float: { ...schema.Float, rank } };
    if ('Int' in schema) return { Int: { ...schema.Int, rank } };
    if ('String' in schema) return { String: { ...schema.String, rank } };
    if ('Timestamp' in schema) return { Timestamp: { ...schema.Timestamp, rank } };
    return schema;
  },
  
  getFieldType: (schema: FieldSchema): FieldType => {
    if ('Blob' in schema) return schema.Blob.field_type;
    if ('Bool' in schema) return schema.Bool.field_type;
    if ('Choice' in schema) return schema.Choice.field_type;
    if ('EntityList' in schema) return schema.EntityList.field_type;
    if ('EntityReference' in schema) return schema.EntityReference.field_type;
    if ('Float' in schema) return schema.Float.field_type;
    if ('Int' in schema) return schema.Int.field_type;
    if ('String' in schema) return schema.String.field_type;
    if ('Timestamp' in schema) return schema.Timestamp.field_type;
    return 0;
  },
  
  getDefaultValue: (schema: FieldSchema): Value => {
    if ('Blob' in schema) return { Blob: schema.Blob.default_value };
    if ('Bool' in schema) return { Bool: schema.Bool.default_value };
    if ('Choice' in schema) return { Choice: schema.Choice.default_value };
    if ('EntityList' in schema) return { EntityList: schema.EntityList.default_value };
    if ('EntityReference' in schema) return { EntityReference: schema.EntityReference.default_value };
    if ('Float' in schema) return { Float: schema.Float.default_value };
    if ('Int' in schema) return { Int: schema.Int.default_value };
    if ('String' in schema) return { String: schema.String.default_value };
    if ('Timestamp' in schema) return { Timestamp: schema.Timestamp.default_value };
    return { String: '' };
  },
  
  setDefaultValue: (schema: FieldSchema, value: Value): FieldSchema => {
    if ('Blob' in schema && 'Blob' in value) return { Blob: { ...schema.Blob, default_value: value.Blob } };
    if ('Bool' in schema && 'Bool' in value) return { Bool: { ...schema.Bool, default_value: value.Bool } };
    if ('Choice' in schema && 'Choice' in value) return { Choice: { ...schema.Choice, default_value: value.Choice } };
    if ('EntityList' in schema && 'EntityList' in value) return { EntityList: { ...schema.EntityList, default_value: value.EntityList } };
    if ('EntityReference' in schema && 'EntityReference' in value) return { EntityReference: { ...schema.EntityReference, default_value: value.EntityReference } };
    if ('Float' in schema && 'Float' in value) return { Float: { ...schema.Float, default_value: value.Float } };
    if ('Int' in schema && 'Int' in value) return { Int: { ...schema.Int, default_value: value.Int } };
    if ('String' in schema && 'String' in value) return { String: { ...schema.String, default_value: value.String } };
    if ('Timestamp' in schema && 'Timestamp' in value) return { Timestamp: { ...schema.Timestamp, default_value: value.Timestamp } };
    return schema;
  },
  
  getStorageScope: (schema: FieldSchema): 'Runtime' | 'Configuration' => {
    if ('Blob' in schema) return schema.Blob.storage_scope;
    if ('Bool' in schema) return schema.Bool.storage_scope;
    if ('Choice' in schema) return schema.Choice.storage_scope;
    if ('EntityList' in schema) return schema.EntityList.storage_scope;
    if ('EntityReference' in schema) return schema.EntityReference.storage_scope;
    if ('Float' in schema) return schema.Float.storage_scope;
    if ('Int' in schema) return schema.Int.storage_scope;
    if ('String' in schema) return schema.String.storage_scope;
    if ('Timestamp' in schema) return schema.Timestamp.storage_scope;
    return 'Runtime';
  },
  
  getChoices: (schema: FieldSchema): string[] | null => {
    if ('Choice' in schema) return schema.Choice.choices;
    return null;
  },
  
  // Factory functions to create FieldSchema from Value
  createFromValue: (fieldType: FieldType, value: Value, rank: number, storageScope: 'Runtime' | 'Configuration' = 'Runtime'): FieldSchema => {
    if ('Blob' in value) return { Blob: { field_type: fieldType, default_value: value.Blob, rank, storage_scope: storageScope } };
    if ('Bool' in value) return { Bool: { field_type: fieldType, default_value: value.Bool, rank, storage_scope: storageScope } };
    if ('Choice' in value) return { Choice: { field_type: fieldType, default_value: value.Choice, rank, choices: [], storage_scope: storageScope } };
    if ('EntityList' in value) return { EntityList: { field_type: fieldType, default_value: value.EntityList, rank, storage_scope: storageScope } };
    if ('EntityReference' in value) return { EntityReference: { field_type: fieldType, default_value: value.EntityReference, rank, storage_scope: storageScope } };
    if ('Float' in value) return { Float: { field_type: fieldType, default_value: value.Float, rank, storage_scope: storageScope } };
    if ('Int' in value) return { Int: { field_type: fieldType, default_value: value.Int, rank, storage_scope: storageScope } };
    if ('String' in value) return { String: { field_type: fieldType, default_value: value.String, rank, storage_scope: storageScope } };
    if ('Timestamp' in value) return { Timestamp: { field_type: fieldType, default_value: value.Timestamp, rank, storage_scope: storageScope } };
    // Default fallback
    return { String: { field_type: fieldType, default_value: '', rank, storage_scope: storageScope } };
  }
};

/**
 * Entity schema matching qlib_rs::EntitySchema<Single>
 */
export interface EntitySchema {
  entity_type: EntityType;
  inherit: EntityType[];
  fields: Record<FieldType, FieldSchema>;
}

/**
 * Complete entity schema matching qlib_rs::EntitySchema<Complete>
 */
export interface CompleteEntitySchema {
  entity_type: EntityType;
  inherit: EntityType[];
  fields: Record<FieldType, FieldSchema>;
}

/**
 * Notification configuration matching qlib_rs::NotifyConfig
 */
export interface NotifyConfig {
  EntityId?: {
    entity_id: EntityId;
    field_type: FieldType;
    trigger_on_change: boolean;
    context: FieldType[][];
  };
  EntityType?: {
    entity_type: EntityType;
    field_type: FieldType;
    trigger_on_change: boolean;
    context: FieldType[][];
  };
}

/**
 * Notification info matching qlib_rs::NotifyInfo
 */
export interface NotifyInfo {
  entity_id: EntityId;
  field_path: FieldType[];
  value: Value | null;
  timestamp: Timestamp | null;
  writer_id: EntityId | null;
}

/**
 * Notification matching qlib_rs::Notification
 */
export interface Notification {
  current: NotifyInfo;
  previous: NotifyInfo;
  context: Record<string, NotifyInfo>;
  config_hash: number;
}

export interface NotificationCallback {
  (notification: Notification): void;
}

/**
 * Page options for pagination
 */
export interface PageOpts {
  limit: number;
  cursor: number | null;
}

/**
 * Page result for paginated queries
 */
export interface PageResult<T> {
  items: T[];
  total: number;
  next_cursor: number | null;
}

/**
 * Push condition for writes
 */
export enum PushCondition {
  Always = 'Always',
  Changes = 'Changes'
}

/**
 * Adjust behavior for numeric writes
 */
export enum AdjustBehavior {
  Set = 'Set',
  Add = 'Add',
  Subtract = 'Subtract'
}