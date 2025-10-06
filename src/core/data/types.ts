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