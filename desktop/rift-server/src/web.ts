import express, { Request, Response } from "express";
import cors from "cors";
import type WebSocketManager from "./sockets.js";

// Factory function to create express app with socket manager reference
export function createApp(sockets: WebSocketManager) {
    const app = express();
    app.use(cors());
    app.use(express.json());

    // GET /. Just return some default text.
    app.get("/", (req: Request, res: Response) => {
        res.send("Rift server is running.");
    });

    // GET /status/:userId - Check if a desktop is online for a user
    app.get("/status/:userId", async (req: Request, res: Response) => {
        const userId = req.params.userId;

        if (!userId) {
            return res.status(400).json({
                ok: false,
                error: "Missing user ID."
            });
        }

        const isOnline = sockets.isUserOnline(userId);

        res.json({
            ok: true,
            userId,
            desktopOnline: isOnline
        });
    });

    return app;
}
