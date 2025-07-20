import { WebSocketServer, WebSocket } from "ws";
import jwt, { JwtPayload } from "jsonwebtoken";
import { JWT_SECRET } from "@repo/backend-common/config";
import { prismaClient } from "@repo/database/client";
import url from "url";

type WebSocketMessage =
  | { type: "join-room"; data: { roomId: number } }
  | { type: "leave-room"; data: { roomId: number } }
  | { type: "chat"; data: { roomId: number; message: string } };

const rooms = new Map<number, Set<WebSocket>>();

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  return Object.fromEntries(
    cookieHeader.split(";").map(cookie => {
      const [name, ...rest] = cookie.trim().split("=");
      return [name, decodeURIComponent(rest.join("="))];
    })
  );
}


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
  // const cookieHeader = req.headers.cookie;
  // console.log("Cookies recieved: ", cookieHeader);

  // const cookies = parseCookies(cookieHeader);

  // const token = cookies["token"] || cookies["auth_token"] || "";
  const { query } = url.parse(req.url || "", true);
  const token = query.token;

  console.log(token);


  if (!token || Array.isArray(token)) {
    console.warn("❌ Invalid or missing token");
    return ws.close(1008, "Authentication failed");
  }

  let userId: string | null = null;
  try {
    userId = checkUser(token);
  } catch (err) {
    console.error("❌ JWT verification failed:", err);
    ws.close(1008, "Invalid token");
    return;
  }

  if (!userId) {
    console.warn("❌ Invalid or missing userId in token");
    ws.close(1008, "Unauthorized");
    return;
  }

  console.log("✅ Connection established from user:", userId);

  ws.on("message", async (data) => {
    try {
      console.log("🟡 RAW message:", data.toString());

      const parsed: WebSocketMessage = JSON.parse(data.toString());
      console.log("🟢 Parsed message:", parsed);
      console.log("🔵 Type:", parsed.type);

      switch (parsed.type) {
        case "join-room": {
          const room = Number(parsed.data.roomId);
          if (!rooms.has(room)) rooms.set(room, new Set());
          rooms.get(room)!.add(ws);
          console.log("✅ Joined room", room);
          break;
        }

        case "leave-room": {
          const room = parsed.data.roomId;
          rooms.get(room)?.delete(ws);
          break;
        }

        case "chat": {
          console.log("💬 Inside chat");

          const { message } = parsed.data;
          const roomId = Number(parsed.data.roomId);

          const room = await prismaClient.room.findUnique({
            where: { id: roomId },
          });

          if (!room) {
            console.warn(`⚠️ Room ${roomId} does not exist`);
            return;
          }

          await prismaClient.chat.create({
            data: { roomId, message, userId },
          });

          rooms.get(roomId)?.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(
                JSON.stringify({
                  type: "chat",
                  data: { roomId, message },
                }),
              );
            }
          });

          break;
        }
      }
    } catch (err) {
      console.error("🔥 Error handling WS message", err);
      ws.close(1011, "Internal server error");
    }
  });

  ws.on("error", (err) => {
    console.error("🛑 WebSocket error:", err);
  });

  ws.on("close", (code, reason) => {
    console.warn("🔒 WebSocket closed", code, reason.toString());
    rooms.forEach((clients) => clients.delete(ws));
  });

});
