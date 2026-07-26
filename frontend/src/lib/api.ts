import type { CreateFestaPayload, Festa } from "@/types/festa";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL) {
  console.warn(
    "[api] NEXT_PUBLIC_API_URL não definida. Configure no .env.local"
  );
}

const VENDEDOR_HEADERS: HeadersInit = {
  "Content-Type": "application/json",
  Authorization: "Bearer mock-vendedor",
  "X-User-Role": "VENDEDOR",
};

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `Erro HTTP ${response.status}`;
    try {
      const body = (await response.json()) as {
        error?: string;
        message?: string;
      };
      message = body.message ?? body.error ?? message;
    } catch {
      // ignore JSON parse errors
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

function getBaseUrl(): string {
  if (!API_URL) {
    throw new Error(
      "NEXT_PUBLIC_API_URL não configurada. Veja .env.example"
    );
  }
  return API_URL.replace(/\/$/, "");
}

export async function listFestas(): Promise<Festa[]> {
  const response = await fetch(`${getBaseUrl()}/api/festas`, {
    headers: VENDEDOR_HEADERS,
    cache: "no-store",
  });
  return handleResponse<Festa[]>(response);
}

export async function createFesta(
  payload: CreateFestaPayload
): Promise<Festa> {
  const response = await fetch(`${getBaseUrl()}/api/festas`, {
    method: "POST",
    headers: VENDEDOR_HEADERS,
    body: JSON.stringify(payload),
  });
  return handleResponse<Festa>(response);
}
