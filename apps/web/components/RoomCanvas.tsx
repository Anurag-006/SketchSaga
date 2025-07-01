"use client";
import { WS_BACKEND } from "../app/config";

import { useEffect, useState } from "react";
import Canvas from "./Canvas";
export default function RoomCanvas({ roomId }: { roomId: string }) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const token =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI3NWVmM2M3ZS05MGU1LTRhMWMtYThlNy0zYzUxYzQyMDA5YzAiLCJpYXQiOjE3NTE0MDM5NzIsImV4cCI6MTc1MTQwNzU3Mn0.aBcCsEwa3_Z39X6Vl6or_OqxolgEHz-e5WPGT5F8JlA";

  useEffect(() => {
    const ws = new WebSocket(`${WS_BACKEND}?token=${token}`);
    ws.onopen = () => {
      setSocket(ws);
      ws.send(
        JSON.stringify({
          type: "join-room",
          data: {
            roomId: roomId,
          },
        }),
      );
    };
  }, []);

  if (!socket) {
    return <div>Loading....</div>;
  }

  return <Canvas roomId={roomId} socket={socket} />;
}
