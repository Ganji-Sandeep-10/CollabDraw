import { WebSocketServer, WebSocket } from "ws";
import { randomUUID } from "crypto";
import http from "http";

//Types
type Scene = any;

type Client = WebSocket & {
  roomId?: string;
};

type Room = {
  roomId: string;
  scene: Scene | null;
  clients: Set<Client>;
};

// room store
const rooms = new Map<string, Room>();

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }
});
const wss = new WebSocketServer({ server });

//WebSocket connections

wss.on("connection", (ws: Client, req:any) => {
  const url = new URL(req.url || "", "http://localhost");
  let roomId = url.searchParams.get("roomId");

  // If no roomId, generate one
  if (!roomId) {
    roomId = randomUUID();
  }

  ws.roomId = roomId;

  // Create room if not exists
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      roomId,
      scene: null,
      clients: new Set(),
    });
  }

  const room = rooms.get(roomId)!;
  room.clients.add(ws);

  console.log(`Client joined room ${roomId} (${room.clients.size})`);

  // Notify client that room is joined
  ws.send(
    JSON.stringify({
      type: "ROOM_JOINED",
      roomId,
      scene: room.scene, // may be null for first client
    })
  );

  // Handle messages

  ws.on("message", (raw:any) => {
    let message: any;

    try {
      message = JSON.parse(raw.toString());
    } catch {
      return;
    }

    switch (message.type) {
      //First client sends full scene once
      case "INIT_SCENE": {
        room.scene = message.scene;
        break;
      }

      //Scene update (after any draw/change)
      case "SCENE_UPDATE": {
        room.scene = message.scene;

        // Broadcast to everyone else in the room
        for (const client of room.clients) {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(
              JSON.stringify({
                type: "SCENE_UPDATE",
                scene: message.scene,
              })
            );
          }
        }
        break;
      }
    }
  });

  //Handle disconnect
  ws.on("close", () => {
    room.clients.delete(ws);
    console.log(`Client left room ${roomId}`);

    // Cleanup empty room
    if (room.clients.size === 0) {
      rooms.delete(roomId);
      console.log(`Room ${roomId} destroyed`);
    }
  });
});

//Start server
const PORT = 8080;
server.listen(PORT, () => {
  console.log(`WebSocket server running on ws://localhost:${PORT}`);
});
