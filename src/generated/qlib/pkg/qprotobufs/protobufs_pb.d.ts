// package: qprotobufs
// file: qlib/pkg/qprotobufs/protobufs.proto

import * as jspb from "google-protobuf";
import * as google_protobuf_timestamp_pb from "google-protobuf/google/protobuf/timestamp_pb";
import * as google_protobuf_any_pb from "google-protobuf/google/protobuf/any_pb";

export class ApiHeader extends jspb.Message {
  getId(): string;
  setId(value: string): void;

  hasTimestamp(): boolean;
  clearTimestamp(): void;
  getTimestamp(): google_protobuf_timestamp_pb.Timestamp | undefined;
  setTimestamp(value?: google_protobuf_timestamp_pb.Timestamp): void;

  getAccesstoken(): string;
  setAccesstoken(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ApiHeader.AsObject;
  static toObject(includeInstance: boolean, msg: ApiHeader): ApiHeader.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ApiHeader, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ApiHeader;
  static deserializeBinaryFromReader(message: ApiHeader, reader: jspb.BinaryReader): ApiHeader;
}

export namespace ApiHeader {
  export type AsObject = {
    id: string,
    timestamp?: google_protobuf_timestamp_pb.Timestamp.AsObject,
    accesstoken: string,
  }
}

export class ApiMessage extends jspb.Message {
  hasHeader(): boolean;
  clearHeader(): void;
  getHeader(): ApiHeader | undefined;
  setHeader(value?: ApiHeader): void;

  hasPayload(): boolean;
  clearPayload(): void;
  getPayload(): google_protobuf_any_pb.Any | undefined;
  setPayload(value?: google_protobuf_any_pb.Any): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ApiMessage.AsObject;
  static toObject(includeInstance: boolean, msg: ApiMessage): ApiMessage.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ApiMessage, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ApiMessage;
  static deserializeBinaryFromReader(message: ApiMessage, reader: jspb.BinaryReader): ApiMessage;
}

export namespace ApiMessage {
  export type AsObject = {
    header?: ApiHeader.AsObject,
    payload?: google_protobuf_any_pb.Any.AsObject,
  }
}

export class ApiConfigCreateEntityRequest extends jspb.Message {
  getType(): string;
  setType(value: string): void;

  getName(): string;
  setName(value: string): void;

  getParentid(): string;
  setParentid(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ApiConfigCreateEntityRequest.AsObject;
  static toObject(includeInstance: boolean, msg: ApiConfigCreateEntityRequest): ApiConfigCreateEntityRequest.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ApiConfigCreateEntityRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ApiConfigCreateEntityRequest;
  static deserializeBinaryFromReader(message: ApiConfigCreateEntityRequest, reader: jspb.BinaryReader): ApiConfigCreateEntityRequest;
}

export namespace ApiConfigCreateEntityRequest {
  export type AsObject = {
    type: string,
    name: string,
    parentid: string,
  }
}

export class ApiConfigCreateEntityResponse extends jspb.Message {
  getStatus(): ApiConfigCreateEntityResponse.StatusEnumMap[keyof ApiConfigCreateEntityResponse.StatusEnumMap];
  setStatus(value: ApiConfigCreateEntityResponse.StatusEnumMap[keyof ApiConfigCreateEntityResponse.StatusEnumMap]): void;

  getId(): string;
  setId(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ApiConfigCreateEntityResponse.AsObject;
  static toObject(includeInstance: boolean, msg: ApiConfigCreateEntityResponse): ApiConfigCreateEntityResponse.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ApiConfigCreateEntityResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ApiConfigCreateEntityResponse;
  static deserializeBinaryFromReader(message: ApiConfigCreateEntityResponse, reader: jspb.BinaryReader): ApiConfigCreateEntityResponse;
}

export namespace ApiConfigCreateEntityResponse {
  export type AsObject = {
    status: ApiConfigCreateEntityResponse.StatusEnumMap[keyof ApiConfigCreateEntityResponse.StatusEnumMap],
    id: string,
  }

  export interface StatusEnumMap {
    UNSPECIFIED: 0;
    SUCCESS: 1;
    FAILURE: 2;
  }

  export const StatusEnum: StatusEnumMap;
}

export class ApiConfigDeleteEntityRequest extends jspb.Message {
  getId(): string;
  setId(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ApiConfigDeleteEntityRequest.AsObject;
  static toObject(includeInstance: boolean, msg: ApiConfigDeleteEntityRequest): ApiConfigDeleteEntityRequest.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ApiConfigDeleteEntityRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ApiConfigDeleteEntityRequest;
  static deserializeBinaryFromReader(message: ApiConfigDeleteEntityRequest, reader: jspb.BinaryReader): ApiConfigDeleteEntityRequest;
}

export namespace ApiConfigDeleteEntityRequest {
  export type AsObject = {
    id: string,
  }
}

export class ApiConfigDeleteEntityResponse extends jspb.Message {
  getStatus(): ApiConfigDeleteEntityResponse.StatusEnumMap[keyof ApiConfigDeleteEntityResponse.StatusEnumMap];
  setStatus(value: ApiConfigDeleteEntityResponse.StatusEnumMap[keyof ApiConfigDeleteEntityResponse.StatusEnumMap]): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ApiConfigDeleteEntityResponse.AsObject;
  static toObject(includeInstance: boolean, msg: ApiConfigDeleteEntityResponse): ApiConfigDeleteEntityResponse.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ApiConfigDeleteEntityResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ApiConfigDeleteEntityResponse;
  static deserializeBinaryFromReader(message: ApiConfigDeleteEntityResponse, reader: jspb.BinaryReader): ApiConfigDeleteEntityResponse;
}

export namespace ApiConfigDeleteEntityResponse {
  export type AsObject = {
    status: ApiConfigDeleteEntityResponse.StatusEnumMap[keyof ApiConfigDeleteEntityResponse.StatusEnumMap],
  }

  export interface StatusEnumMap {
    UNSPECIFIED: 0;
    SUCCESS: 1;
    FAILURE: 2;
  }

  export const StatusEnum: StatusEnumMap;
}

export class ApiConfigGetFieldSchemaRequest extends jspb.Message {
  getField(): string;
  setField(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ApiConfigGetFieldSchemaRequest.AsObject;
  static toObject(includeInstance: boolean, msg: ApiConfigGetFieldSchemaRequest): ApiConfigGetFieldSchemaRequest.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ApiConfigGetFieldSchemaRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ApiConfigGetFieldSchemaRequest;
  static deserializeBinaryFromReader(message: ApiConfigGetFieldSchemaRequest, reader: jspb.BinaryReader): ApiConfigGetFieldSchemaRequest;
}

export namespace ApiConfigGetFieldSchemaRequest {
  export type AsObject = {
    field: string,
  }
}

export class ApiConfigGetFieldSchemaResponse extends jspb.Message {
  getStatus(): ApiConfigGetFieldSchemaResponse.StatusEnumMap[keyof ApiConfigGetFieldSchemaResponse.StatusEnumMap];
  setStatus(value: ApiConfigGetFieldSchemaResponse.StatusEnumMap[keyof ApiConfigGetFieldSchemaResponse.StatusEnumMap]): void;

  hasSchema(): boolean;
  clearSchema(): void;
  getSchema(): DatabaseFieldSchema | undefined;
  setSchema(value?: DatabaseFieldSchema): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ApiConfigGetFieldSchemaResponse.AsObject;
  static toObject(includeInstance: boolean, msg: ApiConfigGetFieldSchemaResponse): ApiConfigGetFieldSchemaResponse.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ApiConfigGetFieldSchemaResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ApiConfigGetFieldSchemaResponse;
  static deserializeBinaryFromReader(message: ApiConfigGetFieldSchemaResponse, reader: jspb.BinaryReader): ApiConfigGetFieldSchemaResponse;
}

export namespace ApiConfigGetFieldSchemaResponse {
  export type AsObject = {
    status: ApiConfigGetFieldSchemaResponse.StatusEnumMap[keyof ApiConfigGetFieldSchemaResponse.StatusEnumMap],
    schema?: DatabaseFieldSchema.AsObject,
  }

  export interface StatusEnumMap {
    UNSPECIFIED: 0;
    SUCCESS: 1;
    FAILURE: 2;
  }

  export const StatusEnum: StatusEnumMap;
}

export class ApiConfigGetEntitySchemaRequest extends jspb.Message {
  getType(): string;
  setType(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ApiConfigGetEntitySchemaRequest.AsObject;
  static toObject(includeInstance: boolean, msg: ApiConfigGetEntitySchemaRequest): ApiConfigGetEntitySchemaRequest.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ApiConfigGetEntitySchemaRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ApiConfigGetEntitySchemaRequest;
  static deserializeBinaryFromReader(message: ApiConfigGetEntitySchemaRequest, reader: jspb.BinaryReader): ApiConfigGetEntitySchemaRequest;
}

export namespace ApiConfigGetEntitySchemaRequest {
  export type AsObject = {
    type: string,
  }
}

export class ApiConfigGetEntitySchemaResponse extends jspb.Message {
  getStatus(): ApiConfigGetEntitySchemaResponse.StatusEnumMap[keyof ApiConfigGetEntitySchemaResponse.StatusEnumMap];
  setStatus(value: ApiConfigGetEntitySchemaResponse.StatusEnumMap[keyof ApiConfigGetEntitySchemaResponse.StatusEnumMap]): void;

  hasSchema(): boolean;
  clearSchema(): void;
  getSchema(): DatabaseEntitySchema | undefined;
  setSchema(value?: DatabaseEntitySchema): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ApiConfigGetEntitySchemaResponse.AsObject;
  static toObject(includeInstance: boolean, msg: ApiConfigGetEntitySchemaResponse): ApiConfigGetEntitySchemaResponse.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ApiConfigGetEntitySchemaResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ApiConfigGetEntitySchemaResponse;
  static deserializeBinaryFromReader(message: ApiConfigGetEntitySchemaResponse, reader: jspb.BinaryReader): ApiConfigGetEntitySchemaResponse;
}

export namespace ApiConfigGetEntitySchemaResponse {
  export type AsObject = {
    status: ApiConfigGetEntitySchemaResponse.StatusEnumMap[keyof ApiConfigGetEntitySchemaResponse.StatusEnumMap],
    schema?: DatabaseEntitySchema.AsObject,
  }

  export interface StatusEnumMap {
    UNSPECIFIED: 0;
    SUCCESS: 1;
    FAILURE: 2;
  }

  export const StatusEnum: StatusEnumMap;
}

export class ApiConfigSetEntitySchemaRequest extends jspb.Message {
  hasSchema(): boolean;
  clearSchema(): void;
  getSchema(): DatabaseEntitySchema | undefined;
  setSchema(value?: DatabaseEntitySchema): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ApiConfigSetEntitySchemaRequest.AsObject;
  static toObject(includeInstance: boolean, msg: ApiConfigSetEntitySchemaRequest): ApiConfigSetEntitySchemaRequest.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ApiConfigSetEntitySchemaRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ApiConfigSetEntitySchemaRequest;
  static deserializeBinaryFromReader(message: ApiConfigSetEntitySchemaRequest, reader: jspb.BinaryReader): ApiConfigSetEntitySchemaRequest;
}

export namespace ApiConfigSetEntitySchemaRequest {
  export type AsObject = {
    schema?: DatabaseEntitySchema.AsObject,
  }
}

export class ApiConfigSetEntitySchemaResponse extends jspb.Message {
  getStatus(): ApiConfigSetEntitySchemaResponse.StatusEnumMap[keyof ApiConfigSetEntitySchemaResponse.StatusEnumMap];
  setStatus(value: ApiConfigSetEntitySchemaResponse.StatusEnumMap[keyof ApiConfigSetEntitySchemaResponse.StatusEnumMap]): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ApiConfigSetEntitySchemaResponse.AsObject;
  static toObject(includeInstance: boolean, msg: ApiConfigSetEntitySchemaResponse): ApiConfigSetEntitySchemaResponse.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ApiConfigSetEntitySchemaResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ApiConfigSetEntitySchemaResponse;
  static deserializeBinaryFromReader(message: ApiConfigSetEntitySchemaResponse, reader: jspb.BinaryReader): ApiConfigSetEntitySchemaResponse;
}

export namespace ApiConfigSetEntitySchemaResponse {
  export type AsObject = {
    status: ApiConfigSetEntitySchemaResponse.StatusEnumMap[keyof ApiConfigSetEntitySchemaResponse.StatusEnumMap],
  }

  export interface StatusEnumMap {
    UNSPECIFIED: 0;
    SUCCESS: 1;
    FAILURE: 2;
  }

  export const StatusEnum: StatusEnumMap;
}

export class ApiConfigCreateSnapshotRequest extends jspb.Message {
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ApiConfigCreateSnapshotRequest.AsObject;
  static toObject(includeInstance: boolean, msg: ApiConfigCreateSnapshotRequest): ApiConfigCreateSnapshotRequest.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ApiConfigCreateSnapshotRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ApiConfigCreateSnapshotRequest;
  static deserializeBinaryFromReader(message: ApiConfigCreateSnapshotRequest, reader: jspb.BinaryReader): ApiConfigCreateSnapshotRequest;
}

export namespace ApiConfigCreateSnapshotRequest {
  export type AsObject = {
  }
}

export class ApiConfigCreateSnapshotResponse extends jspb.Message {
  getStatus(): ApiConfigCreateSnapshotResponse.StatusEnumMap[keyof ApiConfigCreateSnapshotResponse.StatusEnumMap];
  setStatus(value: ApiConfigCreateSnapshotResponse.StatusEnumMap[keyof ApiConfigCreateSnapshotResponse.StatusEnumMap]): void;

  hasSnapshot(): boolean;
  clearSnapshot(): void;
  getSnapshot(): DatabaseSnapshot | undefined;
  setSnapshot(value?: DatabaseSnapshot): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ApiConfigCreateSnapshotResponse.AsObject;
  static toObject(includeInstance: boolean, msg: ApiConfigCreateSnapshotResponse): ApiConfigCreateSnapshotResponse.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ApiConfigCreateSnapshotResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ApiConfigCreateSnapshotResponse;
  static deserializeBinaryFromReader(message: ApiConfigCreateSnapshotResponse, reader: jspb.BinaryReader): ApiConfigCreateSnapshotResponse;
}

export namespace ApiConfigCreateSnapshotResponse {
  export type AsObject = {
    status: ApiConfigCreateSnapshotResponse.StatusEnumMap[keyof ApiConfigCreateSnapshotResponse.StatusEnumMap],
    snapshot?: DatabaseSnapshot.AsObject,
  }

  export interface StatusEnumMap {
    UNSPECIFIED: 0;
    SUCCESS: 1;
    FAILURE: 2;
  }

  export const StatusEnum: StatusEnumMap;
}

export class ApiConfigRestoreSnapshotRequest extends jspb.Message {
  hasSnapshot(): boolean;
  clearSnapshot(): void;
  getSnapshot(): DatabaseSnapshot | undefined;
  setSnapshot(value?: DatabaseSnapshot): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ApiConfigRestoreSnapshotRequest.AsObject;
  static toObject(includeInstance: boolean, msg: ApiConfigRestoreSnapshotRequest): ApiConfigRestoreSnapshotRequest.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ApiConfigRestoreSnapshotRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ApiConfigRestoreSnapshotRequest;
  static deserializeBinaryFromReader(message: ApiConfigRestoreSnapshotRequest, reader: jspb.BinaryReader): ApiConfigRestoreSnapshotRequest;
}

export namespace ApiConfigRestoreSnapshotRequest {
  export type AsObject = {
    snapshot?: DatabaseSnapshot.AsObject,
  }
}

export class ApiConfigRestoreSnapshotResponse extends jspb.Message {
  getStatus(): ApiConfigRestoreSnapshotResponse.StatusEnumMap[keyof ApiConfigRestoreSnapshotResponse.StatusEnumMap];
  setStatus(value: ApiConfigRestoreSnapshotResponse.StatusEnumMap[keyof ApiConfigRestoreSnapshotResponse.StatusEnumMap]): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ApiConfigRestoreSnapshotResponse.AsObject;
  static toObject(includeInstance: boolean, msg: ApiConfigRestoreSnapshotResponse): ApiConfigRestoreSnapshotResponse.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ApiConfigRestoreSnapshotResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ApiConfigRestoreSnapshotResponse;
  static deserializeBinaryFromReader(message: ApiConfigRestoreSnapshotResponse, reader: jspb.BinaryReader): ApiConfigRestoreSnapshotResponse;
}

export namespace ApiConfigRestoreSnapshotResponse {
  export type AsObject = {
    status: ApiConfigRestoreSnapshotResponse.StatusEnumMap[keyof ApiConfigRestoreSnapshotResponse.StatusEnumMap],
  }

  export interface StatusEnumMap {
    UNSPECIFIED: 0;
    SUCCESS: 1;
    FAILURE: 2;
  }

  export const StatusEnum: StatusEnumMap;
}

export class ApiConfigGetRootRequest extends jspb.Message {
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ApiConfigGetRootRequest.AsObject;
  static toObject(includeInstance: boolean, msg: ApiConfigGetRootRequest): ApiConfigGetRootRequest.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ApiConfigGetRootRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ApiConfigGetRootRequest;
  static deserializeBinaryFromReader(message: ApiConfigGetRootRequest, reader: jspb.BinaryReader): ApiConfigGetRootRequest;
}

export namespace ApiConfigGetRootRequest {
  export type AsObject = {
  }
}

export class ApiConfigGetRootResponse extends jspb.Message {
  getRootid(): string;
  setRootid(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ApiConfigGetRootResponse.AsObject;
  static toObject(includeInstance: boolean, msg: ApiConfigGetRootResponse): ApiConfigGetRootResponse.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ApiConfigGetRootResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ApiConfigGetRootResponse;
  static deserializeBinaryFromReader(message: ApiConfigGetRootResponse, reader: jspb.BinaryReader): ApiConfigGetRootResponse;
}

export namespace ApiConfigGetRootResponse {
  export type AsObject = {
    rootid: string,
  }
}

export class ApiRuntimeDatabaseRequest extends jspb.Message {
  getRequesttype(): ApiRuntimeDatabaseRequest.RequestTypeEnumMap[keyof ApiRuntimeDatabaseRequest.RequestTypeEnumMap];
  setRequesttype(value: ApiRuntimeDatabaseRequest.RequestTypeEnumMap[keyof ApiRuntimeDatabaseRequest.RequestTypeEnumMap]): void;

  clearRequestsList(): void;
  getRequestsList(): Array<DatabaseRequest>;
  setRequestsList(value: Array<DatabaseRequest>): void;
  addRequests(value?: DatabaseRequest, index?: number): DatabaseRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ApiRuntimeDatabaseRequest.AsObject;
  static toObject(includeInstance: boolean, msg: ApiRuntimeDatabaseRequest): ApiRuntimeDatabaseRequest.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ApiRuntimeDatabaseRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ApiRuntimeDatabaseRequest;
  static deserializeBinaryFromReader(message: ApiRuntimeDatabaseRequest, reader: jspb.BinaryReader): ApiRuntimeDatabaseRequest;
}

export namespace ApiRuntimeDatabaseRequest {
  export type AsObject = {
    requesttype: ApiRuntimeDatabaseRequest.RequestTypeEnumMap[keyof ApiRuntimeDatabaseRequest.RequestTypeEnumMap],
    requestsList: Array<DatabaseRequest.AsObject>,
  }

  export interface RequestTypeEnumMap {
    UNSPECIFIED: 0;
    READ: 1;
    WRITE: 2;
  }

  export const RequestTypeEnum: RequestTypeEnumMap;
}

export class ApiRuntimeDatabaseResponse extends jspb.Message {
  getStatus(): ApiRuntimeDatabaseResponse.StatusEnumMap[keyof ApiRuntimeDatabaseResponse.StatusEnumMap];
  setStatus(value: ApiRuntimeDatabaseResponse.StatusEnumMap[keyof ApiRuntimeDatabaseResponse.StatusEnumMap]): void;

  clearResponseList(): void;
  getResponseList(): Array<DatabaseRequest>;
  setResponseList(value: Array<DatabaseRequest>): void;
  addResponse(value?: DatabaseRequest, index?: number): DatabaseRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ApiRuntimeDatabaseResponse.AsObject;
  static toObject(includeInstance: boolean, msg: ApiRuntimeDatabaseResponse): ApiRuntimeDatabaseResponse.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ApiRuntimeDatabaseResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ApiRuntimeDatabaseResponse;
  static deserializeBinaryFromReader(message: ApiRuntimeDatabaseResponse, reader: jspb.BinaryReader): ApiRuntimeDatabaseResponse;
}

export namespace ApiRuntimeDatabaseResponse {
  export type AsObject = {
    status: ApiRuntimeDatabaseResponse.StatusEnumMap[keyof ApiRuntimeDatabaseResponse.StatusEnumMap],
    responseList: Array<DatabaseRequest.AsObject>,
  }

  export interface StatusEnumMap {
    UNSPECIFIED: 0;
    SUCCESS: 1;
    FAILURE: 2;
  }

  export const StatusEnum: StatusEnumMap;
}

export class ApiRuntimeRegisterNotificationRequest extends jspb.Message {
  clearRequestsList(): void;
  getRequestsList(): Array<DatabaseNotificationConfig>;
  setRequestsList(value: Array<DatabaseNotificationConfig>): void;
  addRequests(value?: DatabaseNotificationConfig, index?: number): DatabaseNotificationConfig;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ApiRuntimeRegisterNotificationRequest.AsObject;
  static toObject(includeInstance: boolean, msg: ApiRuntimeRegisterNotificationRequest): ApiRuntimeRegisterNotificationRequest.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ApiRuntimeRegisterNotificationRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ApiRuntimeRegisterNotificationRequest;
  static deserializeBinaryFromReader(message: ApiRuntimeRegisterNotificationRequest, reader: jspb.BinaryReader): ApiRuntimeRegisterNotificationRequest;
}

export namespace ApiRuntimeRegisterNotificationRequest {
  export type AsObject = {
    requestsList: Array<DatabaseNotificationConfig.AsObject>,
  }
}

export class ApiRuntimeRegisterNotificationResponse extends jspb.Message {
  getStatus(): ApiRuntimeRegisterNotificationResponse.StatusEnumMap[keyof ApiRuntimeRegisterNotificationResponse.StatusEnumMap];
  setStatus(value: ApiRuntimeRegisterNotificationResponse.StatusEnumMap[keyof ApiRuntimeRegisterNotificationResponse.StatusEnumMap]): void;

  clearTokensList(): void;
  getTokensList(): Array<string>;
  setTokensList(value: Array<string>): void;
  addTokens(value: string, index?: number): string;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ApiRuntimeRegisterNotificationResponse.AsObject;
  static toObject(includeInstance: boolean, msg: ApiRuntimeRegisterNotificationResponse): ApiRuntimeRegisterNotificationResponse.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ApiRuntimeRegisterNotificationResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ApiRuntimeRegisterNotificationResponse;
  static deserializeBinaryFromReader(message: ApiRuntimeRegisterNotificationResponse, reader: jspb.BinaryReader): ApiRuntimeRegisterNotificationResponse;
}

export namespace ApiRuntimeRegisterNotificationResponse {
  export type AsObject = {
    status: ApiRuntimeRegisterNotificationResponse.StatusEnumMap[keyof ApiRuntimeRegisterNotificationResponse.StatusEnumMap],
    tokensList: Array<string>,
  }

  export interface StatusEnumMap {
    UNSPECIFIED: 0;
    SUCCESS: 1;
    FAILURE: 2;
  }

  export const StatusEnum: StatusEnumMap;
}

export class ApiRuntimeUnregisterNotificationRequest extends jspb.Message {
  clearTokensList(): void;
  getTokensList(): Array<string>;
  setTokensList(value: Array<string>): void;
  addTokens(value: string, index?: number): string;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ApiRuntimeUnregisterNotificationRequest.AsObject;
  static toObject(includeInstance: boolean, msg: ApiRuntimeUnregisterNotificationRequest): ApiRuntimeUnregisterNotificationRequest.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ApiRuntimeUnregisterNotificationRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ApiRuntimeUnregisterNotificationRequest;
  static deserializeBinaryFromReader(message: ApiRuntimeUnregisterNotificationRequest, reader: jspb.BinaryReader): ApiRuntimeUnregisterNotificationRequest;
}

export namespace ApiRuntimeUnregisterNotificationRequest {
  export type AsObject = {
    tokensList: Array<string>,
  }
}

export class ApiRuntimeUnregisterNotificationResponse extends jspb.Message {
  getStatus(): ApiRuntimeUnregisterNotificationResponse.StatusEnumMap[keyof ApiRuntimeUnregisterNotificationResponse.StatusEnumMap];
  setStatus(value: ApiRuntimeUnregisterNotificationResponse.StatusEnumMap[keyof ApiRuntimeUnregisterNotificationResponse.StatusEnumMap]): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ApiRuntimeUnregisterNotificationResponse.AsObject;
  static toObject(includeInstance: boolean, msg: ApiRuntimeUnregisterNotificationResponse): ApiRuntimeUnregisterNotificationResponse.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ApiRuntimeUnregisterNotificationResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ApiRuntimeUnregisterNotificationResponse;
  static deserializeBinaryFromReader(message: ApiRuntimeUnregisterNotificationResponse, reader: jspb.BinaryReader): ApiRuntimeUnregisterNotificationResponse;
}

export namespace ApiRuntimeUnregisterNotificationResponse {
  export type AsObject = {
    status: ApiRuntimeUnregisterNotificationResponse.StatusEnumMap[keyof ApiRuntimeUnregisterNotificationResponse.StatusEnumMap],
  }

  export interface StatusEnumMap {
    UNSPECIFIED: 0;
    SUCCESS: 1;
    FAILURE: 2;
  }

  export const StatusEnum: StatusEnumMap;
}

export class ApiRuntimeGetDatabaseConnectionStatusRequest extends jspb.Message {
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ApiRuntimeGetDatabaseConnectionStatusRequest.AsObject;
  static toObject(includeInstance: boolean, msg: ApiRuntimeGetDatabaseConnectionStatusRequest): ApiRuntimeGetDatabaseConnectionStatusRequest.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ApiRuntimeGetDatabaseConnectionStatusRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ApiRuntimeGetDatabaseConnectionStatusRequest;
  static deserializeBinaryFromReader(message: ApiRuntimeGetDatabaseConnectionStatusRequest, reader: jspb.BinaryReader): ApiRuntimeGetDatabaseConnectionStatusRequest;
}

export namespace ApiRuntimeGetDatabaseConnectionStatusRequest {
  export type AsObject = {
  }
}

export class ApiRuntimeGetDatabaseConnectionStatusResponse extends jspb.Message {
  getStatus(): ApiRuntimeGetDatabaseConnectionStatusResponse.StatusEnumMap[keyof ApiRuntimeGetDatabaseConnectionStatusResponse.StatusEnumMap];
  setStatus(value: ApiRuntimeGetDatabaseConnectionStatusResponse.StatusEnumMap[keyof ApiRuntimeGetDatabaseConnectionStatusResponse.StatusEnumMap]): void;

  getConnected(): boolean;
  setConnected(value: boolean): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ApiRuntimeGetDatabaseConnectionStatusResponse.AsObject;
  static toObject(includeInstance: boolean, msg: ApiRuntimeGetDatabaseConnectionStatusResponse): ApiRuntimeGetDatabaseConnectionStatusResponse.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ApiRuntimeGetDatabaseConnectionStatusResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ApiRuntimeGetDatabaseConnectionStatusResponse;
  static deserializeBinaryFromReader(message: ApiRuntimeGetDatabaseConnectionStatusResponse, reader: jspb.BinaryReader): ApiRuntimeGetDatabaseConnectionStatusResponse;
}

export namespace ApiRuntimeGetDatabaseConnectionStatusResponse {
  export type AsObject = {
    status: ApiRuntimeGetDatabaseConnectionStatusResponse.StatusEnumMap[keyof ApiRuntimeGetDatabaseConnectionStatusResponse.StatusEnumMap],
    connected: boolean,
  }

  export interface StatusEnumMap {
    UNSPECIFIED: 0;
    CONNECTED: 1;
    DISCONNECTED: 2;
  }

  export const StatusEnum: StatusEnumMap;
}

export class ApiRuntimeFindEntitiesRequest extends jspb.Message {
  getEntityType(): string;
  setEntityType(value: string): void;

  getPageSize(): number;
  setPageSize(value: number): void;

  getCursor(): number;
  setCursor(value: number): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ApiRuntimeFindEntitiesRequest.AsObject;
  static toObject(includeInstance: boolean, msg: ApiRuntimeFindEntitiesRequest): ApiRuntimeFindEntitiesRequest.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ApiRuntimeFindEntitiesRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ApiRuntimeFindEntitiesRequest;
  static deserializeBinaryFromReader(message: ApiRuntimeFindEntitiesRequest, reader: jspb.BinaryReader): ApiRuntimeFindEntitiesRequest;
}

export namespace ApiRuntimeFindEntitiesRequest {
  export type AsObject = {
    entityType: string,
    pageSize: number,
    cursor: number,
  }
}

export class ApiRuntimeFindEntitiesResponse extends jspb.Message {
  getStatus(): ApiRuntimeFindEntitiesResponse.StatusEnumMap[keyof ApiRuntimeFindEntitiesResponse.StatusEnumMap];
  setStatus(value: ApiRuntimeFindEntitiesResponse.StatusEnumMap[keyof ApiRuntimeFindEntitiesResponse.StatusEnumMap]): void;

  clearEntitiesList(): void;
  getEntitiesList(): Array<string>;
  setEntitiesList(value: Array<string>): void;
  addEntities(value: string, index?: number): string;

  getNextCursor(): number;
  setNextCursor(value: number): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ApiRuntimeFindEntitiesResponse.AsObject;
  static toObject(includeInstance: boolean, msg: ApiRuntimeFindEntitiesResponse): ApiRuntimeFindEntitiesResponse.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ApiRuntimeFindEntitiesResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ApiRuntimeFindEntitiesResponse;
  static deserializeBinaryFromReader(message: ApiRuntimeFindEntitiesResponse, reader: jspb.BinaryReader): ApiRuntimeFindEntitiesResponse;
}

export namespace ApiRuntimeFindEntitiesResponse {
  export type AsObject = {
    status: ApiRuntimeFindEntitiesResponse.StatusEnumMap[keyof ApiRuntimeFindEntitiesResponse.StatusEnumMap],
    entitiesList: Array<string>,
    nextCursor: number,
  }

  export interface StatusEnumMap {
    UNSPECIFIED: 0;
    SUCCESS: 1;
    FAILURE: 2;
  }

  export const StatusEnum: StatusEnumMap;
}

export class ApiRuntimeGetEntityTypesRequest extends jspb.Message {
  getPageSize(): number;
  setPageSize(value: number): void;

  getCursor(): number;
  setCursor(value: number): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ApiRuntimeGetEntityTypesRequest.AsObject;
  static toObject(includeInstance: boolean, msg: ApiRuntimeGetEntityTypesRequest): ApiRuntimeGetEntityTypesRequest.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ApiRuntimeGetEntityTypesRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ApiRuntimeGetEntityTypesRequest;
  static deserializeBinaryFromReader(message: ApiRuntimeGetEntityTypesRequest, reader: jspb.BinaryReader): ApiRuntimeGetEntityTypesRequest;
}

export namespace ApiRuntimeGetEntityTypesRequest {
  export type AsObject = {
    pageSize: number,
    cursor: number,
  }
}

export class ApiRuntimeGetEntityTypesResponse extends jspb.Message {
  getStatus(): ApiRuntimeGetEntityTypesResponse.StatusEnumMap[keyof ApiRuntimeGetEntityTypesResponse.StatusEnumMap];
  setStatus(value: ApiRuntimeGetEntityTypesResponse.StatusEnumMap[keyof ApiRuntimeGetEntityTypesResponse.StatusEnumMap]): void;

  clearEntityTypesList(): void;
  getEntityTypesList(): Array<string>;
  setEntityTypesList(value: Array<string>): void;
  addEntityTypes(value: string, index?: number): string;

  getNextCursor(): number;
  setNextCursor(value: number): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ApiRuntimeGetEntityTypesResponse.AsObject;
  static toObject(includeInstance: boolean, msg: ApiRuntimeGetEntityTypesResponse): ApiRuntimeGetEntityTypesResponse.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ApiRuntimeGetEntityTypesResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ApiRuntimeGetEntityTypesResponse;
  static deserializeBinaryFromReader(message: ApiRuntimeGetEntityTypesResponse, reader: jspb.BinaryReader): ApiRuntimeGetEntityTypesResponse;
}

export namespace ApiRuntimeGetEntityTypesResponse {
  export type AsObject = {
    status: ApiRuntimeGetEntityTypesResponse.StatusEnumMap[keyof ApiRuntimeGetEntityTypesResponse.StatusEnumMap],
    entityTypesList: Array<string>,
    nextCursor: number,
  }

  export interface StatusEnumMap {
    UNSPECIFIED: 0;
    SUCCESS: 1;
    FAILURE: 2;
  }

  export const StatusEnum: StatusEnumMap;
}

export class ApiRuntimeFieldExistsRequest extends jspb.Message {
  getFieldname(): string;
  setFieldname(value: string): void;

  getEntitytype(): string;
  setEntitytype(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ApiRuntimeFieldExistsRequest.AsObject;
  static toObject(includeInstance: boolean, msg: ApiRuntimeFieldExistsRequest): ApiRuntimeFieldExistsRequest.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ApiRuntimeFieldExistsRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ApiRuntimeFieldExistsRequest;
  static deserializeBinaryFromReader(message: ApiRuntimeFieldExistsRequest, reader: jspb.BinaryReader): ApiRuntimeFieldExistsRequest;
}

export namespace ApiRuntimeFieldExistsRequest {
  export type AsObject = {
    fieldname: string,
    entitytype: string,
  }
}

export class ApiRuntimeFieldExistsResponse extends jspb.Message {
  getStatus(): ApiRuntimeFieldExistsResponse.StatusEnumMap[keyof ApiRuntimeFieldExistsResponse.StatusEnumMap];
  setStatus(value: ApiRuntimeFieldExistsResponse.StatusEnumMap[keyof ApiRuntimeFieldExistsResponse.StatusEnumMap]): void;

  getExists(): boolean;
  setExists(value: boolean): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ApiRuntimeFieldExistsResponse.AsObject;
  static toObject(includeInstance: boolean, msg: ApiRuntimeFieldExistsResponse): ApiRuntimeFieldExistsResponse.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ApiRuntimeFieldExistsResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ApiRuntimeFieldExistsResponse;
  static deserializeBinaryFromReader(message: ApiRuntimeFieldExistsResponse, reader: jspb.BinaryReader): ApiRuntimeFieldExistsResponse;
}

export namespace ApiRuntimeFieldExistsResponse {
  export type AsObject = {
    status: ApiRuntimeFieldExistsResponse.StatusEnumMap[keyof ApiRuntimeFieldExistsResponse.StatusEnumMap],
    exists: boolean,
  }

  export interface StatusEnumMap {
    UNSPECIFIED: 0;
    SUCCESS: 1;
    FAILURE: 2;
  }

  export const StatusEnum: StatusEnumMap;
}

export class ApiRuntimeEntityExistsRequest extends jspb.Message {
  getEntityid(): string;
  setEntityid(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ApiRuntimeEntityExistsRequest.AsObject;
  static toObject(includeInstance: boolean, msg: ApiRuntimeEntityExistsRequest): ApiRuntimeEntityExistsRequest.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ApiRuntimeEntityExistsRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ApiRuntimeEntityExistsRequest;
  static deserializeBinaryFromReader(message: ApiRuntimeEntityExistsRequest, reader: jspb.BinaryReader): ApiRuntimeEntityExistsRequest;
}

export namespace ApiRuntimeEntityExistsRequest {
  export type AsObject = {
    entityid: string,
  }
}

export class ApiRuntimeEntityExistsResponse extends jspb.Message {
  getStatus(): ApiRuntimeEntityExistsResponse.StatusEnumMap[keyof ApiRuntimeEntityExistsResponse.StatusEnumMap];
  setStatus(value: ApiRuntimeEntityExistsResponse.StatusEnumMap[keyof ApiRuntimeEntityExistsResponse.StatusEnumMap]): void;

  getExists(): boolean;
  setExists(value: boolean): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ApiRuntimeEntityExistsResponse.AsObject;
  static toObject(includeInstance: boolean, msg: ApiRuntimeEntityExistsResponse): ApiRuntimeEntityExistsResponse.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ApiRuntimeEntityExistsResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ApiRuntimeEntityExistsResponse;
  static deserializeBinaryFromReader(message: ApiRuntimeEntityExistsResponse, reader: jspb.BinaryReader): ApiRuntimeEntityExistsResponse;
}

export namespace ApiRuntimeEntityExistsResponse {
  export type AsObject = {
    status: ApiRuntimeEntityExistsResponse.StatusEnumMap[keyof ApiRuntimeEntityExistsResponse.StatusEnumMap],
    exists: boolean,
  }

  export interface StatusEnumMap {
    UNSPECIFIED: 0;
    SUCCESS: 1;
    FAILURE: 2;
  }

  export const StatusEnum: StatusEnumMap;
}

export class TypeHint extends jspb.Message {
  getFieldtype(): string;
  setFieldtype(value: string): void;

  getValuetype(): string;
  setValuetype(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): TypeHint.AsObject;
  static toObject(includeInstance: boolean, msg: TypeHint): TypeHint.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: TypeHint, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): TypeHint;
  static deserializeBinaryFromReader(message: TypeHint, reader: jspb.BinaryReader): TypeHint;
}

export namespace TypeHint {
  export type AsObject = {
    fieldtype: string,
    valuetype: string,
  }
}

export class QueryColumn extends jspb.Message {
  getKey(): string;
  setKey(value: string): void;

  hasValue(): boolean;
  clearValue(): void;
  getValue(): google_protobuf_any_pb.Any | undefined;
  setValue(value?: google_protobuf_any_pb.Any): void;

  getIsSelected(): boolean;
  setIsSelected(value: boolean): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): QueryColumn.AsObject;
  static toObject(includeInstance: boolean, msg: QueryColumn): QueryColumn.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: QueryColumn, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): QueryColumn;
  static deserializeBinaryFromReader(message: QueryColumn, reader: jspb.BinaryReader): QueryColumn;
}

export namespace QueryColumn {
  export type AsObject = {
    key: string,
    value?: google_protobuf_any_pb.Any.AsObject,
    isSelected: boolean,
  }
}

export class QueryRow extends jspb.Message {
  clearColumnsList(): void;
  getColumnsList(): Array<QueryColumn>;
  setColumnsList(value: Array<QueryColumn>): void;
  addColumns(value?: QueryColumn, index?: number): QueryColumn;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): QueryRow.AsObject;
  static toObject(includeInstance: boolean, msg: QueryRow): QueryRow.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: QueryRow, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): QueryRow;
  static deserializeBinaryFromReader(message: QueryRow, reader: jspb.BinaryReader): QueryRow;
}

export namespace QueryRow {
  export type AsObject = {
    columnsList: Array<QueryColumn.AsObject>,
  }
}

export class ApiRuntimeQueryRequest extends jspb.Message {
  getQuery(): string;
  setQuery(value: string): void;

  getPageSize(): number;
  setPageSize(value: number): void;

  getCursor(): number;
  setCursor(value: number): void;

  clearTypeHintsList(): void;
  getTypeHintsList(): Array<TypeHint>;
  setTypeHintsList(value: Array<TypeHint>): void;
  addTypeHints(value?: TypeHint, index?: number): TypeHint;

  getEngine(): string;
  setEngine(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ApiRuntimeQueryRequest.AsObject;
  static toObject(includeInstance: boolean, msg: ApiRuntimeQueryRequest): ApiRuntimeQueryRequest.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ApiRuntimeQueryRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ApiRuntimeQueryRequest;
  static deserializeBinaryFromReader(message: ApiRuntimeQueryRequest, reader: jspb.BinaryReader): ApiRuntimeQueryRequest;
}

export namespace ApiRuntimeQueryRequest {
  export type AsObject = {
    query: string,
    pageSize: number,
    cursor: number,
    typeHintsList: Array<TypeHint.AsObject>,
    engine: string,
  }
}

export class ApiRuntimeQueryResponse extends jspb.Message {
  getStatus(): ApiRuntimeQueryResponse.StatusEnumMap[keyof ApiRuntimeQueryResponse.StatusEnumMap];
  setStatus(value: ApiRuntimeQueryResponse.StatusEnumMap[keyof ApiRuntimeQueryResponse.StatusEnumMap]): void;

  clearRowsList(): void;
  getRowsList(): Array<QueryRow>;
  setRowsList(value: Array<QueryRow>): void;
  addRows(value?: QueryRow, index?: number): QueryRow;

  getNextCursor(): number;
  setNextCursor(value: number): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ApiRuntimeQueryResponse.AsObject;
  static toObject(includeInstance: boolean, msg: ApiRuntimeQueryResponse): ApiRuntimeQueryResponse.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ApiRuntimeQueryResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ApiRuntimeQueryResponse;
  static deserializeBinaryFromReader(message: ApiRuntimeQueryResponse, reader: jspb.BinaryReader): ApiRuntimeQueryResponse;
}

export namespace ApiRuntimeQueryResponse {
  export type AsObject = {
    status: ApiRuntimeQueryResponse.StatusEnumMap[keyof ApiRuntimeQueryResponse.StatusEnumMap],
    rowsList: Array<QueryRow.AsObject>,
    nextCursor: number,
  }

  export interface StatusEnumMap {
    UNSPECIFIED: 0;
    SUCCESS: 1;
    FAILURE: 2;
  }

  export const StatusEnum: StatusEnumMap;
}

export class DatabaseEntity extends jspb.Message {
  getId(): string;
  setId(value: string): void;

  getType(): string;
  setType(value: string): void;

  clearFieldsList(): void;
  getFieldsList(): Array<DatabaseField>;
  setFieldsList(value: Array<DatabaseField>): void;
  addFields(value?: DatabaseField, index?: number): DatabaseField;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): DatabaseEntity.AsObject;
  static toObject(includeInstance: boolean, msg: DatabaseEntity): DatabaseEntity.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: DatabaseEntity, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): DatabaseEntity;
  static deserializeBinaryFromReader(message: DatabaseEntity, reader: jspb.BinaryReader): DatabaseEntity;
}

export namespace DatabaseEntity {
  export type AsObject = {
    id: string,
    type: string,
    fieldsList: Array<DatabaseField.AsObject>,
  }
}

export class DatabaseField extends jspb.Message {
  getId(): string;
  setId(value: string): void;

  getName(): string;
  setName(value: string): void;

  hasValue(): boolean;
  clearValue(): void;
  getValue(): google_protobuf_any_pb.Any | undefined;
  setValue(value?: google_protobuf_any_pb.Any): void;

  hasWritetime(): boolean;
  clearWritetime(): void;
  getWritetime(): google_protobuf_timestamp_pb.Timestamp | undefined;
  setWritetime(value?: google_protobuf_timestamp_pb.Timestamp): void;

  getWriterid(): string;
  setWriterid(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): DatabaseField.AsObject;
  static toObject(includeInstance: boolean, msg: DatabaseField): DatabaseField.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: DatabaseField, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): DatabaseField;
  static deserializeBinaryFromReader(message: DatabaseField, reader: jspb.BinaryReader): DatabaseField;
}

export namespace DatabaseField {
  export type AsObject = {
    id: string,
    name: string,
    value?: google_protobuf_any_pb.Any.AsObject,
    writetime?: google_protobuf_timestamp_pb.Timestamp.AsObject,
    writerid: string,
  }
}

export class DatabaseNotificationConfig extends jspb.Message {
  getId(): string;
  setId(value: string): void;

  getType(): string;
  setType(value: string): void;

  getField(): string;
  setField(value: string): void;

  clearContextfieldsList(): void;
  getContextfieldsList(): Array<string>;
  setContextfieldsList(value: Array<string>): void;
  addContextfields(value: string, index?: number): string;

  getNotifyonchange(): boolean;
  setNotifyonchange(value: boolean): void;

  getServiceid(): string;
  setServiceid(value: string): void;

  getDistributed(): boolean;
  setDistributed(value: boolean): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): DatabaseNotificationConfig.AsObject;
  static toObject(includeInstance: boolean, msg: DatabaseNotificationConfig): DatabaseNotificationConfig.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: DatabaseNotificationConfig, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): DatabaseNotificationConfig;
  static deserializeBinaryFromReader(message: DatabaseNotificationConfig, reader: jspb.BinaryReader): DatabaseNotificationConfig;
}

export namespace DatabaseNotificationConfig {
  export type AsObject = {
    id: string,
    type: string,
    field: string,
    contextfieldsList: Array<string>,
    notifyonchange: boolean,
    serviceid: string,
    distributed: boolean,
  }
}

export class DatabaseNotification extends jspb.Message {
  getToken(): string;
  setToken(value: string): void;

  hasCurrent(): boolean;
  clearCurrent(): void;
  getCurrent(): DatabaseField | undefined;
  setCurrent(value?: DatabaseField): void;

  hasPrevious(): boolean;
  clearPrevious(): void;
  getPrevious(): DatabaseField | undefined;
  setPrevious(value?: DatabaseField): void;

  clearContextList(): void;
  getContextList(): Array<DatabaseField>;
  setContextList(value: Array<DatabaseField>): void;
  addContext(value?: DatabaseField, index?: number): DatabaseField;

  getServiceId(): string;
  setServiceId(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): DatabaseNotification.AsObject;
  static toObject(includeInstance: boolean, msg: DatabaseNotification): DatabaseNotification.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: DatabaseNotification, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): DatabaseNotification;
  static deserializeBinaryFromReader(message: DatabaseNotification, reader: jspb.BinaryReader): DatabaseNotification;
}

export namespace DatabaseNotification {
  export type AsObject = {
    token: string,
    current?: DatabaseField.AsObject,
    previous?: DatabaseField.AsObject,
    contextList: Array<DatabaseField.AsObject>,
    serviceId: string,
  }
}

export class DatabaseEntitySchema extends jspb.Message {
  getName(): string;
  setName(value: string): void;

  clearFieldsList(): void;
  getFieldsList(): Array<DatabaseFieldSchema>;
  setFieldsList(value: Array<DatabaseFieldSchema>): void;
  addFields(value?: DatabaseFieldSchema, index?: number): DatabaseFieldSchema;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): DatabaseEntitySchema.AsObject;
  static toObject(includeInstance: boolean, msg: DatabaseEntitySchema): DatabaseEntitySchema.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: DatabaseEntitySchema, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): DatabaseEntitySchema;
  static deserializeBinaryFromReader(message: DatabaseEntitySchema, reader: jspb.BinaryReader): DatabaseEntitySchema;
}

export namespace DatabaseEntitySchema {
  export type AsObject = {
    name: string,
    fieldsList: Array<DatabaseFieldSchema.AsObject>,
  }
}

export class DatabaseFieldSchema extends jspb.Message {
  getName(): string;
  setName(value: string): void;

  getType(): string;
  setType(value: string): void;

  clearChoiceOptionsList(): void;
  getChoiceOptionsList(): Array<string>;
  setChoiceOptionsList(value: Array<string>): void;
  addChoiceOptions(value: string, index?: number): string;

  clearReadPermissionsList(): void;
  getReadPermissionsList(): Array<string>;
  setReadPermissionsList(value: Array<string>): void;
  addReadPermissions(value: string, index?: number): string;

  clearWritePermissionsList(): void;
  getWritePermissionsList(): Array<string>;
  setWritePermissionsList(value: Array<string>): void;
  addWritePermissions(value: string, index?: number): string;

  getRank(): number;
  setRank(value: number): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): DatabaseFieldSchema.AsObject;
  static toObject(includeInstance: boolean, msg: DatabaseFieldSchema): DatabaseFieldSchema.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: DatabaseFieldSchema, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): DatabaseFieldSchema;
  static deserializeBinaryFromReader(message: DatabaseFieldSchema, reader: jspb.BinaryReader): DatabaseFieldSchema;
}

export namespace DatabaseFieldSchema {
  export type AsObject = {
    name: string,
    type: string,
    choiceOptionsList: Array<string>,
    readPermissionsList: Array<string>,
    writePermissionsList: Array<string>,
    rank: number,
  }
}

export class DatabaseRequest extends jspb.Message {
  getId(): string;
  setId(value: string): void;

  getField(): string;
  setField(value: string): void;

  hasValue(): boolean;
  clearValue(): void;
  getValue(): google_protobuf_any_pb.Any | undefined;
  setValue(value?: google_protobuf_any_pb.Any): void;

  hasWritetime(): boolean;
  clearWritetime(): void;
  getWritetime(): Timestamp | undefined;
  setWritetime(value?: Timestamp): void;

  hasWriterid(): boolean;
  clearWriterid(): void;
  getWriterid(): String | undefined;
  setWriterid(value?: String): void;

  getSuccess(): boolean;
  setSuccess(value: boolean): void;

  getWriteopt(): DatabaseRequest.WriteOptEnumMap[keyof DatabaseRequest.WriteOptEnumMap];
  setWriteopt(value: DatabaseRequest.WriteOptEnumMap[keyof DatabaseRequest.WriteOptEnumMap]): void;

  getErr(): string;
  setErr(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): DatabaseRequest.AsObject;
  static toObject(includeInstance: boolean, msg: DatabaseRequest): DatabaseRequest.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: DatabaseRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): DatabaseRequest;
  static deserializeBinaryFromReader(message: DatabaseRequest, reader: jspb.BinaryReader): DatabaseRequest;
}

export namespace DatabaseRequest {
  export type AsObject = {
    id: string,
    field: string,
    value?: google_protobuf_any_pb.Any.AsObject,
    writetime?: Timestamp.AsObject,
    writerid?: String.AsObject,
    success: boolean,
    writeopt: DatabaseRequest.WriteOptEnumMap[keyof DatabaseRequest.WriteOptEnumMap],
    err: string,
  }

  export interface WriteOptEnumMap {
    WRITE_NORMAL: 0;
    WRITE_CHANGES: 1;
  }

  export const WriteOptEnum: WriteOptEnumMap;
}

export class DatabaseSnapshot extends jspb.Message {
  clearEntitiesList(): void;
  getEntitiesList(): Array<DatabaseEntity>;
  setEntitiesList(value: Array<DatabaseEntity>): void;
  addEntities(value?: DatabaseEntity, index?: number): DatabaseEntity;

  clearFieldsList(): void;
  getFieldsList(): Array<DatabaseField>;
  setFieldsList(value: Array<DatabaseField>): void;
  addFields(value?: DatabaseField, index?: number): DatabaseField;

  clearEntityschemasList(): void;
  getEntityschemasList(): Array<DatabaseEntitySchema>;
  setEntityschemasList(value: Array<DatabaseEntitySchema>): void;
  addEntityschemas(value?: DatabaseEntitySchema, index?: number): DatabaseEntitySchema;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): DatabaseSnapshot.AsObject;
  static toObject(includeInstance: boolean, msg: DatabaseSnapshot): DatabaseSnapshot.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: DatabaseSnapshot, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): DatabaseSnapshot;
  static deserializeBinaryFromReader(message: DatabaseSnapshot, reader: jspb.BinaryReader): DatabaseSnapshot;
}

export namespace DatabaseSnapshot {
  export type AsObject = {
    entitiesList: Array<DatabaseEntity.AsObject>,
    fieldsList: Array<DatabaseField.AsObject>,
    entityschemasList: Array<DatabaseEntitySchema.AsObject>,
  }
}

export class Int extends jspb.Message {
  getRaw(): number;
  setRaw(value: number): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Int.AsObject;
  static toObject(includeInstance: boolean, msg: Int): Int.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: Int, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Int;
  static deserializeBinaryFromReader(message: Int, reader: jspb.BinaryReader): Int;
}

export namespace Int {
  export type AsObject = {
    raw: number,
  }
}

export class String extends jspb.Message {
  getRaw(): string;
  setRaw(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): String.AsObject;
  static toObject(includeInstance: boolean, msg: String): String.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: String, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): String;
  static deserializeBinaryFromReader(message: String, reader: jspb.BinaryReader): String;
}

export namespace String {
  export type AsObject = {
    raw: string,
  }
}

export class Timestamp extends jspb.Message {
  hasRaw(): boolean;
  clearRaw(): void;
  getRaw(): google_protobuf_timestamp_pb.Timestamp | undefined;
  setRaw(value?: google_protobuf_timestamp_pb.Timestamp): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Timestamp.AsObject;
  static toObject(includeInstance: boolean, msg: Timestamp): Timestamp.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: Timestamp, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Timestamp;
  static deserializeBinaryFromReader(message: Timestamp, reader: jspb.BinaryReader): Timestamp;
}

export namespace Timestamp {
  export type AsObject = {
    raw?: google_protobuf_timestamp_pb.Timestamp.AsObject,
  }
}

export class Float extends jspb.Message {
  getRaw(): number;
  setRaw(value: number): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Float.AsObject;
  static toObject(includeInstance: boolean, msg: Float): Float.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: Float, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Float;
  static deserializeBinaryFromReader(message: Float, reader: jspb.BinaryReader): Float;
}

export namespace Float {
  export type AsObject = {
    raw: number,
  }
}

export class Bool extends jspb.Message {
  getRaw(): boolean;
  setRaw(value: boolean): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Bool.AsObject;
  static toObject(includeInstance: boolean, msg: Bool): Bool.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: Bool, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Bool;
  static deserializeBinaryFromReader(message: Bool, reader: jspb.BinaryReader): Bool;
}

export namespace Bool {
  export type AsObject = {
    raw: boolean,
  }
}

export class EntityReference extends jspb.Message {
  getRaw(): string;
  setRaw(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): EntityReference.AsObject;
  static toObject(includeInstance: boolean, msg: EntityReference): EntityReference.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: EntityReference, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): EntityReference;
  static deserializeBinaryFromReader(message: EntityReference, reader: jspb.BinaryReader): EntityReference;
}

export namespace EntityReference {
  export type AsObject = {
    raw: string,
  }
}

export class BinaryFile extends jspb.Message {
  getRaw(): string;
  setRaw(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): BinaryFile.AsObject;
  static toObject(includeInstance: boolean, msg: BinaryFile): BinaryFile.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: BinaryFile, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): BinaryFile;
  static deserializeBinaryFromReader(message: BinaryFile, reader: jspb.BinaryReader): BinaryFile;
}

export namespace BinaryFile {
  export type AsObject = {
    raw: string,
  }
}

export class Choice extends jspb.Message {
  getRaw(): number;
  setRaw(value: number): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Choice.AsObject;
  static toObject(includeInstance: boolean, msg: Choice): Choice.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: Choice, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Choice;
  static deserializeBinaryFromReader(message: Choice, reader: jspb.BinaryReader): Choice;
}

export namespace Choice {
  export type AsObject = {
    raw: number,
  }
}

export class EntityList extends jspb.Message {
  clearRawList(): void;
  getRawList(): Array<string>;
  setRawList(value: Array<string>): void;
  addRaw(value: string, index?: number): string;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): EntityList.AsObject;
  static toObject(includeInstance: boolean, msg: EntityList): EntityList.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: EntityList, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): EntityList;
  static deserializeBinaryFromReader(message: EntityList, reader: jspb.BinaryReader): EntityList;
}

export namespace EntityList {
  export type AsObject = {
    rawList: Array<string>,
  }
}

export class LogMessage extends jspb.Message {
  getApplication(): string;
  setApplication(value: string): void;

  getLevel(): LogMessage.LogLevelEnumMap[keyof LogMessage.LogLevelEnumMap];
  setLevel(value: LogMessage.LogLevelEnumMap[keyof LogMessage.LogLevelEnumMap]): void;

  getMessage(): string;
  setMessage(value: string): void;

  hasTimestamp(): boolean;
  clearTimestamp(): void;
  getTimestamp(): google_protobuf_timestamp_pb.Timestamp | undefined;
  setTimestamp(value?: google_protobuf_timestamp_pb.Timestamp): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): LogMessage.AsObject;
  static toObject(includeInstance: boolean, msg: LogMessage): LogMessage.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: LogMessage, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): LogMessage;
  static deserializeBinaryFromReader(message: LogMessage, reader: jspb.BinaryReader): LogMessage;
}

export namespace LogMessage {
  export type AsObject = {
    application: string,
    level: LogMessage.LogLevelEnumMap[keyof LogMessage.LogLevelEnumMap],
    message: string,
    timestamp?: google_protobuf_timestamp_pb.Timestamp.AsObject,
  }

  export interface LogLevelEnumMap {
    UNSPECIFIED: 0;
    TRACE: 1;
    DEBUG: 2;
    INFO: 3;
    WARN: 4;
    ERROR: 5;
    PANIC: 6;
  }

  export const LogLevelEnum: LogLevelEnumMap;
}

