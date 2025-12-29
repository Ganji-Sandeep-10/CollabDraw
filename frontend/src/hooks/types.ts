import { CanvasElement } from '@/types/whiteboard';

export type Scene = {
  elements: CanvasElement[];
  viewportOffset: { x: number; y: number };
  zoom: number;
  backgroundColor: string;
};

export type ServerMessage =
  | {
      type: "ROOM_JOINED";
      roomId: string;
      scene: Scene | null;
    }
  | {
      type: "SCENE_UPDATE";
      scene: Scene;
    };

export type ClientMessage =
  | {
      type: "INIT_SCENE";
      scene: Scene;
    }
  | {
      type: "SCENE_UPDATE";
      scene: Scene;
    };
