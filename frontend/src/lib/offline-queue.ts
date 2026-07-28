/**
 * Fila offline — persiste ações falhas em localStorage e reenvia quando online.
 * Suporta: toggle romaneio, checklist de festas e retry genérico.
 */

const STORAGE_KEY = "dj-decor-offline-queue";
export const OFFLINE_QUEUE_CHANGED = "dj-decor-offline-queue-changed";

export type OfflineQueueEntryType =
  | "romaneio_toggle"
  | "festa_checklist"
  | "generic";

interface OfflineQueueEntryBase {
  id: string;
  type: OfflineQueueEntryType;
  createdAt: string;
  retries: number;
}

export interface RomaneioToggleEntry extends OfflineQueueEntryBase {
  type: "romaneio_toggle";
  osId: string;
  itemId: string;
  payload: { carregado?: boolean; conferido?: boolean };
}

export interface FestaChecklistEntry extends OfflineQueueEntryBase {
  type: "festa_checklist";
  festaId: string;
  itensExtrasConcluidos: string[];
}

export interface GenericRetryEntry extends OfflineQueueEntryBase {
  type: "generic";
  actionKey: string;
  label?: string;
  payload: Record<string, unknown>;
}

export type OfflineQueueEntry =
  | RomaneioToggleEntry
  | FestaChecklistEntry
  | GenericRetryEntry;

export interface OfflineQueueExecutor {
  romaneioToggle?: (
    osId: string,
    itemId: string,
    payload: { carregado?: boolean; conferido?: boolean }
  ) => Promise<void>;
  festaChecklist?: (
    festaId: string,
    itensExtrasConcluidos: string[]
  ) => Promise<void>;
  generic?: (actionKey: string, payload: Record<string, unknown>) => Promise<void>;
}

function readQueue(): OfflineQueueEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is OfflineQueueEntry =>
        e != null &&
        typeof e === "object" &&
        typeof (e as OfflineQueueEntry).id === "string" &&
        typeof (e as OfflineQueueEntry).type === "string"
    );
  } catch {
    return [];
  }
}

function writeQueue(entries: OfflineQueueEntry[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  window.dispatchEvent(new CustomEvent(OFFLINE_QUEUE_CHANGED));
}

function enqueue(entry: OfflineQueueEntry): void {
  writeQueue([...readQueue(), entry]);
}

function newId(suffix: string): string {
  return `${Date.now()}-${suffix}`;
}

export function enqueueRomaneioToggle(
  osId: string,
  itemId: string,
  payload: { carregado?: boolean; conferido?: boolean }
): void {
  enqueue({
    id: newId(itemId),
    type: "romaneio_toggle",
    osId,
    itemId,
    payload,
    createdAt: new Date().toISOString(),
    retries: 0,
  });
}

export function enqueueFestaChecklist(
  festaId: string,
  itensExtrasConcluidos: string[]
): void {
  enqueue({
    id: newId(festaId),
    type: "festa_checklist",
    festaId,
    itensExtrasConcluidos,
    createdAt: new Date().toISOString(),
    retries: 0,
  });
}

export function enqueueGenericRetry(
  actionKey: string,
  payload: Record<string, unknown>,
  label?: string
): void {
  enqueue({
    id: newId(actionKey),
    type: "generic",
    actionKey,
    label,
    payload,
    createdAt: new Date().toISOString(),
    retries: 0,
  });
}

export function getOfflineQueueSize(): number {
  return readQueue().length;
}

export function getOfflineQueue(): OfflineQueueEntry[] {
  return readQueue();
}

async function executeEntry(
  entry: OfflineQueueEntry,
  executor: OfflineQueueExecutor
): Promise<void> {
  switch (entry.type) {
    case "romaneio_toggle": {
      if (!executor.romaneioToggle) {
        throw new Error("Executor romaneio_toggle não configurado");
      }
      await executor.romaneioToggle(
        entry.osId,
        entry.itemId,
        entry.payload
      );
      break;
    }
    case "festa_checklist": {
      if (!executor.festaChecklist) {
        throw new Error("Executor festa_checklist não configurado");
      }
      await executor.festaChecklist(
        entry.festaId,
        entry.itensExtrasConcluidos
      );
      break;
    }
    case "generic": {
      if (!executor.generic) {
        throw new Error("Executor generic não configurado");
      }
      await executor.generic(entry.actionKey, entry.payload);
      break;
    }
  }
}

export async function flushOfflineQueue(
  executor: OfflineQueueExecutor
): Promise<{ flushed: number; remaining: number }> {
  const queue = readQueue();
  if (queue.length === 0) return { flushed: 0, remaining: 0 };

  const remaining: OfflineQueueEntry[] = [];
  let flushed = 0;

  for (const entry of queue) {
    try {
      await executeEntry(entry, executor);
      flushed++;
    } catch {
      remaining.push({ ...entry, retries: entry.retries + 1 });
    }
  }

  writeQueue(remaining);
  return { flushed, remaining: remaining.length };
}
