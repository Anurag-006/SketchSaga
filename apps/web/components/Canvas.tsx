"use client";

import { useEffect, useRef } from "react";
import IconBar from "./IconBar";
import { Game } from "../app/draw/Game";

export default function Canvas({
  roomId,
  socket,
}: {
  roomId: string;
  socket: WebSocket;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const currentShape = useRef("rect");

  useEffect(() => {
    if (canvasRef.current) {
      const g = new Game(canvasRef.current, roomId, socket, currentShape);
    }
  }, [canvasRef]);

  console.log(roomId);

  return (
    <div className="h-screen bg-red overflow-hidden">
      <canvas
        ref={canvasRef}
        width={window.innerWidth}
        height={window.innerHeight}
      ></canvas>
      <div className="bg-white fixed top-6 rounded-2xl left-[80vh]">
        <IconBar currentShape={currentShape} />
      </div>
    </div>
  );
}
