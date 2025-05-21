import { file_protobufs, type BinaryFile, type Bool, type Choice, type DatabaseField, type DatabaseNotification, type EntityList, type EntityReference, type Float, type Int, type String, type Timestamp } from "@/generated/protobufs_pb";
import { createRegistry, type Registry } from "@bufbuild/protobuf";
import { anyUnpack, timestampDate, timestampFromDate, type Any } from "@bufbuild/protobuf/wkt";

export const registry: Registry = createRegistry(file_protobufs);

/**
 * Represents unique identifiers for entities in the system
 */
export type EntityId = string;

/**
 * Represents the type of an entity
 */
export type EntityType = string;

/**
 * Represents a field type within an entity
 */
export type FieldType = string;

/**
 * Enum for value types
 */
export enum ValueType {
    Int = "int",
    Float = "float",
    String = "string",
    Bool = "bool",
    BinaryFile = "binary_file",
    EntityReference = "entity_reference",
    Timestamp = "timestamp",
    Choice = "choice",
    EntityList = "entity_list"
}

/**
 * Represents a write operation type
 */
export enum WriteOpt {
    WriteNormal,
    WriteChanges
}

/**
 * Represents a timestamp value
 */
export type WriteTime = Date;

/**
 * Interface for value objects
 */
export interface Value {
    type: ValueType;
    raw: any;

    pbType(): string;
    pbValue(): any;

    // Basic type getters
    getInt(): number;
    getFloat(): number;
    getString(): string;
    getBool(): boolean;
    getBinaryFile(): string;
    getEntityReference(): EntityId;
    getTimestamp(): Date;
    getChoice(): number;
    getEntityList(): EntityId[];

    // Basic type setters
    setInt(value: number): void;
    setFloat(value: number): void;
    setString(value: string): void;
    setBool(value: boolean): void;
    setBinaryFile(value: string): void;
    setEntityReference(value: EntityId): void;
    setTimestamp(value: Date): void;
    setChoice(value: number): void;
    setEntityList(value: EntityId[]): void;

    // Utility methods
    clone(): Value;
    asString(): string;
    equals(other: Value): boolean;
}

/**
 * Represents a field in an entity
 */
export interface Field {
    entityId: EntityId;
    fieldType: FieldType;
    value: Value;
    writeTime: WriteTime;
    writerId: EntityId;

    clone(): Field;
    asReadRequest(opts?: RequestOpt[]): Request;
    asWriteRequest(opts?: RequestOpt[]): Request;
}

/**
 * Represents a schema definition for a field
 */
export interface FieldSchema {
    entityType: EntityType;
    fieldType: FieldType;
    valueType: ValueType;
    rank: number;
    readPermissions: EntityId[];
    writePermissions: EntityId[];
    choices: string[];

    clone(): FieldSchema;
}

/**
 * Represents an entity in the system
 */
export interface Entity {
    entityId: EntityId;
    entityType: EntityType;
    fields: Record<FieldType, Field>;

    field(fieldType: FieldType, opts?: FieldOpt[]): Field;
    clone(): Entity;
}

/**
 * Represents the schema for an entity
 */
export interface EntitySchema {
    entityType: EntityType;
    fields: Record<FieldType, FieldSchema>;

    field(fieldType: FieldType, opts?: FieldSchemaOpt[]): FieldSchema;
    clone(): EntitySchema;
}

/**
 * Represents a request to read or write a field
 */
export interface Request {
    entityId: EntityId;
    fieldType: FieldType;
    value: Value;
    writeOpt: WriteOpt;
    writeTime?: WriteTime;
    writerId?: EntityId;
    success: boolean;
    error?: Error;

    clone(): Request;
    asField(): Field;
}

/**
 * Function type for request options
 */
export type RequestOpt = (r: Request) => void;

/**
 * Function type for field options
 */
export type FieldOpt = (f: Field) => void;

/**
 * Function type for entity options
 */
export type EntityOpt = (e: Entity) => void;

/**
 * Function type for entity schema options
 */
export type EntitySchemaOpt = (es: EntitySchema) => void;

/**
 * Function type for field schema options
 */
export type FieldSchemaOpt = (fs: FieldSchema) => void;

/**
 * Constant for indirection delimiter in field paths
 */
export const INDIRECTION_DELIMITER = "->";

/**
 * Implementation of the Value interface
 */
class ValueImpl implements Value {
    type: ValueType;
    raw: any;

    constructor(type: ValueType, raw: any) {
        this.type = type;
        this.raw = raw;
    }

    pbType(): string {
        // Fix: Map ValueType to correct protobuf type name
        // The error shows it expects qprotobufs.Entity_reference, not EntityReference
        const typeMap: Record<ValueType, string> = {
            [ValueType.Int]: 'qprotobufs.Int',
            [ValueType.Float]: 'qprotobufs.Float',
            [ValueType.String]: 'qprotobufs.String',
            [ValueType.Bool]: 'qprotobufs.Bool',
            [ValueType.BinaryFile]: 'qprotobufs.BinaryFile',
            [ValueType.EntityReference]: 'qprotobufs.EntityReference',
            [ValueType.Timestamp]: 'qprotobufs.Timestamp',
            [ValueType.Choice]: 'qprotobufs.Choice',
            [ValueType.EntityList]: 'qprotobufs.EntityList'
        };
        
        return typeMap[this.type] || 'qprotobufs.String'; // Default to String if type not found
    }
    
    pbValue(): any {
        if (this.type === ValueType.Timestamp) {
            return timestampFromDate(this.raw);
        }

        return this.raw;
    }

    // Type getters
    getInt(): number {
        return this.type === ValueType.Int ? this.raw : 0;
    }

    getFloat(): number {
        return this.type === ValueType.Float ? this.raw : 0.0;
    }

    getString(): string {
        return this.type === ValueType.String ? this.raw : "";
    }

    getBool(): boolean {
        return this.type === ValueType.Bool ? this.raw : false;
    }

    getBinaryFile(): string {
        return this.type === ValueType.BinaryFile ? this.raw : "";
    }

    getEntityReference(): EntityId {
        return this.type === ValueType.EntityReference ? this.raw : "";
    }

    getTimestamp(): Date {
        return this.type === ValueType.Timestamp ? this.raw : new Date(0);
    }

    getChoice(): number {
        return this.type === ValueType.Choice ? this.raw : 0;
    }

    getEntityList(): EntityId[] {
        return this.type === ValueType.EntityList ? this.raw : [];
    }

    // Type setters
    setInt(value: number): void {
        if (this.type === ValueType.Int) {
            this.raw = value;
        }
    }

    setFloat(value: number): void {
        if (this.type === ValueType.Float) {
            this.raw = value;
        }
    }

    setString(value: string): void {
        if (this.type === ValueType.String) {
            this.raw = value;
        }
    }

    setBool(value: boolean): void {
        if (this.type === ValueType.Bool) {
            this.raw = value;
        }
    }

    setBinaryFile(value: string): void {
        if (this.type === ValueType.BinaryFile) {
            this.raw = value;
        }
    }

    setEntityReference(value: EntityId): void {
        if (this.type === ValueType.EntityReference) {
            this.raw = value;
        }
    }

    setTimestamp(value: Date): void {
        if (this.type === ValueType.Timestamp) {
            this.raw = value;
        }
    }

    setChoice(value: number): void {
        if (this.type === ValueType.Choice) {
            this.raw = value;
        }
    }

    setEntityList(value: EntityId[]): void {
        if (this.type === ValueType.EntityList) {
            this.raw = value;
        }
    }

    // Utility methods
    clone(): Value {
        let newValue: Value;

        switch (this.type) {
            case ValueType.Int:
                newValue = ValueFactories.newInt(this.raw);
                break;
            case ValueType.Float:
                newValue = ValueFactories.newFloat(this.raw);
                break;
            case ValueType.String:
                newValue = ValueFactories.newString(this.raw);
                break;
            case ValueType.Bool:
                newValue = ValueFactories.newBool(this.raw);
                break;
            case ValueType.BinaryFile:
                newValue = ValueFactories.newBinaryFile(this.raw);
                break;
            case ValueType.EntityReference:
                newValue = ValueFactories.newEntityReference(this.raw);
                break;
            case ValueType.Timestamp:
                newValue = ValueFactories.newTimestamp(new Date(this.raw.getTime()));
                break;
            case ValueType.Choice:
                newValue = ValueFactories.newChoice(this.raw);
                break;
            case ValueType.EntityList:
                newValue = ValueFactories.newEntityList([...this.raw]);
                break;
            default:
                newValue = ValueFactories.newString("");
        }

        return newValue;
    }

    asString(): string {
        switch (this.type) {
            case ValueType.Int:
            case ValueType.Float:
                return this.raw.toString();
            case ValueType.String:
            case ValueType.BinaryFile:
            case ValueType.EntityReference:
                return this.raw;
            case ValueType.Bool:
                return this.raw ? "true" : "false";
            case ValueType.Timestamp:
                return this.raw.toISOString();
            case ValueType.Choice:
                return this.raw.toString();
            case ValueType.EntityList:
                return this.raw.join(",");
            default:
                return "";
        }
    }

    equals(other: Value): boolean {
        if (this.type !== other.type) {
            return false;
        }

        switch (this.type) {
            case ValueType.Int:
            case ValueType.Float:
            case ValueType.String:
            case ValueType.Bool:
            case ValueType.BinaryFile:
            case ValueType.EntityReference:
            case ValueType.Choice:
                return this.raw === other.raw;
            case ValueType.Timestamp:
                return this.raw.getTime() === other.getTimestamp().getTime();
            case ValueType.EntityList: {
                const a = this.raw;
                const b = other.getEntityList();
                if (a.length !== b.length) return false;
                for (let i = 0; i < a.length; i++) {
                    if (a[i] !== b[i]) return false;
                }
                return true;
            }
            default:
                return false;
        }
    }
}

/**
 * Helper functions for working with values
 */
export const ValueFactories = {
    newInt: (value: number): Value => new ValueImpl(ValueType.Int, value),
    newFloat: (value: number): Value => new ValueImpl(ValueType.Float, value),
    newString: (value: string): Value => new ValueImpl(ValueType.String, value),
    newBool: (value: boolean): Value => new ValueImpl(ValueType.Bool, value),
    newBinaryFile: (value: string): Value => new ValueImpl(ValueType.BinaryFile, value),
    newEntityReference: (value: EntityId): Value => new ValueImpl(ValueType.EntityReference, value),
    newTimestamp: (value: Date): Value => new ValueImpl(ValueType.Timestamp, value),
    newChoice: (value: number): Value => new ValueImpl(ValueType.Choice, value),
    newEntityList: (value: EntityId[]): Value => new ValueImpl(ValueType.EntityList, value),
};

/**
 * Implementation of the Field interface
 */
class FieldImpl implements Field {
    entityId: EntityId;
    fieldType: FieldType;
    value: Value;
    writeTime: WriteTime;
    writerId: EntityId;

    constructor(
        entityId: EntityId,
        fieldType: FieldType,
        value: Value,
        writeTime: WriteTime = new Date(),
        writerId: EntityId = ""
    ) {
        this.entityId = entityId;
        this.fieldType = fieldType;
        this.value = value;
        this.writeTime = writeTime;
        this.writerId = writerId;
    }

    clone(): Field {
        return new FieldImpl(
            this.entityId,
            this.fieldType,
            this.value.clone(),
            new Date(this.writeTime.getTime()),
            this.writerId
        );
    }

    asReadRequest(opts: RequestOpt[] = []): Request {
        const request = new RequestImpl(
            this.entityId,
            this.fieldType,
            this.value,
            WriteOpt.WriteNormal,
            this.writeTime,
            this.writerId,
            true
        );

        // Apply any optional request options
        opts.forEach(opt => opt(request));
        return request;
    }

    asWriteRequest(opts: RequestOpt[] = []): Request {
        const request = new RequestImpl(
            this.entityId,
            this.fieldType,
            this.value,
            WriteOpt.WriteNormal,
            this.writeTime,
            this.writerId,
            true
        );

        // Apply any optional request options
        opts.forEach(opt => opt(request));
        return request;
    }
}

/**
 * Implementation of the FieldSchema interface
 */
class FieldSchemaImpl implements FieldSchema {
    entityType: EntityType;
    fieldType: FieldType;
    valueType: ValueType;
    rank: number;
    readPermissions: EntityId[];
    writePermissions: EntityId[];
    choices: string[];

    constructor(
        entityType: EntityType,
        fieldType: FieldType,
        valueType: ValueType,
        rank: number = 0,
        readPermissions: EntityId[] = [],
        writePermissions: EntityId[] = [],
        choices: string[] = []
    ) {
        this.entityType = entityType;
        this.fieldType = fieldType;
        this.valueType = valueType;
        this.rank = rank;
        this.readPermissions = readPermissions;
        this.writePermissions = writePermissions;
        this.choices = choices;
    }

    clone(): FieldSchema {
        return new FieldSchemaImpl(
            this.entityType,
            this.fieldType,
            this.valueType,
            this.rank,
            [...this.readPermissions],
            [...this.writePermissions],
            [...this.choices]
        );
    }
}

/**
 * Implementation of the Entity interface
 */
class EntityImpl implements Entity {
    entityId: EntityId;
    entityType: EntityType;
    fields: Record<FieldType, Field>;

    constructor(entityId: EntityId, fields: Record<FieldType, Field> = {}) {
        this.entityId = entityId;
        this.entityType = Utils.getEntityTypeFromId(entityId);
        this.fields = fields;
    }

    field(fieldType: FieldType, opts: FieldOpt[] = []): Field {
        if (this.fields[fieldType]) {
            return this.fields[fieldType];
        }

        // Create a new field with default empty value
        const newField = new FieldImpl(
            this.entityId,
            fieldType,
            ValueFactories.newString("")
        );

        // Apply any optional field options
        opts.forEach(opt => opt(newField));

        this.fields[fieldType] = newField;
        return newField;
    }

    clone(): Entity {
        const clonedFields: Record<FieldType, Field> = {};
        for (const [key, value] of Object.entries(this.fields)) {
            clonedFields[key as FieldType] = value.clone();
        }

        return new EntityImpl(this.entityId, clonedFields);
    }
}

/**
 * Implementation of the EntitySchema interface
 */
class EntitySchemaImpl implements EntitySchema {
    entityType: EntityType;
    fields: Record<FieldType, FieldSchema>;

    constructor(entityType: EntityType, fields: Record<FieldType, FieldSchema> = {}) {
        this.entityType = entityType;
        this.fields = fields;
    }

    field(fieldType: FieldType, opts: FieldSchemaOpt[] = []): FieldSchema {
        if (this.fields[fieldType]) {
            return this.fields[fieldType];
        }

        // Create a new field schema with default values
        const newFieldSchema = new FieldSchemaImpl(
            this.entityType,
            fieldType,
            ValueType.String
        );

        // Apply any optional field schema options
        opts.forEach(opt => opt(newFieldSchema));

        this.fields[fieldType] = newFieldSchema;
        return newFieldSchema;
    }

    clone(): EntitySchema {
        const clonedFields: Record<FieldType, FieldSchema> = {};
        for (const [key, value] of Object.entries(this.fields)) {
            clonedFields[key as FieldType] = value.clone();
        }

        return new EntitySchemaImpl(this.entityType, clonedFields);
    }
}

/**
 * Implementation of the Request interface
 */
class RequestImpl implements Request {
    entityId: EntityId;
    fieldType: FieldType;
    value: Value;
    writeOpt: WriteOpt;
    writeTime?: WriteTime;
    writerId?: EntityId;
    success: boolean;
    error?: Error;

    constructor(
        entityId: EntityId,
        fieldType: FieldType,
        value: Value,
        writeOpt: WriteOpt = WriteOpt.WriteNormal,
        writeTime?: WriteTime,
        writerId?: EntityId,
        success: boolean = false,
        error?: Error
    ) {
        this.entityId = entityId;
        this.fieldType = fieldType;
        this.value = value;
        this.writeOpt = writeOpt;
        this.writeTime = writeTime;
        this.writerId = writerId;
        this.success = success;
        this.error = error;
    }

    clone(): Request {
        return new RequestImpl(
            this.entityId,
            this.fieldType,
            this.value.clone(),
            this.writeOpt,
            this.writeTime ? new Date(this.writeTime.getTime()) : undefined,
            this.writerId,
            this.success,
            this.error
        );
    }

    asField(): Field {
        return new FieldImpl(
            this.entityId,
            this.fieldType,
            this.value,
            this.writeTime || new Date(),
            this.writerId || ""
        );
    }
}

/**
 * Factory functions for creating entities and entity schemas
 */
export const EntityFactories = {
    newEntity: (entityId: EntityId): Entity => {
        return new EntityImpl(entityId);
    },

    newEntitySchema: (entityType: EntityType): EntitySchema => {
        return new EntitySchemaImpl(entityType);
    },

    newField: (entityId: EntityId, fieldType: FieldType, value: Value): Field => {
        return new FieldImpl(entityId, fieldType, value);
    },

    newFieldSchema: (entityType: EntityType, fieldType: FieldType, valueType: ValueType): FieldSchema => {
        return new FieldSchemaImpl(entityType, fieldType, valueType);
    },

    newRequest: (entityId: EntityId, fieldType: FieldType, value: Value): Request => {
        return new RequestImpl(entityId, fieldType, value);
    }
};

/**
 * Option functions for Entity
 */
export const EntityOptions = {
    withField: (fieldType: FieldType, opts: FieldOpt[] = []): EntityOpt => {
        return (e: Entity) => {
            e.field(fieldType, opts);
        };
    },

    withEntityType: (entityType: EntityType): EntityOpt => {
        return (e: Entity) => {
            (e as EntityImpl).entityType = entityType;
        };
    }
};

/**
 * Option functions for EntitySchema
 */
export const EntitySchemaOptions = {
    withField: (fieldType: FieldType, opts: FieldSchemaOpt[] = []): EntitySchemaOpt => {
        return (es: EntitySchema) => {
            es.field(fieldType, opts);
        };
    }
};

/**
 * Option functions for Field
 */
export const FieldOptions = {
    withValue: (value: Value): FieldOpt => {
        return (f: Field) => {
            (f as FieldImpl).value = value;
        };
    },

    withWriteTime: (writeTime: WriteTime): FieldOpt => {
        return (f: Field) => {
            (f as FieldImpl).writeTime = writeTime;
        };
    },

    withWriterId: (writerId: EntityId): FieldOpt => {
        return (f: Field) => {
            (f as FieldImpl).writerId = writerId;
        };
    }
};

/**
 * Option functions for FieldSchema
 */
export const FieldSchemaOptions = {
    withValueType: (valueType: ValueType): FieldSchemaOpt => {
        return (fs: FieldSchema) => {
            (fs as FieldSchemaImpl).valueType = valueType;
        };
    },

    withRank: (rank: number): FieldSchemaOpt => {
        return (fs: FieldSchema) => {
            (fs as FieldSchemaImpl).rank = rank;
        };
    },

    withReadPermissions: (permissions: EntityId[]): FieldSchemaOpt => {
        return (fs: FieldSchema) => {
            (fs as FieldSchemaImpl).readPermissions = permissions;
        };
    },

    withWritePermissions: (permissions: EntityId[]): FieldSchemaOpt => {
        return (fs: FieldSchema) => {
            (fs as FieldSchemaImpl).writePermissions = permissions;
        };
    },

    withChoices: (choices: string[]): FieldSchemaOpt => {
        return (fs: FieldSchema) => {
            (fs as FieldSchemaImpl).choices = choices;
        };
    }
};

/**
 * Option functions for Request
 */
export const RequestOptions = {
    withWriteOpt: (writeOpt: WriteOpt): RequestOpt => {
        return (r: Request) => {
            (r as RequestImpl).writeOpt = writeOpt;
        };
    },

    withWriteTime: (writeTime: WriteTime): RequestOpt => {
        return (r: Request) => {
            (r as RequestImpl).writeTime = writeTime;
        };
    },

    withWriterId: (writerId: EntityId): RequestOpt => {
        return (r: Request) => {
            (r as RequestImpl).writerId = writerId;
        };
    },

    withSuccess: (success: boolean): RequestOpt => {
        return (r: Request) => {
            (r as RequestImpl).success = success;
        };
    },

    withError: (error: Error): RequestOpt => {
        return (r: Request) => {
            (r as RequestImpl).error = error;
        };
    }
};

/**
 * Helper utility functions
 */
export const Utils = {
    generateEntityId: (entityType: EntityType): EntityId => `${entityType}$${Date.now()}`,
    castStringSliceToEntityIdSlice: (strings: string[]): EntityId[] => strings,
    castEntityIdSliceToStringSlice: (entityIds: EntityId[]): string[] => entityIds,
    getEntityTypeFromId: (entityId: EntityId): EntityType => {
        const parts = entityId.split('$');
        return parts[0] as EntityType;
    }
};



// Add helper function to convert values from protobuf
export function valueFromProtobuf(anyValue: Any): Value {
    // This is a simplified implementation - in a real app you'd need to
    // check the type in the Any message and properly deserialize it
    const typeUrl = anyValue.typeUrl.split('/').pop() || '';
    const typeSchema = registry.getMessage(typeUrl);
    if (!typeSchema) {
        console.warn(`No schema found for type URL: ${typeUrl}`);
        return ValueFactories.newString(''); // Default to string value
    }

    const value = anyUnpack(anyValue, typeSchema);
    
    if (typeUrl.includes('Int')) {
        const intValue = value as Int;
        return ValueFactories.newInt(Number(intValue.raw));
    } else if (typeUrl.includes('Float')) {
        const floatValue = value as Float;
        return ValueFactories.newFloat(Number(floatValue.raw));
    } else if (typeUrl.includes('String')) {
        const stringValue = value as String;
        return ValueFactories.newString(stringValue.raw);
    } else if (typeUrl.includes('Bool')) {
        const boolValue = value as Bool;
        return ValueFactories.newBool(boolValue.raw);
    } else if (typeUrl.includes('EntityReference')) {
        const entityRefValue = value as EntityReference;
        return ValueFactories.newEntityReference(entityRefValue.raw);
    } else if (typeUrl.includes('Timestamp')) {
        const timestampValue = value as Timestamp;
        if (timestampValue.raw) {
            return ValueFactories.newTimestamp(timestampDate(timestampValue.raw));
        }

        console.warn('Timestamp value is empty');
        return ValueFactories.newTimestamp(new Date(0));
    } else if (typeUrl.includes('BinaryFile')) {
        const binaryFileValue = value as BinaryFile;
        return ValueFactories.newBinaryFile(binaryFileValue.raw);
    } else if (typeUrl.includes('Choice')) {
        const choiceValue = value as Choice;
        return ValueFactories.newChoice(Number(choiceValue.raw));
    } else if (typeUrl.includes('EntityList')) {
        const entityListValue = value as EntityList;
        return ValueFactories.newEntityList(entityListValue.raw);
    }

    return ValueFactories.newString('');
}

export class Notification {
    public current?: Field;
    public previous?: Field;
    public contexts?: Field[];

    constructor(notification: DatabaseNotification) {
        this.current = notification.current ? new FieldImpl(
            notification.current.id,
            notification.current.name,
            notification.current.value ? valueFromProtobuf(notification.current.value) : ValueFactories.newString(''),
            notification.current.writeTime ? timestampDate(notification.current.writeTime) : new Date(0),
            notification.current.writerId ? notification.current.writerId : ''
        ): undefined;

        this.previous = notification.previous ? new FieldImpl(
            notification.previous.id,
            notification.previous.name,
            notification.previous.value ? valueFromProtobuf(notification.previous.value) : ValueFactories.newString(''),
            notification.previous.writeTime ? timestampDate(notification.previous.writeTime) : new Date(0),
            notification.previous.writerId ? notification.previous.writerId : ''
        ) : undefined;

        this.contexts = notification.context.map((context: DatabaseField) => {
            return new FieldImpl(
                context.id,
                context.name,
                context.value ? valueFromProtobuf(context.value) : ValueFactories.newString(''),
                context.writeTime ? timestampDate(context.writeTime) : new Date(0),
                context.writerId ? context.writerId : ''
            );
        });
    }
}

class NotificationListener {
    private token: string;
    private callback: (event: Notification) => void;

    constructor(token: string, callback: (event: Notification) => void) {
        this.token = token;
        this.callback = callback;
    }

    get getToken(): string {
        return this.token;
    }

    get getCallback(): (event: Notification) => void {
        return this.callback;
    }
}

export class NotificationManager {
    private listeners: Record<string, NotificationListener[]> = {};

    constructor() {
        this.listeners = {};
    }

    addListener(token: string, callback: (notification: Notification) => void): this {
        if (!this.listeners[token]) {
            this.listeners[token] = [];
        }

        this.listeners[token].push(new NotificationListener(token, callback));

        return this;
    }

    removeListener(token: string, callback: (notification: Notification) => void): this {
        if (!this.listeners[token]) {
            return this;
        }

        this.listeners[token] = this.listeners[token].filter(listener => listener.getCallback !== callback);
        return this;
    }

    dispatch(eventName: string, notification: DatabaseNotification): void {
        if (!this.listeners[eventName]) {
            return;
        }

        this.listeners[eventName].forEach(listener => listener.getCallback(new Notification(notification)));
    }
}