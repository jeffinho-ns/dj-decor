import type { LoginResponse, MeResponse } from "@/types/auth";
import type { CreateFestaPayload, Festa } from "@/types/festa";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL) {
  console.warn(
    "[api] NEXT_PUBLIC_API_URL não definida. Configure no .env.local"
  );
}

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

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function login(
  nome: string,
  senha: string
): Promise<LoginResponse> {
  const response = await fetch(`${getBaseUrl()}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome, senha }),
  });
  return handleResponse<LoginResponse>(response);
}

export async function me(token: string): Promise<MeResponse> {
  const response = await fetch(`${getBaseUrl()}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  return handleResponse<MeResponse>(response);
}

export async function logout(token?: string | null): Promise<void> {
  try {
    await fetch(`${getBaseUrl()}/api/auth/logout`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
  } catch {
    // Encerramento local do token não deve ser bloqueado por falha de rede.
  }
}

export async function listFestas(token: string): Promise<Festa[]> {
  const response = await fetch(`${getBaseUrl()}/api/festas`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  return handleResponse<Festa[]>(response);
}

export async function createFesta(
  payload: CreateFestaPayload,
  token: string
): Promise<Festa> {
  const response = await fetch(`${getBaseUrl()}/api/festas`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleResponse<Festa>(response);
}
