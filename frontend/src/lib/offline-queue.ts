/**
 * Stub de fila offline — persiste PATCH falhos em localStorage e reenvia depois.
 * MVP: apenas toggle de romaneio (carregado/conferido).
 */

const STORAGE_KEY = "dj-decor-offline-queue";

export interface OfflineQueueEntry {
  id: string;
  osId: string;
  itemId: string;
  payload: { carregado?: boolean; conferido?: boolean };
  createdAt: string;
  retries: number;
}

function readQueue(): OfflineQueueEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as OfflineQueueEntry[];
  } catch {
    return [];
  }
}

function writeQueue(entries: OfflineQueueEntry[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function enqueueRomaneioToggle(
  osId: string,
  itemId: string,
  payload: { carregado?: boolean; conferido?: boolean }
): void {
  const entry: OfflineQueueEntry = {
    id: `${Date.now()}-${itemId}`,
    osId,
    itemId,
    payload,
    createdAt: new Date().toISOString(),
    retries: 0,
  };
  writeQueue([...readQueue(), entry]);
}

export function getOfflineQueueSize(): number {
  return readQueue().length;
}

export async function flushOfflineQueue(
  send: (
    osId: string,
    itemId: string,
    payload: { carregado?: boolean; conferido?: boolean }
  ) => Promise<void>
): Promise<{ flushed: number; remaining: number }> {
  const queue = readQueue();
  if (queue.length === 0) return { flushed: 0, remaining: 0 };

  const remaining: OfflineQueueEntry[] = [];
  let flushed = 0;

  for (const entry of queue) {
    try {
      await send(entry.osId, entry.itemId, entry.payload);
      flushed++;
    } catch {
      remaining.push({ ...entry, retries: entry.retries + 1 });
    }
  }

  writeQueue(remaining);
  return { flushed, remaining: remaining.length };
}
