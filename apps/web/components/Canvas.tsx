"use client";

import { useEffect, useRef, useMemo } from "react";
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

  const myName = useMemo(() => {
    const adjectives = [
      "Happy",
      "Fast",
      "Smart",
      "Lazy",
      "Cool",
      "Brave",
      "Clever",
      "Witty",
      "Cheerful",
      "Gentle",
      "Mighty",
      "Sneaky",
      "Curious",
      "Bouncy",
      "Zany",
      "Jolly",
      "Fuzzy",
      "Shiny",
      "Swift",
      "Nimble",
      "Chill",
      "Sunny",
      "Lucky",
      "Epic",
      "Cosmic",
      "Sparkly",
      "Dizzy",
      "Silly",
      "Wiggly",
      "Goofy",
      "Snappy",
      "Perky",
      "Dreamy",
      "Sleepy",
      "Peppy",
      "Fiery",
      "Icy",
      "Stormy",
      "Breezy",
      "Glowing",
      "Whimsical",
      "Legendary",
      "Fearless",
      "Playful",
      "Daring",
      "Radiant",
      "Vibrant",
      "Magical",
      "Sneaky",
      "Heroic",
      "Tiny",
      "Giant",
      "Electric",
      "Mystic",
      "Funky",
      "Golden",
      "Silver",
      "Turbo",
      "Pixelated",
      "Quantum",
    ];

    const animals = [
      "Tiger",
      "Panda",
      "Eagle",
      "Fox",
      "Bear",
      "Otter",
      "Koala",
      "Penguin",
      "Dolphin",
      "Hedgehog",
      "Llama",
      "Sloth",
      "Cheetah",
      "Falcon",
      "Wolf",
      "Raccoon",
      "Squirrel",
      "Moose",
      "Owl",
      "Leopard",
      "Panther",
      "Yak",
      "Zebra",
      "Giraffe",
      "Hippo",
      "Kangaroo",
      "Meerkat",
      "Seal",
      "Turtle",
      "Bison",
      "Rhino",
      "Flamingo",
      "Chameleon",
      "Jaguar",
      "Badger",
      "Narwhal",
      "Platypus",
      "Capybara",
      "Wombat",
      "Puffin",
      "Gecko",
      "Hawk",
      "Lobster",
      "Octopus",
      "Parrot",
      "Shark",
      "Toucan",
      "Walrus",
      "Buffalo",
      "Cobra",
      "Peacock",
      "Alpaca",
      "Armadillo",
      "Beaver",
      "Corgi",
    ];

    return `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${animals[Math.floor(Math.random() * animals.length)]}`;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const setCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    setCanvasSize();

    // Initialize Game instance
    gameRef.current = new Game(
      canvas,
      roomId,
      socket,
      currentTool,
      userId,
      myName,
    );

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
  }, [roomId, socket, userId, myName]);

  return (
    <div className="h-screen bg-black overflow-hidden">
      <canvas ref={canvasRef} className="block" />
      <div className="bg-white fixed top-6 left-[80vh] rounded-2xl p-2">
        <IconBar currentTool={currentTool} gameRef={gameRef} />
      </div>
    </div>
  );
}
