import AuthenticatedRoomCanvas from "../../../components/AuthenticatedRoomCanvas";

export default async function Page({ params }: { params: Promise<{roomId: string}> }) {
  const { roomId } = await params;
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/room/${roomId}`, {
    credentials: "include",
    cache: "no-store",
  });

  const data = await res.json();

  if (!data.room) {
    return <div className="text-center mt-10 text-red-500">Room not found.</div>;
  }

  console.log(data);
  

  return <AuthenticatedRoomCanvas roomId={data.room.id} />;
}