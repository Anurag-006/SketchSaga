"use client";

import { useEffect, useRef } from "react";
import IconBar from "./IconBar";
import { Game } from "../app/draw/Game";

interface CanvasProps {
  roomId: string;
  socket: WebSocket;
  userId: string;
}

export default function Canvas({ roomId, socket, userId }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const currentTool = useRef<
    "rect" | "circle" | "line" | "pencil" | "selectTool"
  >("rect");
  const gameRef = useRef<Game | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const setCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    setCanvasSize();

    // Initialize Game instance
    gameRef.current = new Game(canvas, roomId, socket, currentTool, userId);

    // Handle window resize
    const handleResize = () => {
      setCanvasSize();
      // Redraw shapes correctly after resize
      gameRef.current?.redraw();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      gameRef.current?.destroy();
      window.removeEventListener("resize", handleResize);
    };
  }, [roomId, socket]);

  return (
    <div className="h-screen bg-black overflow-hidden">
      <canvas ref={canvasRef} className="block" />
      <div className="bg-white fixed top-6 left-[80vh] rounded-2xl p-2">
        <IconBar currentTool={currentTool} gameRef={gameRef} />
      </div>
    </div>
  );
}
