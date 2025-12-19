/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Main bridge coordinator (LCU ↔ Rift ↔ Mobile)
 * Simplified: Uses only Supabase userId for authentication
 */

import { RiftClient, type RiftClientCallbacks } from './riftClient';
import { MobileHandler, type MobileHandlerCallbacks } from './mobileHandler';
import { MobileOpcode } from './types';
import { getLcuClient, type LcuClient } from '../lib/lcuClient';
import { watchLcuConnection } from '../lib/lcuConnection';

export interface BridgeConfig {
  riftUrl: string;
  userId: string; // Supabase user ID - this is all we need now
}

export interface ConnectionRequestCallback {
  (deviceInfo: { device: string; browser: string; identity: string }): Promise<boolean>;
}

export interface StatusChangeCallback {
  (status: {
    riftConnected: boolean;
    mobileConnected: boolean;
    lcuConnected: boolean;
  }): void;
}

export class BridgeManager {
  private riftClient: RiftClient | null = null;
  private mobileHandlers: Map<string, MobileHandler> = new Map();
  private config: BridgeConfig | null = null;
  private lcuClient: LcuClient = getLcuClient();
  private connectionRequestCallback: ConnectionRequestCallback | null = null;
  private statusChangeCallback: StatusChangeCallback | null = null;
  private stopLcuWatching: (() => void) | null = null;
  private lcuConnected: boolean = false;
  private riftConnected: boolean = false;
  private lastFailedLcuPort: number | null = null;

  /**
   * Sets the connection request callback
   */
  setConnectionRequestCallback(callback: ConnectionRequestCallback): void {
    this.connectionRequestCallback = callback;
  }

  /**
   * Sets the status change callback
   */
  setStatusChangeCallback(callback: StatusChangeCallback): void {
    this.statusChangeCallback = callback;
  }

  /**
   * Gets current connection status
   */
  getStatus() {
    return {
      riftConnected: this.riftConnected,
      mobileConnected: this.mobileHandlers.size > 0,
      lcuConnected: this.lcuConnected,
    };
  }

  /**
   * Notifies listeners about status change and broadcasts to mobile
   */
  private notifyStatusChange(): void {
    const status = this.getStatus();

    if (this.statusChangeCallback) {
      this.statusChangeCallback(status);
    }

    this.broadcastStatusToMobile();
  }

  /**
   * Broadcasts current status to all connected mobile devices
   */
  private async broadcastStatusToMobile(): Promise<void> {
    const status = this.getStatus();

    for (const [uuid, handler] of this.mobileHandlers.entries()) {
      try {
        if (handler.isReady()) {
          const encrypted = await handler.encryptMessage([
            MobileOpcode.STATUS,
            status
          ]);
          this.riftClient?.sendToMobile(uuid, encrypted);
        }
      } catch (error) {
        console.error('[BridgeManager] Failed to broadcast status to mobile:', error);
      }
    }
  }

  /**
   * Initializes the bridge - simplified, no registration needed
   */
  async initialize(config: BridgeConfig): Promise<void> {
    if (this.riftClient?.isConnected()) {
      console.log('[BridgeManager] Already connected, skipping initialization');
      return;
    }

    this.config = config;

    // Start watching for LCU connection
    this.startLcuWatching();

    // Directly connect to Rift server (no registration needed now)
    await this.connectToRift();
  }

  /**
   * Starts watching for League client connection
   */
  private startLcuWatching(): void {
    if (this.stopLcuWatching) {
      return;
    }

    console.log('[BridgeManager] Starting LCU connection watch...');

    this.stopLcuWatching = watchLcuConnection(
      async (lcuConfig) => {
        if (this.lastFailedLcuPort === lcuConfig.port) {
          return;
        }

        console.log('[BridgeManager] LCU lockfile found on port:', lcuConfig.port);
        try {
          await this.lcuClient.connect(lcuConfig);
          this.lcuConnected = true;
          this.lastFailedLcuPort = null;
          console.log('[BridgeManager] LCU client verified and connected');
          this.notifyStatusChange();
        } catch (error) {
          console.log('[BridgeManager] LCU connection failed (stale lockfile?):', error);
          this.lcuConnected = false;
          this.lastFailedLcuPort = lcuConfig.port;
          this.lcuClient.disconnect();
          this.notifyStatusChange();
        }
      },
      () => {
        console.log('[BridgeManager] LCU disconnected (lockfile removed)');
        this.lcuConnected = false;
        this.lastFailedLcuPort = null;
        this.lcuClient.disconnect();
        this.notifyStatusChange();
      },
      3000
    );
  }

  /**
   * Checks if LCU client is connected
   */
  isLcuConnected(): boolean {
    return this.lcuConnected && this.lcuClient.isConnected();
  }

  /**
   * Connects to Rift WebSocket server - simplified, uses only userId
   */
  private async connectToRift(): Promise<void> {
    if (!this.config) {
      throw new Error('Bridge not initialized');
    }

    // Disconnect existing client before creating new one
    if (this.riftClient) {
      console.log('[BridgeManager] Disconnecting existing Rift client');
      this.riftClient.disconnect();
      this.riftClient = null;
    }

    const callbacks: RiftClientCallbacks = {
      onOpen: () => {
        console.log('[BridgeManager] Connected to Rift server');
        this.riftConnected = true;
        this.notifyStatusChange();
      },
      onClose: () => {
        console.log('[BridgeManager] Disconnected from Rift server');
        this.riftConnected = false;
        this.notifyStatusChange();
      },
      onNewConnection: async (uuid: string) => {
        console.log('[BridgeManager] New mobile connection:', uuid);
        this.createMobileHandler(uuid);

        // Send public key to mobile as first message
        try {
          const { exportPublicKey } = await import('./crypto');
          const publicKey = await exportPublicKey();
          console.log('[BridgeManager] Sending public key to mobile:', uuid);
          this.riftClient?.sendToMobile(uuid, ['PUBKEY', publicKey]);
        } catch (error) {
          console.error('[BridgeManager] Failed to send public key:', error);
        }
      },
      onConnectionClosed: (uuid: string) => {
        console.log('[BridgeManager] Mobile connection closed:', uuid);
        this.removeMobileHandler(uuid);
        this.notifyStatusChange();
      },
      onMessage: (uuid: string, message: any) => {
        this.handleRiftMessage(uuid, message);
      }
    };

    // Use userId directly instead of JWT token
    this.riftClient = new RiftClient(
      this.config.riftUrl.replace('http://', 'ws://').replace('https://', 'wss://').replace('localhost', '127.0.0.1'),
      this.config.userId,
      callbacks
    );

    console.log('[BridgeManager] Connecting to Rift with userId:', this.config.userId);
    await this.riftClient.connect();
  }

  /**
   * Creates a handler for a mobile connection
   */
  private createMobileHandler(uuid: string): void {
    const callbacks: MobileHandlerCallbacks = {
      onRequest: async (_id: number, path: string, method: string, body: string | null) => {
        try {
          const result = await this.lcuClient.request(path, method, body ? JSON.parse(body) : undefined);
          return { status: 200, content: result };
        } catch (error: any) {
          console.error('[BridgeManager] LCU request failed:', error);
          return { status: error.status || 500, content: { error: error.message } };
        }
      },
      onConnectionRequest: async (deviceInfo: { device: string; browser: string; identity: string }) => {
        console.log('[BridgeManager] Auto-approving mobile connection:', deviceInfo);

        if (this.connectionRequestCallback) {
          console.log('[BridgeManager] Ignoring connectionRequestCallback (auto-approve enabled)');
        }

        setTimeout(() => this.notifyStatusChange(), 100);
        return true;
      },
      onStatusRequest: () => {
        return this.getStatus();
      },
      onConnectionApproved: () => {
        console.log('[BridgeManager] Mobile connection fully established');
        this.notifyStatusChange();
      },
      onSubscribe: (path: string) => {
        const unsubscribe = this.lcuClient.observe(path, (event) => {
          const handler = this.mobileHandlers.get(uuid);
          if (handler && handler.matchesObservedPath(path)) {
            handler.encryptMessage([
              MobileOpcode.UPDATE,
              path,
              200,
              event.data
            ]).then(encrypted => {
              this.riftClient?.sendToMobile(uuid, encrypted);
            }).catch(error => {
              console.error('[BridgeManager] Failed to encrypt update:', error);
            });
          }
        });

        const handler = this.mobileHandlers.get(uuid);
        if (handler) {
          (handler as any).lcuObservers = (handler as any).lcuObservers || new Map();
          (handler as any).lcuObservers.set(path, unsubscribe);
        }
      },
      onUnsubscribe: (path: string) => {
        const handler = this.mobileHandlers.get(uuid);
        if (handler && (handler as any).lcuObservers) {
          const unsubscribe = (handler as any).lcuObservers.get(path);
          if (unsubscribe) {
            unsubscribe();
            (handler as any).lcuObservers.delete(path);
          }
        }
      }
    };

    const handler = new MobileHandler(callbacks);
    this.mobileHandlers.set(uuid, handler);
  }

  /**
   * Removes a mobile handler
   */
  private removeMobileHandler(uuid: string): void {
    const handler = this.mobileHandlers.get(uuid);
    if (handler) {
      handler.cleanup();
      this.mobileHandlers.delete(uuid);
    }
  }

  /**
   * Handles message from Rift server
   */
  private handleRiftMessage(uuid: string, message: any): void {
    const handler = this.mobileHandlers.get(uuid);
    if (!handler) {
      console.warn('[BridgeManager] No handler for mobile connection:', uuid);
      return;
    }

    handler.handleMessage(message).then(result => {
      console.log('[BridgeManager] handleMessage result:', result ? 'got result' : 'null');
      if (!result) {
        return;
      }

      try {
        const parsed = JSON.parse(result);
        if (Array.isArray(parsed) && parsed[0] === MobileOpcode.SECRET_RESPONSE) {
          console.log('[BridgeManager] Sending SECRET_RESPONSE to mobile:', parsed[1]);
          this.riftClient?.sendToMobile(uuid, parsed);
          return;
        }
      } catch {
        // Not a JSON response
      }

      console.log('[BridgeManager] Calling handleDecryptedMessage with result length:', result.length);
      handler.handleDecryptedMessage(result).then(async response => {
        console.log('[BridgeManager] handleDecryptedMessage response:', response ? 'got response' : 'null');
        if (response) {
          console.log('[BridgeManager] Encrypting and sending response');
          const encrypted = await handler.encryptMessage(response);
          this.riftClient?.sendToMobile(uuid, encrypted);
          console.log('[BridgeManager] Response sent');
        }
      }).catch(error => {
        console.error('[BridgeManager] Error handling mobile message:', error);
      });
    }).catch(error => {
      console.error('[BridgeManager] Error handling message:', error);
    });
  }

  /**
   * Disconnects from Rift
   */
  disconnect(): void {
    if (this.stopLcuWatching) {
      this.stopLcuWatching();
      this.stopLcuWatching = null;
    }

    if (this.lcuClient) {
      this.lcuClient.disconnect();
      this.lcuConnected = false;
    }

    if (this.riftClient) {
      this.riftClient.disconnect();
      this.riftClient = null;
    }

    for (const handler of this.mobileHandlers.values()) {
      handler.cleanup();
    }
    this.mobileHandlers.clear();
  }
}

// Singleton instance
let bridgeManagerInstance: BridgeManager | null = null;

export function getBridgeManager(): BridgeManager {
  if (!bridgeManagerInstance) {
    bridgeManagerInstance = new BridgeManager();
  }
  return bridgeManagerInstance;
}
