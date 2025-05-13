import { defineStore } from 'pinia';
import { getApiBaseUrl } from '@/core/utils/url';
import { Message } from 'google-protobuf';
import { Timestamp } from 'google-protobuf/google/protobuf/timestamp_pb';
import { Any } from 'google-protobuf/google/protobuf/any_pb';
import { v4 as uuidv4 } from 'uuid';
import { ApiHeader, ApiMessage, ApiConfigCreateEntityRequest, ApiConfigCreateEntityResponse } from '@/generated/qlib/pkg/qprotobufs/protobufs_pb';
import { EntityFactories, NotificationManager, ValueFactories } from '@/core/data/types';
import type { EntityId, EntityType, Entity } from '@/core/data/types';

interface DeserializableMessage {
    deserializeBinary(data: Uint8Array): Message;
}

interface WaitingResponse {
    sentTimestamp: number;
    responsePrototype: DeserializableMessage;
    resolve: (value: Message) => void;
    reject: (error: Error) => void;
}

export const useDataStore = defineStore('data', {
    state: () => ({
        socket: null as WebSocket | null,
        isConnected: false,
        waitingResponses: {} as Record<string, WaitingResponse>,
        notificationManager: new NotificationManager(),
    }),

    actions: {
        connect() {
            const me = this;

            if (!me.socket) {
                me.socket = new WebSocket(getApiBaseUrl());
                me.socket.onopen = () => {
                    me.isConnected = true;
                };
                me.socket.onclose = () => {
                    me.isConnected = false;
                    me.socket = null;

                    for (const requestId in me.waitingResponses) {
                        const request = me.waitingResponses[requestId];
                        request.reject(new Error('WebSocket connection closed'));
                    }

                    me.waitingResponses = {};

                    // reconnect after 1 second
                    setTimeout(() => {
                        me.connect();
                    }, 1000);
                };
                me.socket.onerror = (error) => {
                    console.error('WebSocket error:', error);
                };
                me.socket.onmessage = (event) => {
                    me.onMessage(event);
                };
            }
        },

        disconnect() {
            const me = this;

            if (this.socket) {
                this.socket.close();
                this.socket = null;
                this.isConnected = false;
            }
        },

        onMessage(event: MessageEvent) {
            const me = this;
            const fileReader = new FileReader();
            fileReader.onload = (e) => {
                const message = ApiMessage.deserializeBinary(new Uint8Array(e.target?.result as ArrayBuffer));
                const requestId = message.getHeader()?.getId();
                if (!requestId) {
                    console.warn('Received message without request ID:', message);
                    return;
                }

                if (!me.waitingResponses[requestId]) {
                    console.warn('Received message without matching request ID:', requestId);
                    return;
                }

                const request = me.waitingResponses[requestId];
                const payload = message.getPayload()?.getValue_asU8();
                if (!payload) {
                    console.warn('Received message without payload:', message);
                    request.reject(new Error('Received message without payload'));
                    return;
                }

                const response = request.responsePrototype.deserializeBinary(payload);
                if (response) {
                    request.resolve(response);
                } else {
                    request.reject(new Error('Failed to deserialize response'));
                }
            }
            fileReader.readAsArrayBuffer(event.data);
        },

        sendMessage(request: Message, responsePrototype: DeserializableMessage) {
            const requestId = uuidv4();
            const sentTimestamp = Date.now();

            const header = new ApiHeader();
            header.setId(requestId);
            header.setTimestamp(Timestamp.fromDate(new Date(sentTimestamp)));

            const message = new ApiMessage();
            message.setHeader(header);
            message.setPayload(new Any());
            message.getPayload()?.pack(request.serializeBinary(), 'qprotobufs.' + responsePrototype.constructor.name);

            try {
                return new Promise((resolve, reject) => {
                    this.waitingResponses[requestId] = {
                        sentTimestamp,
                        responsePrototype,
                        resolve,
                        reject,
                    };

                    if (!this.isConnected || !this.socket) {
                        reject(new Error('WebSocket is not connected'));
                    } else {
                        this.socket.send(message.serializeBinary());
                        console.log('Request sent:', requestId, request.toObject());
                    }
                });
            } finally {
                if (requestId in this.waitingResponses) {
                    delete this.waitingResponses[requestId];
                }
            }
        },

        createEntity(parentId: EntityId, entityType: EntityType, entityName: string) {
            const me = this;
            const request = new ApiConfigCreateEntityRequest();
            request.setParentid(parentId);
            request.setName(entityName);
            request.setType(entityType);

            return me
                .sendMessage(request, ApiConfigCreateEntityResponse)
                .then((anyResponse) => {
                    const response = anyResponse as ApiConfigCreateEntityResponse;

                    if (response.getStatus() !== ApiConfigCreateEntityResponse.StatusEnum.SUCCESS) {
                        throw new Error(`Could not complete the request: ${response.getStatus()}`);
                    }
                    
                    const entity = EntityFactories.newEntity(response.getId())
                    entity.field("Name").value = ValueFactories.newString(entityName)
                    entity.field("Parent").value = ValueFactories.newEntityReference(parentId)
                    return entity;
                })
                .catch(error => {
                    throw new Error(`Failed to create entity: ${error}`);
                });
        }
    },
})