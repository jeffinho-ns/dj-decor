import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getStorage, type Storage } from "firebase-admin/storage";

export class FirebaseNotConfiguredError extends Error {
  constructor() {
    super(
      "Firebase Storage não configurado. Defina FIREBASE_PROJECT_ID, FIREBASE_STORAGE_BUCKET e FIREBASE_SERVICE_ACCOUNT_JSON."
    );
    this.name = "FirebaseNotConfiguredError";
  }
}

function parseServiceAccount(): Record<string, unknown> | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_JSON inválido — use o JSON completo da service account"
    );
  }
}

let cachedApp: App | null = null;

function getFirebaseApp(): App {
  if (cachedApp) return cachedApp;
  if (getApps().length > 0) {
    cachedApp = getApps()[0]!;
    return cachedApp;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const sa = parseServiceAccount();
  if (!projectId || !sa) {
    throw new FirebaseNotConfiguredError();
  }

  cachedApp = initializeApp({
    credential: cert(sa as Parameters<typeof cert>[0]),
    projectId,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET?.trim() || undefined,
  });
  return cachedApp;
}

export function isFirebaseConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID?.trim() &&
      process.env.FIREBASE_STORAGE_BUCKET?.trim() &&
      process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim()
  );
}

function bucket() {
  if (!isFirebaseConfigured()) {
    throw new FirebaseNotConfiguredError();
  }
  const storage: Storage = getStorage(getFirebaseApp());
  const name = process.env.FIREBASE_STORAGE_BUCKET!.trim();
  return storage.bucket(name);
}

export async function uploadToFirebase(params: {
  path: string;
  buffer: Buffer;
  mimeType: string;
}): Promise<void> {
  const file = bucket().file(params.path);
  await file.save(params.buffer, {
    contentType: params.mimeType,
    resumable: false,
    metadata: {
      cacheControl: "private, max-age=3600",
    },
  });
}

export async function getFirebaseSignedUrl(
  path: string,
  expiresMs = 60 * 60 * 1000
): Promise<string> {
  const file = bucket().file(path);
  const [url] = await file.getSignedUrl({
    action: "read",
    expires: Date.now() + expiresMs,
  });
  return url;
}

export async function deleteFromFirebase(path: string): Promise<void> {
  const file = bucket().file(path);
  try {
    await file.delete({ ignoreNotFound: true });
  } catch (err) {
    console.error("[firebase] falha ao apagar", path, err);
  }
}
