import { writable, type Writable } from 'svelte/store';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface WsMessage<T = unknown> {
  type: string;
  payload?: T;
}

interface WebSocketClientOptions {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onMessage?: (message: WsMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private intentionallyClosed = false;

  public status: Writable<ConnectionStatus> = writable('disconnected');

  constructor(private options: WebSocketClientOptions) {
    const {
      reconnectInterval = 2000,
      maxReconnectAttempts = 10,
    } = options;

    this.options.reconnectInterval = reconnectInterval;
    this.options.maxReconnectAttempts = maxReconnectAttempts;
  }

  connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    this.intentionallyClosed = false;
    this.status.set('connecting');

    try {
      this.ws = new WebSocket(this.options.url);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.status.set('connected');
        this.options.onConnect?.();
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WsMessage = JSON.parse(event.data);
          this.options.onMessage?.(message);
        } catch (error) {
          console.error('[WS] Failed to parse message:', error);
        }
      };

      this.ws.onclose = () => {
        this.ws = null;
        this.status.set('disconnected');
        this.options.onDisconnect?.();

        if (!this.intentionallyClosed) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error('[WS] Error:', error);
        this.status.set('error');
        this.options.onError?.(error);
      };
    } catch (error) {
      console.error('[WS] Connection failed:', error);
      this.status.set('error');
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= (this.options.maxReconnectAttempts || 10)) {
      console.error('[WS] Max reconnect attempts reached');
      this.status.set('error');
      return;
    }

    const delay = Math.min(
      this.options.reconnectInterval! * Math.pow(2, this.reconnectAttempts),
      30000 // Max 30 seconds
    );

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  send(message: WsMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('[WS] Cannot send message: not connected');
    }
  }

  disconnect() {
    this.intentionallyClosed = true;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.status.set('disconnected');
  }

  ping() {
    this.send({ type: 'ping' });
  }
}

// Create singleton instance
let wsClient: WebSocketClient | null = null;

export function createWebSocketClient(options: Omit<WebSocketClientOptions, 'url'>): WebSocketClient {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  const url = `${protocol}//${host}/api/ws`;

  if (wsClient) {
    wsClient.disconnect();
  }

  wsClient = new WebSocketClient({ ...options, url });
  return wsClient;
}

export function getWebSocketClient(): WebSocketClient | null {
  return wsClient;
}
