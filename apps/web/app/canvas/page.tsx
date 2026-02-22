"use client";

import { useRouter } from "next/navigation";
import axios from "axios";
import { useState } from "react";

export default function RoomOptionsPage() {
  const router = useRouter();
  const [roomId, setRoomId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreateRoom = async () => {
    setLoading(true);
    setError("");
    try {
      const roomName = "Room " + Math.floor(Math.random() * 1000);
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/room`,
        { name: roomName },
        { withCredentials: true },
      );
      router.push(`/canvas/${response.data.room.slug}`);
    } catch (err) {
      console.error(err);
      setError("Failed to create room.");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!roomId) return setError("Please enter a room ID.");
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/room/${roomId}`
      );
      if (res.data.success) {
        router.push(`/canvas/${roomId}`);
      } else {
        setError("Room not found.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to join room.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 px-4">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Create Room Card */}
        <div className="p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg flex flex-col justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
              Create a New Room
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Instantly spin up a new room for collaboration.
            </p>
          </div>
          <button
            onClick={handleCreateRoom}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-xl transition-colors duration-300 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Room"}
          </button>
        </div>

        {/* Join Room Card */}
        <div className="p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg flex flex-col justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
              Join an Existing Room
            </h2>
            <input
              type="text"
              placeholder="Enter Room ID"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="w-full px-4 py-2 mb-4 border rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
          </div>
          <button
            onClick={handleJoinRoom}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-xl transition-colors duration-300 disabled:opacity-50"
          >
            {loading ? "Joining..." : "Join Room"}
          </button>
        </div>
      </div>
    </div>
  );
}
