import { openDB, DBSchema } from "idb";

interface OfflineAction {
  id?: number;
  type: "COMPLETE_BLOCK" | "SUBMIT_CHECKIN";
  payload: Record<string, unknown>;
  createdAt: string;
  retryCount: number;
}

interface OfflineDB extends DBSchema {
  actions: {
    key: number;
    value: OfflineAction;
  };
}

const DB_NAME = "ime-offline";
const STORE = "actions";

async function getDB() {
  return openDB<OfflineDB>(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
      }
    },
  });
}

export async function queueAction(type: OfflineAction["type"], payload: Record<string, unknown>) {
  const db = await getDB();
  await db.add(STORE, { type, payload, createdAt: new Date().toISOString(), retryCount: 0 });
}

export async function getPendingActions(): Promise<OfflineAction[]> {
  const db = await getDB();
  return db.getAll(STORE);
}

export async function removeAction(id: number) {
  const db = await getDB();
  await db.delete(STORE, id);
}

export async function incrementRetry(id: number) {
  const db = await getDB();
  const action = await db.get(STORE, id);
  if (action) {
    action.retryCount += 1;
    await db.put(STORE, action);
  }
}
