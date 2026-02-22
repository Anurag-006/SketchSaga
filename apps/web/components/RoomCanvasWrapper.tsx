"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import RoomCanvas from "./RoomCanvas";

/**
 * Wrapper component that either forces a user to be authenticated
 * (persistent room) or generates/uses a guest ID for ephemeral rooms.
 */
export default function RoomCanvasWrapper({
  roomId,
  ephemeral = false,
}: {
  roomId: string;
  ephemeral?: boolean;
}) {
  const router = useRouter();
  const [isAllowed, setIsAllowed] = useState(!ephemeral);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // helper to ensure we have a guest id stored
    function ensureGuestId() {
      let gid = localStorage.getItem("guestId");
      if (!gid) {
        gid = "guest-" + Math.random().toString(36).substr(2, 9);
        localStorage.setItem("guestId", gid);
      }
      return gid;
    }

    if (ephemeral) {
      const gid = ensureGuestId();
      setUserId(gid);
      setIsAllowed(true);
      return;
    }

    // for persistent rooms we *do not* force login; guests may join too
    // we still optionally fetch /me to know if the visitor has an account
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/me`, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUserId(data.user.id);
        } else {
          const gid = ensureGuestId();
          setUserId(gid);
        }
      })
      .finally(() => {
        setIsAllowed(true);
      });
  }, [ephemeral]);

  if (!isAllowed) return null;
  if (!userId) return null;

  return <RoomCanvas roomId={roomId} userId={userId} />;
}
