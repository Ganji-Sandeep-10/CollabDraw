import { Scene, ServerMessage, ClientMessage } from "./types";

let socket: WebSocket | null = null;
let sendDebounceTimer: NodeJS.Timeout | null = null;
let lastSentScene: Scene | null = null;
let isConnected = false;
let connectionCallbacks: Array<() => void> = [];

export function onSocketConnected(callback: () => void) {
  if (isConnected) {
    callback();
  } else {
    connectionCallbacks.push(callback);
  }
}

export function isSocketConnected(): boolean {
  return isConnected;
}

export function connectToRoom(
  roomId: string,
  getLocalScene: () => Scene,
  applyRemoteScene: (scene: Scene) => void
) {
  // Close any existing socket
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.close();
  }

  isConnected = false;
  socket = new WebSocket(`ws://localhost:8080?roomId=${roomId}`);

  socket.onopen = () => {
    isConnected = true;
    console.log("WebSocket connected to room:", roomId);
    const scene = getLocalScene();

    const initMsg: ClientMessage = {
      type: "INIT_SCENE",
      scene,
    };

    socket?.send(JSON.stringify(initMsg));
    console.log("INIT_SCENE sent:", initMsg);

    // Call any pending connection callbacks
    connectionCallbacks.forEach(cb => cb());
    connectionCallbacks = [];
  };

  socket.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data) as ServerMessage;
      console.log("Message received:", message.type);

      switch (message.type) {
        case "ROOM_JOINED":
          console.log("Joined room, scene:", message.scene ? "exists" : "null");
          if (message.scene) {
            applyRemoteScene(message.scene);
          }
          break;

        case "SCENE_UPDATE":
          console.log("Scene update received, elements count:", message.scene.elements?.length);
          applyRemoteScene(message.scene);
          break;
      }
    } catch (err) {
      console.error("Failed to parse message:", err);
    }
  };

  socket.onerror = (error) => {
    console.error("WebSocket error:", error);
    isConnected = false;
  };

  socket.onclose = () => {
    console.log("WebSocket disconnected");
    isConnected = false;
    socket = null;
    if (sendDebounceTimer) {
      clearTimeout(sendDebounceTimer);
      sendDebounceTimer = null;
    }
  };
}

export function sendSceneUpdate(scene: Scene) {
  // Better null checking - if socket is null or not OPEN, don't send
  if (!socket) {
    console.warn("Socket is null, cannot send update");
    return;
  }

  if (socket.readyState !== WebSocket.OPEN) {
    console.warn("Socket not in OPEN state. ReadyState:", socket.readyState, "WebSocket.OPEN:", WebSocket.OPEN);
    return;
  }

  // Store the scene for sending
  lastSentScene = scene;

  // Debounce: clear any pending timer and set a new one
  if (sendDebounceTimer) {
    clearTimeout(sendDebounceTimer);
  }

  sendDebounceTimer = setTimeout(() => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      console.warn("Socket closed before sending debounced update");
      return;
    }

    const msg: ClientMessage = {
      type: "SCENE_UPDATE",
      scene: lastSentScene!,
    };

    socket.send(JSON.stringify(msg));
    console.log("SCENE_UPDATE sent, elements:", lastSentScene!.elements?.length);
    sendDebounceTimer = null;
  }, 100); // 100ms debounce
}

export function disconnectRoom() {
  if (sendDebounceTimer) {
    clearTimeout(sendDebounceTimer);
    sendDebounceTimer = null;
  }
  socket?.close();
  socket = null;
  isConnected = false;
}
