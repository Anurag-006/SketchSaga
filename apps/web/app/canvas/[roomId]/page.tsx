import RoomCanvasWrapper from "../../../components/RoomCanvasWrapper";

export default async function Page({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;

  // Prioritize internal container-to-container communication
  const apiUrl =
    process.env.INTERNAL_HTTP_BACKEND ||
    process.env.NEXT_PUBLIC_HTTP_BACKEND ||
    "http://localhost:4001";

  try {
    const res = await fetch(`${apiUrl}/room/${roomId}`, {
      cache: "no-store",
    });

    if (!res.ok) {
      return (
        <div className="text-center mt-10 text-red-500">Room not found.</div>
      );
    }

    const data = await res.json();
    const isEphemeral = data.ephemeral === true || !data.room?.id;
    const propId = isEphemeral ? roomId : String(data.room.id);

    return <RoomCanvasWrapper roomId={propId} ephemeral={isEphemeral} />;
  } catch (error) {
    console.error(`💥 BOOM - SSR Fetch failed at ${apiUrl}:`, error);
    return (
      <div className="text-center mt-10 text-red-500">
        Failed to connect to backend server.
      </div>
    );
  }
}
