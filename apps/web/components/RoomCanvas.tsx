"use client";

import { WS_BACKEND } from "../app/config"; // Using the dynamic config
import { useEffect, useState } from "react";
import Canvas from "./Canvas";

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
      const token = localStorage.getItem("token");

      const wsUrl = token
        ? `${WS_BACKEND}?token=${encodeURIComponent(token)}`
        : WS_BACKEND;

      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("✅ WebSocket opened");
        ws?.send(
          JSON.stringify({
            type: "join-room",
            data: { roomId: roomId },
          }),
        );
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

    return () => {
      if (ws) {
        console.log("Closing WebSocket on RoomCanvas unmount");
        ws.close();
      }
    };
  }, [roomId]);

  if (!socket) {
    return (
      <div className="h-screen bg-black flex items-center justify-center text-white">
        Connecting to Canvas...
      </div>
    );
  }

  return <Canvas roomId={roomId} socket={socket} userId={userId} />;
}
