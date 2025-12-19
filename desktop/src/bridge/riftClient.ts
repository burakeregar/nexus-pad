/**
 * WebSocket client for connecting to Rift server
 * Simplified: Uses only userId for authentication (no JWT/publicKey)
 */

import { RiftOpcode } from './types';

export interface RiftClientCallbacks {
  onOpen: () => void;
  onClose: () => void;
  onMessage: (uuid: string, message: any) => void;
  onNewConnection: (uuid: string) => void;
  onConnectionClosed: (uuid: string) => void;
}

export class RiftClient {
  private ws: WebSocket | null = null;
  private userId: string;
  private riftUrl: string;
  private callbacks: RiftClientCallbacks;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isConnecting = false;
  private intentionalDisconnect = false;

  constructor(riftUrl: string, userId: string, callbacks: RiftClientCallbacks) {
    this.riftUrl = riftUrl;
    this.userId = userId;
    this.callbacks = callbacks;
  }

  /**
   * Connects to Rift server using just the userId
   */
  async connect(): Promise<void> {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;
    this.intentionalDisconnect = false;

    try {
      // Simplified: just userId in the query params
      const url = `${this.riftUrl}/conduit?userId=${encodeURIComponent(this.userId)}`;
      console.log('[RiftClient] Connecting to:', url);

      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log('[RiftClient] Connected to Rift server');
        this.isConnecting = false;
        this.callbacks.onOpen();
      };

      this.ws.onmessage = (event) => {
        try {
          const [op, ...args] = JSON.parse(event.data);

          if (op === RiftOpcode.OPEN) {
            const uuid = args[0];
            console.log('[RiftClient] New mobile connection:', uuid);
            this.callbacks.onNewConnection(uuid);
          } else if (op === RiftOpcode.MSG) {
            const [uuid, message] = args;
            this.callbacks.onMessage(uuid, message);
          } else if (op === RiftOpcode.CLOSE) {
            const uuid = args[0];
            console.log('[RiftClient] Mobile connection closed:', uuid);
            this.callbacks.onConnectionClosed(uuid);
          }
        } catch (error) {
          console.error('[RiftClient] Error parsing message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('[RiftClient] WebSocket error:', error);
        this.isConnecting = false;
      };

      this.ws.onclose = () => {
        console.log('[RiftClient] Disconnected from Rift server');
        this.ws = null;
        this.isConnecting = false;
        this.callbacks.onClose();

        // Only attempt to reconnect if this wasn't an intentional disconnect
        if (!this.intentionalDisconnect) {
          if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
          }
          this.reconnectTimer = setTimeout(() => {
            if (!this.isConnecting && !this.intentionalDisconnect) {
              console.log('[RiftClient] Attempting to reconnect...');
              this.connect();
            }
          }, 5000);
        }
      };
    } catch (error) {
      console.error('[RiftClient] Connection error:', error);
      this.isConnecting = false;
      throw error;
    }
  }

  /**
   * Sends a message to a mobile client
   */
  sendToMobile(uuid: string, message: any): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('[RiftClient] Cannot send message, not connected');
      return;
    }

    this.ws.send(JSON.stringify([RiftOpcode.REPLY, uuid, message]));
  }

  /**
   * Disconnects from Rift server
   */
  disconnect(): void {
    this.intentionalDisconnect = true;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Checks if connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}
