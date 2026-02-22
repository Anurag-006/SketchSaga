import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";
import jwt, { JwtPayload } from "jsonwebtoken";
import { prismaClient } from "@repo/database/client";
import { JWT_SECRET } from "@repo/backend-common/config";
import url from "url";
import path from "path";
import { fileURLToPath } from "url";

import dotenv from "dotenv";
import { createClient } from "redis";
import pino from "pino";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });
const logger = pino();

// --- REDIS SETUP ---
const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
const pubClient = createClient({ url: redisUrl });
const subClient = pubClient.duplicate();

await Promise.all([pubClient.connect(), subClient.connect()]);
logger.info("✅ Redis connected");

const server = createServer((req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("OK");
  } else {
    res.writeHead(404);
    res.end();
  }
});

// ---------------- TYPES ----------------
type RoomId = number | string;

type Shape = {
  id?: string;
  type: "rect" | "circle" | "line" | "pencil";
  color: string;
  strokeWidth: number;
  [key: string]: any;
};

interface WebSocketMessageBase {
  type: string;
  data: Record<string, any>;
}

type WebSocketMessage =
  | { type: "join-room"; data: { roomId: RoomId } }
  | { type: "leave-room"; data: { roomId: RoomId } }
  | { type: "chat"; data: { roomId: RoomId; message: string } }
  | {
      type: "shape";
      data: { roomId: RoomId; shape: Shape; final: boolean; userId: string };
    }
  | { type: "undo"; data: { roomId: RoomId; shapeId: string; userId: string } };

// ---------------- ROOMS MAP ----------------
// Map<roomIdOrSlug, Set<WebSocket>>
const rooms = new Map<string, Set<WebSocket>>();
const wsUsers = new Map<WebSocket, string>();

// ---------------- HELPERS ----------------
function parseTokenFromQuery(reqUrl: string | undefined): string | null {
  if (!reqUrl) return null;
  const query = url.parse(reqUrl, true).query;
  const token = query.token;
  if (!token || Array.isArray(token)) return null;
  return token;
}

function verifyUser(token: string): string | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    return typeof decoded === "object" && decoded.userId
      ? decoded.userId
      : null;
  } catch {
    return null;
  }
}

// ---------------- WEBSOCKET SERVER ----------------
const wss = new WebSocketServer({ server });

wss.on("connection", async (ws: WebSocket, req) => {
  let userId: string | null = null;
  const token = parseTokenFromQuery(req.url);

  if (token) {
    userId = verifyUser(token);
    if (!userId) logger.warn("Invalid token, assigning guest id");
  }

  if (!userId) {
    userId = "guest-" + Math.random().toString(36).substr(2, 9);
  }

  wsUsers.set(ws, userId);
  logger.info({ userId }, "Connection established from user");

  ws.on("message", async (raw) => {
    try {
      const message: WebSocketMessage = JSON.parse(raw.toString());
      if (!message || !message.type) return;

      switch (message.type) {
        case "join-room": {
          const roomId: RoomId = message.data.roomId;
          const key = String(roomId);

          if (!rooms.has(key)) {
            rooms.set(key, new Set());

            // Subscribe to Redis channel
            await subClient.subscribe(`room:${key}`, (redisMsg) => {
              const localClients = rooms.get(key);
              if (localClients) {
                localClients.forEach((client) => {
                  if (client.readyState === WebSocket.OPEN) {
                    client.send(redisMsg);
                  }
                });
              }
            });
          }
          rooms.get(key)!.add(ws);
          logger.info({ userId, roomId }, "User joined room");
          break;
        }

        case "leave-room": {
          const roomId: RoomId = message.data.roomId;
          const key = String(roomId);
          rooms.get(key)?.delete(ws);

          if (rooms.get(key)?.size === 0) {
            await subClient.unsubscribe(`room:${key}`);
            rooms.delete(key);
          }
          break;
        }

        case "chat": {
          const { roomId, message: chatMessage } = message.data as {
            roomId: RoomId;
            message: string;
          };

          const key = String(roomId);
          const numeric = Number(roomId);

          const payload = JSON.stringify({
            type: "chat",
            data: { roomId, message: chatMessage, userId },
          });

          await pubClient.publish(`room:${key}`, payload);

          if (isNaN(numeric)) {
            // Write directly to Redis List instead of HTTP axios call
            const chatObj = JSON.stringify({ userId, message: chatMessage });
            await pubClient.rPush(`room:${key}:chats`, chatObj);
            await pubClient.expire(`room:${key}:chats`, 3600); // 1 hour TTL
          } else {
            await prismaClient.chat.create({
              data: { message: chatMessage, roomId: numeric, userId },
            });
          }
          break;
        }

        case "shape": {
          const { roomId, shape, final } = message.data as {
            roomId: RoomId;
            shape: Shape;
            final: boolean;
          };

          const key = String(roomId);
          const numeric = Number(roomId);

          if (!["rect", "circle", "line", "pencil"].includes(shape.type))
            return;

          const payload = JSON.stringify({
            type: "shape",
            data: { roomId, shape, final, userId },
          });

          await pubClient.publish(`room:${key}`, payload);

          if (final) {
            if (isNaN(numeric)) {
              // Write directly to Redis List instead of HTTP axios call
              await pubClient.rPush(
                `room:${key}:shapes`,
                JSON.stringify(shape),
              );
              await pubClient.expire(`room:${key}:shapes`, 3600); // 1 hour TTL
            } else {
              await prismaClient.shape.create({
                data: { roomId: numeric, type: shape.type, data: shape },
              });
            }
          }
          break;
        }
        case "undo": {
          const { roomId, shapeId, userId } = message.data as {
            roomId: RoomId;
            shapeId: string;
            userId: string;
          };
          const key = String(roomId);
          const numeric = Number(roomId);

          // 1. Broadcast the undo event to all servers via Redis Pub/Sub
          const payload = JSON.stringify({
            type: "undo",
            data: { roomId, shapeId, userId },
          });
          await pubClient.publish(`room:${key}`, payload);

          // 2. Remove the shape permanently from our data store
          if (isNaN(numeric)) {
            // Ephemeral: Fetch the entire list, filter it, and push the new list back
            const shapesData = await pubClient.lRange(
              `room:${key}:shapes`,
              0,
              -1,
            );
            const updatedShapes = shapesData.filter((s) => {
              try {
                return JSON.parse(s).id !== shapeId;
              } catch {
                return true;
              }
            });

            await pubClient.del(`room:${key}:shapes`);
            if (updatedShapes.length > 0) {
              await pubClient.rPush(`room:${key}:shapes`, updatedShapes);
            }
          } else {
            // Persistent: Find the shape in Postgres where the JSON data matches the UUID and delete it
            const dbShapes = await prismaClient.shape.findMany({
              where: { roomId: numeric },
            });
            const shapeToDelete = dbShapes.find(
              (s: { data: any }) => (s.data as any).id === shapeId,
            );

            if (shapeToDelete) {
              await prismaClient.shape.delete({
                where: { id: shapeToDelete.id },
              });
            }
          }
          break;
        }
      }
    } catch (err) {
      logger.error({ err }, "WS error");
    }
  });

  ws.on("close", () => {
    // Clean up connections and Redis subscriptions to prevent memory leaks
    rooms.forEach((clients, key) => {
      clients.delete(ws);
      if (clients.size === 0) {
        subClient.unsubscribe(`room:${key}`);
        rooms.delete(key);
      }
    });
    wsUsers.delete(ws);
    logger.info({ userId }, "User disconnected");
  });

  ws.on("error", (err) => {
    logger.error({ err }, "WebSocket error");
  });
});

server.listen(8080, "0.0.0.0", () => {
  logger.info({ port: 8080 }, "WebSocket server and health check running");
});
