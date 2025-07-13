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
    let game: Game | null = null;

    const setCanvasSize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };

    const handleResize = () => {
      setCanvasSize();
      if (game) {
        game.clearCanvas();
      }
    };

    if (canvasRef.current) {
      setCanvasSize();
      game = new Game(canvasRef.current, roomId, socket, currentShape);
      window.addEventListener("resize", handleResize);
    }

    return () => {
      if (game) game.destroy();
      window.removeEventListener("resize", handleResize);
    };
  }, [canvasRef, roomId, socket]);

  return (
    <div className="h-screen bg-red overflow-hidden">
      <canvas ref={canvasRef}></canvas>
      <div className="bg-white fixed top-6 rounded-2xl left-[80vh]">
        <IconBar currentShape={currentShape} />
      </div>
    </div>
  );
}
