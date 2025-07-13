"use client";
import { WS_BACKEND } from "../app/config";

import { useEffect, useState } from "react";
import Canvas from "./Canvas";
export default function RoomCanvas({ roomId }: { roomId: string }) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const token =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI3NWVmM2M3ZS05MGU1LTRhMWMtYThlNy0zYzUxYzQyMDA5YzAiLCJpYXQiOjE3NTE1NDA5ODksImV4cCI6MTc1MTU0NDU4OX0.7jZKq_8v5UpRYDGysPSJhvgjZL25474Bw2WttkoMY2s";

useEffect(() => {
  const ws = new WebSocket(`${WS_BACKEND}?token=${token}`);

  ws.onopen = () => {
    console.log("✅ WebSocket opened");
    ws.send(
      JSON.stringify({
        type: "join-room",
        data: {
          roomId: Number(roomId),
        },
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

  return () => {
    console.log("Closing WebSocket on RoomCanvas unmount");
    ws.close();
  };
}, [roomId]); 


  if (!socket) {
    return <div>Loading....</div>;
  }

  return <Canvas roomId={roomId} socket={socket} />;
}
