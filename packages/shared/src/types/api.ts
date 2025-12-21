// Common API response types

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}

export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
}

// WebSocket message types
export type WsMessageType =
  | 'ping'
  | 'pong'
  | 'subscribe'
  | 'unsubscribe'
  | 'grocery:added'
  | 'grocery:updated'
  | 'grocery:deleted'
  | 'grocery:cleared';

export interface WsMessage<T = unknown> {
  type: WsMessageType;
  payload?: T;
  timestamp?: string;
}

// Specific WebSocket payloads
export interface GroceryAddedPayload {
  item: import('./grocery.js').GroceryItem;
}

export interface GroceryUpdatedPayload {
  item: import('./grocery.js').GroceryItem;
}

export interface GroceryDeletedPayload {
  id: number;
}

export interface GroceryClearedPayload {
  ids: number[];
}
