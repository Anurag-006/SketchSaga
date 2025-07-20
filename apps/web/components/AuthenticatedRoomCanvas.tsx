"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import RoomCanvas from "./RoomCanvas";

export default function AuthenticatedRoomCanvas({ roomId }: { roomId: string }) {
  const router = useRouter();
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/me`, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        console.log(data.user);
        
        if (!data.user) {
          router.push("/signin");
        } else {
          setIsAllowed(true);
        }
      });
  }, []);

  if (!isAllowed) return null;

  return <RoomCanvas roomId={roomId} />;
}
