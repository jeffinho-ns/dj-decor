import type {
  LoginResponse,
  MeResponse,
  UpdatePerfilPayload,
  UpdatePerfilResponse,
} from "@/types/auth";
import type {
  CreateProdutoPayload,
  CreateUnidadePayload,
  DisponibilidadeResult,
  Produto,
  ReservaEstoque,
  ReservarEstoquePayload,
  UnidadeProduto,
} from "@/types/estoque";
import type {
  ConfirmarPagamentoPayload,
  CreateFestaPayload,
  CreatePagamentoPayload,
  Festa,
  Pagamento,
  StatusFesta,
} from "@/types/festa";
import type { Midia, TipoMidia } from "@/types/midia";

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

export async function updatePerfil(
  payload: UpdatePerfilPayload,
  token: string
): Promise<UpdatePerfilResponse> {
  const response = await fetch(`${getBaseUrl()}/api/auth/perfil`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleResponse<UpdatePerfilResponse>(response);
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

export async function updateFestaChecklist(
  id: string,
  itensExtrasConcluidos: string[],
  token: string
): Promise<Festa> {
  const response = await fetch(`${getBaseUrl()}/api/festas/${id}/checklist`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify({ itensExtrasConcluidos }),
  });
  return handleResponse<Festa>(response);
}

export async function updateFestaStatus(
  id: string,
  status: StatusFesta,
  token: string
): Promise<Festa> {
  const response = await fetch(`${getBaseUrl()}/api/festas/${id}/status`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify({ status }),
  });
  return handleResponse<Festa>(response);
}

export async function listPagamentos(
  festaId: string,
  token: string
): Promise<Pagamento[]> {
  const response = await fetch(
    `${getBaseUrl()}/api/festas/${festaId}/pagamentos`,
    {
      headers: authHeaders(token),
      cache: "no-store",
    }
  );
  return handleResponse<Pagamento[]>(response);
}

export async function createPagamento(
  festaId: string,
  payload: CreatePagamentoPayload,
  token: string
): Promise<Pagamento> {
  const response = await fetch(
    `${getBaseUrl()}/api/festas/${festaId}/pagamentos`,
    {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }
  );
  return handleResponse<Pagamento>(response);
}

export async function confirmarPagamento(
  pagamentoId: string,
  payload: ConfirmarPagamentoPayload,
  token: string
): Promise<Pagamento> {
  const response = await fetch(
    `${getBaseUrl()}/api/pagamentos/${pagamentoId}/confirmar`,
    {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }
  );
  return handleResponse<Pagamento>(response);
}

export async function uploadMidia(
  params: { file: File; tipo: TipoMidia; festaId?: string },
  token: string
): Promise<Midia> {
  const formData = new FormData();
  formData.append("file", params.file);
  formData.append("tipo", params.tipo);
  if (params.festaId) {
    formData.append("festaId", params.festaId);
  }
  const response = await fetch(`${getBaseUrl()}/api/midias`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  return handleResponse<Midia>(response);
}

export async function listProdutos(
  token: string,
  ativosOnly = false
): Promise<Produto[]> {
  const qs = ativosOnly ? "?ativos=true" : "";
  const response = await fetch(`${getBaseUrl()}/api/produtos${qs}`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  return handleResponse<Produto[]>(response);
}

export async function createProduto(
  payload: CreateProdutoPayload,
  token: string
): Promise<Produto> {
  const response = await fetch(`${getBaseUrl()}/api/produtos`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleResponse<Produto>(response);
}

export async function createUnidade(
  produtoId: string,
  payload: CreateUnidadePayload,
  token: string
): Promise<UnidadeProduto> {
  const response = await fetch(
    `${getBaseUrl()}/api/produtos/${produtoId}/unidades`,
    {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }
  );
  return handleResponse<UnidadeProduto>(response);
}

export async function disponibilidadeEstoque(
  params: { produtoId: string; inicio: string; fim: string },
  token: string
): Promise<DisponibilidadeResult> {
  const qs = new URLSearchParams(params).toString();
  const response = await fetch(
    `${getBaseUrl()}/api/estoque/disponibilidade?${qs}`,
    {
      headers: authHeaders(token),
      cache: "no-store",
    }
  );
  return handleResponse<DisponibilidadeResult>(response);
}

export async function reservarEstoque(
  payload: ReservarEstoquePayload,
  token: string
): Promise<ReservaEstoque> {
  const response = await fetch(`${getBaseUrl()}/api/estoque/reservar`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleResponse<ReservaEstoque>(response);
}

export async function liberarReserva(
  reservaId: string,
  token: string
): Promise<{ ok: true; reservaId: string }> {
  const response = await fetch(
    `${getBaseUrl()}/api/estoque/reservas/${reservaId}`,
    {
      method: "DELETE",
      headers: authHeaders(token),
    }
  );
  return handleResponse<{ ok: true; reservaId: string }>(response);
}
