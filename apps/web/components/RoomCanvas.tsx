"use client";

import { WS_BACKEND } from "../app/config";
import { useEffect, useState } from "react";
import Canvas from "./Canvas";

function getTokenFromCookie(): string | null {
  const match = document.cookie.match(/(^| )token=([^;]+)/);
  return match ? match[2] : null;
}

export default function RoomCanvas({ roomId }: { roomId: string }) {
  const [socket, setSocket] = useState<WebSocket | null>(null);

  useEffect(() => {
    let ws: WebSocket | null = null;

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("Token not found in cookies");
      }

      console.log(document.cookie);


      console.log(token);

      ws = new WebSocket(`ws://localhost:8080?token=${token}`);

      ws.onopen = () => {
        console.log("✅ WebSocket opened");

        try {
          ws?.send(
            JSON.stringify({
              type: "join-room",
              data: {
                roomId: Number(roomId),
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

  return <Canvas roomId={roomId} socket={socket} />;
}