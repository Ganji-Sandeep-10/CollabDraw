import { connectToRoom } from "./collaboration";
import { Scene } from "./types";

export function useShareRoom(
  getLocalScene: () => Scene,
  applyRemoteScene: (scene: Scene) => void
) {
  const shareRoom = () => {
    const roomId = crypto.randomUUID();

    const shareLink = `${window.location.origin}/#/room/${roomId}`;
    navigator.clipboard.writeText(shareLink);

    connectToRoom(roomId, getLocalScene, applyRemoteScene);

    console.log("Room created & link copied:", shareLink);
    return shareLink;
  };

  return shareRoom;
}
