import { connectToRoom } from "./collaboration";
import { Scene } from "./types";

export function useJoinRoom(
  getLocalScene: () => Scene,
  applyRemoteScene: (scene: Scene) => void
) {
  const hash = window.location.hash;
  const match = hash.match(/\/room\/(.+)/);

  if (!match) return;

  const roomId = match[1];
  console.log("Attempting to join room:", roomId);

  connectToRoom(roomId, getLocalScene, applyRemoteScene);
}
