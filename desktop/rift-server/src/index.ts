import dotenv from "dotenv";
dotenv.config();

import * as http from "http";
import { createApp } from "./web.js";
import WebSocketManager from "./sockets.js";

const PORT = process.env.PORT || 51001;

(async () => {
    console.log("[+] Starting rift server (simplified auth)...");

    const sockets = new WebSocketManager();
    const app = createApp(sockets);
    const server = http.createServer(app);

    server.on("upgrade", sockets.handleUpgradeRequest);

    console.log("[+] Listening on 0.0.0.0:" + PORT + "... ^C to exit.");
    server.listen(PORT);
})();
