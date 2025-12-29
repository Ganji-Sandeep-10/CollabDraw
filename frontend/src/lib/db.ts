import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { CanvasState, CanvasElement, User } from '@/types/whiteboard';

interface WhiteboardDB extends DBSchema {
  canvas: {
    key: string;
    value: CanvasState;
  };
  user: {
    key: string;
    value: User;
  };
  history: {
    key: number;
    value: {
      timestamp: number;
      elements: CanvasElement[];
    };
    autoIncrement: true;
  };
}

let dbInstance: IDBPDatabase<WhiteboardDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<WhiteboardDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<WhiteboardDB>('whiteboard-db', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('canvas')) {
        db.createObjectStore('canvas');
      }
      if (!db.objectStoreNames.contains('user')) {
        db.createObjectStore('user');
      }
      if (!db.objectStoreNames.contains('history')) {
        db.createObjectStore('history', { autoIncrement: true });
      }
    },
  });

  return dbInstance;
}

export async function saveCanvasState(state: CanvasState): Promise<void> {
  const db = await getDB();
  await db.put('canvas', state, 'current');
}

export async function loadCanvasState(): Promise<CanvasState | undefined> {
  const db = await getDB();
  return db.get('canvas', 'current');
}

export async function saveUser(user: User): Promise<void> {
  const db = await getDB();
  await db.put('user', user, 'current');
}

export async function loadUser(): Promise<User | undefined> {
  const db = await getDB();
  return db.get('user', 'current');
}

export async function clearUser(): Promise<void> {
  const db = await getDB();
  await db.delete('user', 'current');
}

export async function clearCanvas(): Promise<void> {
  const db = await getDB();
  await db.delete('canvas', 'current');
}
