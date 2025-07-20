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
  const gameRef = useRef<Game | null> (null);

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
      if (gameRef.current) {
        gameRef.current.clearCanvas();
      }
    };

    if (canvasRef.current) {
      setCanvasSize();
      gameRef.current = new Game(canvasRef.current, roomId, socket, currentShape);
      window.addEventListener("resize", handleResize);
    }

    return () => {
      if (gameRef.current) gameRef.current?.destroy();
      window.removeEventListener("resize", handleResize);
    };
  }, [canvasRef, roomId, socket]);

  return (
    <div className="h-screen bg-black overflow-hidden">
      <canvas ref={canvasRef}></canvas>
      <div className="bg-white fixed top-6 rounded-2xl left-[80vh]">
        <IconBar currentShape={currentShape} gameRef={gameRef} />
      </div>
    </div>
  );
}
