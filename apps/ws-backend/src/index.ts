import { WebSocketServer, WebSocket } from "ws";
import jwt, { JwtPayload } from "jsonwebtoken";
import { JWT_SECRET } from "@repo/backend-common/config";
import { prismaClient } from "@repo/database/client";

type WebSocketMessage =
  | { type: "join-room"; data: { roomId: number } }
  | { type: "leave-room"; data: { roomId: number } }
  | { type: "chat"; data: { roomId: number; message: string } };

const rooms = new Map<number, Set<WebSocket>>();

function checkUser(token: string): string | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    return typeof decoded === "object" && decoded.userId
      ? decoded.userId
      : null;
  } catch {
    return null;
  }
}

const wss = new WebSocketServer({ port: 8080 });

wss.on("connection", (ws, req) => {
  const url = req.url;
  if (!url) return ws.close();

  const token = new URLSearchParams(url.split("?")[1]).get("token") || "";
  const userId = checkUser(token);
  if (!userId) return ws.close();

  ws.on("message", async (data) => {
    let parsed: WebSocketMessage;
    try {
      parsed = JSON.parse(data.toString());
    } catch {
      console.warn("Invalid JSON");
      return;
    }

    switch (parsed.type) {
      case "join-room": {
        const room = Number(parsed.data.roomId);
        if (!rooms.has(room)) rooms.set(room, new Set());
        rooms.get(room)!.add(ws);
        break;
      }
      case "leave-room": {
        const room = parsed.data.roomId;
        rooms.get(room)?.delete(ws);
        break;
      }
      case "chat": {
        const { message } = parsed.data;
        const roomId = Number(parsed.data.roomId);
        const room = await prismaClient.room.findUnique({
          where: { id: roomId },
        });

        if (!room) {
          console.warn(`Room ${roomId} does not exist`);
          return;
        }

        await prismaClient.chat.create({ data: { roomId, message, userId } });
        rooms.get(roomId)?.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(
              JSON.stringify({ type: "chat", data: { roomId, message } }),
            );
          }
        });
        break;
      }
    }
  });

  ws.on("close", () => {
    rooms.forEach((clients) => clients.delete(ws));
  });
});
