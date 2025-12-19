import { createRequire } from "module";
const require = createRequire(import.meta.url);
const ws = require("ws");
const WebSocketServer = ws.Server;
const WebSocket = ws.WebSocket;
import type { Server as WebSocketServerType, WebSocket as WebSocketType } from "ws";
type VerifyClientCallbackAsync = (info: { origin: string; secure: boolean; req: any }, callback: (result: boolean, code?: number, message?: string) => void) => void;
import * as url from "url";
import { v4 as uuidv4 } from "uuid";
import { Socket } from "net";
import { IncomingMessage } from "http";
import { URL } from "url";
import { RiftOpcode } from "./types.js";

// Extend IncomingMessage to include userId from query params
declare module "http" {
    interface IncomingMessage {
        userId?: string;
    }
}

/**
 * Represents a single mobile connection to a specific Conduit instance. The
 * UUID identifies the request within Conduit so it can differentiate between
 * different clients connected at the same time.
 */
interface MobileConnection {
    uuid: string;
    socket: WebSocketType;
}

/**
 * Wrapper class that manages the two websocket servers for mobile and conduit clients.
 * Simplified to use only Supabase userId for authentication.
 */
export default class WebSocketManager {
    private mobileServer: WebSocketServerType;
    private conduitServer: WebSocketServerType;

    private conduitConnections = new Map<string, WebSocketType>();
    private conduitToMobileMap = new Map<WebSocketType, MobileConnection[]>();
    private mobileToConduitMap = new Map<WebSocketType, MobileConnection>();

    constructor() {
        this.mobileServer = new WebSocketServer({ noServer: true });
        this.mobileServer.on("connection", this.handleMobileConnection);

        this.conduitServer = new WebSocketServer({
            noServer: true,
            verifyClient: this.verifyConduitClient
        });
        this.conduitServer.on("connection", this.handleConduitConnection);

        setInterval(() => {
            // Every 10 seconds, ping our connected clients to stay connected.
            this.mobileServer.clients.forEach((c: WebSocketType) => {
                if (c.readyState === WebSocket.OPEN) c.ping();
            });

            this.conduitServer.clients.forEach((c: WebSocketType) => {
                if (c.readyState === WebSocket.OPEN) c.ping();
            });
        }, 10000);
    }

    /**
     * Checks if a desktop (conduit) is online for a specific user ID.
     */
    public isUserOnline(userId: string): boolean {
        const connection = this.conduitConnections.get(userId);
        return connection !== undefined && connection.readyState === WebSocket.OPEN;
    }

    /**
     * Gets a list of all online user IDs (for debugging).
     */
    public getOnlineUsers(): string[] {
        const online: string[] = [];
        for (const [userId, socket] of this.conduitConnections.entries()) {
            if (socket.readyState === WebSocket.OPEN) {
                online.push(userId);
            }
        }
        return online;
    }

    /**
     * Handles a on("upgrade") from a HTTP(s) server to select which websocket
     * server should handle the specified request. If an invalid path is given,
     * the socket is just terminated.
     */
    public handleUpgradeRequest = async (request: IncomingMessage, socket: Socket, head: Buffer) => {
        if (!request.url) return socket.destroy();
        const pathname = url.parse(request.url).pathname;

        if (pathname === "/conduit") {
            this.conduitServer.handleUpgrade(request, socket, head, (ws: WebSocketType) => {
                this.conduitServer.emit('connection', ws, request);
            });
        } else if (pathname === "/mobile") {
            this.mobileServer.handleUpgrade(request, socket, head, (ws: WebSocketType) => {
                this.mobileServer.emit('connection', ws, request);
            });
        } else {
            console.log("[-] Received upgrade request for invalid URL: " + request.url);
            socket.destroy();
        }
    };

    /**
     * Verifies that a Conduit client has a valid userId in the query params.
     * No more JWT or public key validation - just check for userId.
     */
    private verifyConduitClient: VerifyClientCallbackAsync = async (info, cb) => {
        try {
            const url = new URL("https://foo.com" + info.req.url!);
            const userId = url.searchParams.get("userId");

            if (!userId) {
                console.log("[-] Conduit connection rejected: missing userId");
                return cb(false, 401, "Missing userId");
            }

            // Store userId on request for later use
            info.req.userId = userId;
            console.log("[+] Conduit client verified for user: " + userId);
            cb(true);
        } catch (e) {
            console.log("[-] Disconnected Conduit due to failed handshake: " + e);
            cb(false, 400, "Invalid Request");
        }
    };

    /**
     * Handles a new incoming connection to the conduit endpoint.
     * Just stores the connection by userId.
     */
    private handleConduitConnection = async (ws: WebSocketType, request: IncomingMessage) => {
        const userId = request.userId;
        if (!userId) return;
        console.log("[+] Got a new Conduit connection from user: " + userId);

        // If there was a previous connection, close it.
        if (this.conduitConnections.has(userId)) {
            this.conduitConnections.get(userId)!.close();
        }

        this.conduitConnections.set(userId, ws);
        this.conduitToMobileMap.set(ws, []);

        ws.on("close", () => {
            // Close all mobile sockets connected to this conduit client.
            const mobileConnections = this.conduitToMobileMap.get(ws);
            if (mobileConnections) {
                for (const { socket } of mobileConnections) {
                    socket.close();
                }
            }

            console.log("[+] Conduit host for user " + userId + " disconnected.");
            this.conduitConnections.delete(userId);
            this.conduitToMobileMap.delete(ws);
        });

        ws.on("message", this.handleConduitMessage(ws));
    };

    /**
     * Handles a websocket message sent by a Conduit instance to Rift.
     */
    private handleConduitMessage = (ws: WebSocketType) => async (msg: Buffer) => {
        try {
            const [op, ...args] = JSON.parse(msg.toString());

            if (op === RiftOpcode.REPLY) {
                const [peer, message] = args;
                const entry = this.conduitToMobileMap.get(ws)!.find(x => x.uuid === peer);

                if (!entry) {
                    console.log("[-] Conduit REPLY but peer not found:", peer);
                    return;
                }

                console.log("[+] Forwarding conduit reply to mobile:", peer);
                entry.socket.send(JSON.stringify([RiftOpcode.RECEIVE, message]));
            } else {
                throw new Error("Conduit sent invalid opcode.");
            }
        } catch (e: any) {
            console.log("[-] Error handling conduit message: " + e.message);
            console.log(e);
            ws.close();
        }
    };

    /**
     * Handles a new incoming connection to the mobile endpoint.
     */
    private handleMobileConnection = async (ws: WebSocketType) => {
        console.log("[+] Got a new mobile connection.");

        ws.on("close", () => {
            if (!this.mobileToConduitMap.has(ws)) return;

            const { uuid, socket } = this.mobileToConduitMap.get(ws)!;
            this.mobileToConduitMap.delete(ws);

            const conduitPeers = this.conduitToMobileMap.get(socket);
            if (conduitPeers && uuid) {
                const index = conduitPeers.findIndex(x => x.uuid === uuid);
                if (index !== -1) {
                    conduitPeers.splice(index, 1);
                }
            }

            if (socket.readyState === WebSocket.OPEN && uuid) {
                console.log("[+] Peer connected as " + uuid + " closed.");
                socket.send(JSON.stringify([RiftOpcode.CLOSE, uuid]));
            }
        });

        ws.on("message", this.handleMobileMessage(ws));
    };

    /**
     * Handles a message sent by a mobile peer to Rift.
     * Simplified - no more public key exchange.
     */
    private handleMobileMessage = (ws: WebSocketType) => async (msg: Buffer) => {
        try {
            const [op, ...args] = JSON.parse(msg.toString());

            if (op === RiftOpcode.CONNECT) {
                // If this client is trying to connect while already connected, close.
                if (this.mobileToConduitMap.has(ws)) return ws.close();

                const [userId] = args;
                const done = (connected: boolean) => ws.send(JSON.stringify([RiftOpcode.CONNECT_RESULT, connected]));

                // Look up the conduit connection, send false if conduit is not connected.
                const conduit = this.conduitConnections.get(userId);
                if (!conduit) {
                    console.log("[-] Mobile tried to connect to offline user: " + userId);
                    return done(false);
                }

                // Generate a random connection ID.
                const connectionID = uuidv4();

                let conns = this.conduitToMobileMap.get(conduit);
                if (!conns) this.conduitToMobileMap.set(conduit, conns = []);

                conns.push({ socket: ws, uuid: connectionID });
                this.mobileToConduitMap.set(ws, { socket: conduit, uuid: connectionID });
                console.log("[+] Mobile connected to user " + userId + " as " + connectionID);

                // Inform conduit of new connection, tell mobile it's connected
                conduit.send(JSON.stringify([RiftOpcode.OPEN, connectionID]));
                return done(true);
            } else if (op === RiftOpcode.SEND) {
                const peerDetails = this.mobileToConduitMap.get(ws);
                if (!peerDetails) {
                    console.log("[-] Mobile SEND but not connected to conduit, closing");
                    return ws.close();
                }

                peerDetails.socket.send(JSON.stringify([RiftOpcode.MSG, peerDetails.uuid, args[0]]));
            } else {
                throw new Error("Mobile sent invalid opcode.");
            }
        } catch (e: any) {
            console.log("[-] Error handling mobile message: " + e.message);
            console.log(e);
            ws.close();
        }
    };
}
