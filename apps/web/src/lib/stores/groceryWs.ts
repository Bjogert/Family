import { writable } from 'svelte/store';
import { createWebSocketClient, type WsMessage, type ConnectionStatus } from '$lib/websocket/client';
import type { GroceryItem } from '$lib/types/grocery';

interface GroceryWsStore {
  status: ConnectionStatus;
  lastMessage: WsMessage | null;
}

const initialState: GroceryWsStore = {
  status: 'disconnected',
  lastMessage: null,
};

function createGroceryWsStore() {
  const { subscribe, set, update } = writable<GroceryWsStore>(initialState);

  let client: ReturnType<typeof createWebSocketClient> | null = null;

  return {
    subscribe,

    connect() {
      if (client) {
        return; // Already initialized
      }

      client = createWebSocketClient({
        onMessage: (message) => {
          update((state) => ({
            ...state,
            lastMessage: message,
          }));
        },
        onConnect: () => {
          update((state) => ({
            ...state,
            status: 'connected',
          }));
        },
        onDisconnect: () => {
          update((state) => ({
            ...state,
            status: 'disconnected',
          }));
        },
        onError: () => {
          update((state) => ({
            ...state,
            status: 'error',
          }));
        },
      });

      // Subscribe to client status
      client.status.subscribe((status) => {
        update((state) => ({
          ...state,
          status,
        }));
      });

      client.connect();
    },

    disconnect() {
      if (client) {
        client.disconnect();
        client = null;
        set(initialState);
      }
    },

    send(message: WsMessage) {
      client?.send(message);
    },

    ping() {
      client?.ping();
    },
  };
}

export const groceryWs = createGroceryWsStore();

// Message type definitions
export interface GroceryAddedMessage {
  type: 'grocery:added';
  payload: { item: GroceryItem };
}

export interface GroceryUpdatedMessage {
  type: 'grocery:updated';
  payload: { item: GroceryItem };
}

export interface GroceryDeletedMessage {
  type: 'grocery:deleted';
  payload: { id: number };
}

export interface GroceryClearedMessage {
  type: 'grocery:cleared';
  payload: { count: number };
}

export type GroceryWsMessage =
  | GroceryAddedMessage
  | GroceryUpdatedMessage
  | GroceryDeletedMessage
  | GroceryClearedMessage;
