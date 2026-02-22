"use client";

import { WS_BACKEND } from "../app/config";
import { useEffect, useState } from "react";
import Canvas from "./Canvas";

function getTokenFromCookie(): string | null {
  const match = document.cookie.match(/(^| )token=([^;]+)/);
  return match ? match[2] : null;
}

export default function RoomCanvas({
  roomId,
  userId,
}: {
  roomId: string;
  userId: string;
}) {
  const [socket, setSocket] = useState<WebSocket | null>(null);

  useEffect(() => {
    let ws: WebSocket | null = null;

    try {
      // try to send auth token if we have one (guests will skip it)
      const token = localStorage.getItem("token");
      const wsUrl = token
        ? `ws://localhost:8080?token=${encodeURIComponent(token)}`
        : `ws://localhost:8080`;

      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("✅ WebSocket opened");

        try {
          ws?.send(
            JSON.stringify({
              type: "join-room",
              data: {
                roomId: roomId, // string or number; server will handle
              },
            }),
          );
        } catch (sendErr) {
          console.error("❌ Error sending join-room message", sendErr);
        }
      };

      ws.onmessage = (event) => {
        console.log("📨 Incoming message:", event.data);
      };

      ws.onerror = (e) => {
        console.error("🔥 WebSocket error", e);
      };

      ws.onclose = (event) => {
        console.warn("🔒 WebSocket closed on client", event.code, event.reason);
      };

      setSocket(ws);
    } catch (err) {
      console.error("❌ Failed to create WebSocket:", err);
    }
    //TODO: Remove before production. The readyState === 1 is for convinence and is a bug.
    return () => {
      if (ws) {
        console.log("Closing WebSocket on RoomCanvas unmount");
        ws?.close();
      }
    };
  }, [roomId]);

  if (!socket) {
    return <div>Loading...</div>;
  }

  return <Canvas roomId={roomId} socket={socket} userId={userId} />;
}

