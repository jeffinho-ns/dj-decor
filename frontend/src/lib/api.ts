import type {
  LoginResponse,
  MeResponse,
  UpdatePerfilPayload,
  UpdatePerfilResponse,
} from "@/types/auth";
import type {
  AlertaQr,
  CreateProdutoPayload,
  CreateUnidadePayload,
  DisponibilidadeResult,
  EstoqueAvaliacao,
  InventarioItem,
  Produto,
  ProdutoSugestao,
  ReservaEstoque,
  ReservarEstoquePayload,
  SincronizarCatalogoResult,
  UnidadeProduto,
} from "@/types/estoque";
import type {
  ConfirmarPagamentoPayload,
  CreateFestaPayload,
  CreatePagamentoPayload,
  Festa,
  Pagamento,
  RiscoOrcamento,
  StatusFesta,
  UpdateFestaPayload,
} from "@/types/festa";
import type {
  Cliente,
  ClienteDetalhe,
  ClienteListItem,
  CreateClientePayload,
  UpdateClientePayload,
} from "@/types/cliente";
import type { Midia, TipoMidia } from "@/types/midia";
import type { Contrato, MensagemWhatsApp } from "@/types/contrato";
import type { FestaDescontoPendente, SolicitarDescontoPayload } from "@/types/desconto";
import type {
  AtendimentoMetricas,
  AtendimentoVendedor,
  CanalAtendimento,
  ConversaDetalhe,
  ConversaListItem,
  StatusConversa,
} from "@/types/atendimento";
import type {
  BolasComprasPedido,
  BolasFinanceiroResumo,
  CatalogoBola,
  CreatePedidoBolasPayload,
  PedidoBolas,
  PedidoBolasCompra,
} from "@/types/bolas";
import type {
  AgendaOs,
  AssignMontadorPayload,
  Montador,
} from "@/types/equipe";
import type {
  FinanceiroResumo,
  ComissaoRanking,
  ComissaoExtrato,
  ComissaoStatus,
  PrevisaoCaixa,
  EquipeDiariasPeriodo,
  FrequenciaPagamentoEquipe,
  MeusTotaisPeriodo,
  ColaboradorFinanceiroResumo,
  ColaboradorFinanceiroDetalhe,
} from "@/types/financeiro";
import type {
  CheckinPayload,
  FestaMontagemHoje,
  ItemRomaneio,
  OrdemServico,
  PortalFestaStatus,
  PortalLinkResponse,
  QrScanPayload,
  QrScanResult,
  RotaDiaItem,
  UpdateRomaneioItemPayload,
} from "@/types/os";

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

export async function listFestas(
  token: string,
  options?: { lixeira?: boolean; minhas?: boolean }
): Promise<Festa[]> {
  const params = new URLSearchParams();
  if (options?.lixeira) params.set("lixeira", "1");
  if (options?.minhas) params.set("minhas", "1");
  const qs = params.toString();
  const response = await fetch(
    `${getBaseUrl()}/api/festas${qs ? `?${qs}` : ""}`,
    {
      headers: authHeaders(token),
      cache: "no-store",
    }
  );
  const raw = await handleResponse<Array<Record<string, unknown>>>(response);
  return raw.map(normalizeFesta);
}

function normalizeRisco(value: unknown): RiscoOrcamento | undefined {
  if (!value || typeof value !== "object") return undefined;
  const row = value as Record<string, unknown>;
  const nivel = row.nivel;
  if (nivel !== "BAIXO" && nivel !== "MEDIO" && nivel !== "ALTO") {
    return undefined;
  }
  return {
    score: toNumber(row.score),
    nivel,
    fatores: Array.isArray(row.fatores)
      ? row.fatores.filter((f): f is string => typeof f === "string")
      : [],
  };
}

function normalizeFesta(raw: Record<string, unknown>): Festa {
  return {
    ...(raw as unknown as Festa),
    risco: normalizeRisco(raw.risco),
  };
}

/** Score de risco do orçamento (GET /api/festas/:id/risco). */
export async function getFestaRisco(
  festaId: string,
  token: string
): Promise<RiscoOrcamento> {
  const response = await fetch(`${getBaseUrl()}/api/festas/${festaId}/risco`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  return handleResponse<RiscoOrcamento>(response);
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

/** Lista clientes (GET /api/clientes?q=). */
export async function listClientes(
  token: string,
  q?: string
): Promise<ClienteListItem[]> {
  const qs = q?.trim() ? `?q=${encodeURIComponent(q.trim())}` : "";
  const response = await fetch(`${getBaseUrl()}/api/clientes${qs}`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  return handleResponse<ClienteListItem[]>(response);
}

/** Detalhe do cliente com histórico de festas (GET /api/clientes/:id). */
export async function getClienteById(
  id: string,
  token: string
): Promise<ClienteDetalhe> {
  const response = await fetch(`${getBaseUrl()}/api/clientes/${id}`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  return handleResponse<ClienteDetalhe>(response);
}

/** Busca cliente por telefone (GET /api/clientes/buscar?telefone=). */
export async function buscarClientePorTelefone(
  telefone: string,
  token: string
): Promise<Cliente | null> {
  const qs = new URLSearchParams({ telefone }).toString();
  const response = await fetch(`${getBaseUrl()}/api/clientes/buscar?${qs}`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  if (response.status === 404) {
    return null;
  }
  return handleResponse<Cliente>(response);
}

export async function createCliente(
  payload: CreateClientePayload,
  token: string
): Promise<Cliente> {
  const response = await fetch(`${getBaseUrl()}/api/clientes`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleResponse<Cliente>(response);
}

export async function updateCliente(
  id: string,
  payload: UpdateClientePayload,
  token: string
): Promise<Cliente> {
  const response = await fetch(`${getBaseUrl()}/api/clientes/${id}`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleResponse<Cliente>(response);
}

export async function updateFesta(
  id: string,
  payload: UpdateFestaPayload,
  token: string
): Promise<Festa> {
  const response = await fetch(`${getBaseUrl()}/api/festas/${id}`, {
    method: "PUT",
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

export async function deleteFesta(id: string, token: string): Promise<void> {
  const response = await fetch(`${getBaseUrl()}/api/festas/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  await handleResponse(response);
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

export async function anexarComprovantePagamento(
  pagamentoId: string,
  comprovanteMidiaId: string | null,
  token: string
): Promise<Pagamento> {
  const response = await fetch(
    `${getBaseUrl()}/api/pagamentos/${pagamentoId}/comprovante`,
    {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify({ comprovanteMidiaId }),
    }
  );
  return handleResponse<Pagamento>(response);
}

export async function excluirPagamento(
  pagamentoId: string,
  token: string
): Promise<Pagamento> {
  const response = await fetch(
    `${getBaseUrl()}/api/pagamentos/${pagamentoId}`,
    {
      method: "DELETE",
      headers: authHeaders(token),
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

export async function deleteProduto(
  produtoId: string,
  token: string
): Promise<{ ok: true; produtoId: string }> {
  const response = await fetch(`${getBaseUrl()}/api/produtos/${produtoId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  return handleResponse<{ ok: true; produtoId: string }>(response);
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

export async function deleteUnidade(
  produtoId: string,
  unidadeId: string,
  token: string
): Promise<{ ok: true; unidadeId: string }> {
  const response = await fetch(
    `${getBaseUrl()}/api/produtos/${produtoId}/unidades/${unidadeId}`,
    {
      method: "DELETE",
      headers: authHeaders(token),
    }
  );
  return handleResponse<{ ok: true; unidadeId: string }>(response);
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

export async function listInventario(
  token: string
): Promise<InventarioItem[]> {
  const response = await fetch(`${getBaseUrl()}/api/estoque/inventario`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  return handleResponse<InventarioItem[]>(response);
}

export async function sincronizarCatalogoEstoque(
  token: string
): Promise<SincronizarCatalogoResult> {
  const response = await fetch(
    `${getBaseUrl()}/api/estoque/sincronizar-catalogo`,
    {
      method: "POST",
      headers: authHeaders(token),
    }
  );
  return handleResponse<SincronizarCatalogoResult>(response);
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

/** Alertas de peça sumida (saída QR sem retorno). */
export async function listAlertasQr(token: string): Promise<AlertaQr[]> {
  const response = await fetch(`${getBaseUrl()}/api/estoque/alertas-qr`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  return handleResponse<AlertaQr[]>(response);
}

/** Sugestões automáticas de produtos para um tema de festa. */
export async function sugestoesProdutos(
  params: { tema: string; tamanho?: string },
  token: string
): Promise<ProdutoSugestao[]> {
  const qs = new URLSearchParams({ tema: params.tema });
  if (params.tamanho) qs.set("tamanho", params.tamanho);
  const response = await fetch(
    `${getBaseUrl()}/api/produtos/sugestoes?${qs}`,
    {
      headers: authHeaders(token),
      cache: "no-store",
    }
  );
  return handleResponse<ProdutoSugestao[]>(response);
}

/** Conferência de estoque dos itens da festa (POST /api/estoque/avaliar-itens). */
export async function avaliarItensEstoque(
  payload: { itensExtras: string[]; inicio: string; fim: string },
  token: string
): Promise<EstoqueAvaliacao> {
  const response = await fetch(`${getBaseUrl()}/api/estoque/avaliar-itens`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleResponse<EstoqueAvaliacao>(response);
}

/** Festas/OS de montagem do dia (GET /api/os/today). */
export async function listOsHoje(token: string): Promise<FestaMontagemHoje[]> {
  const response = await fetch(`${getBaseUrl()}/api/os/today`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  return handleResponse<FestaMontagemHoje[]>(response);
}

/** Rota sugerida do dia (GET /api/os/today/rota). */
export async function listOsRotaHoje(token: string): Promise<RotaDiaItem[]> {
  const response = await fetch(`${getBaseUrl()}/api/os/today/rota`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  return handleResponse<RotaDiaItem[]>(response);
}

export async function resolvePortalLegacyLink(
  festaId: string
): Promise<PortalLinkResponse> {
  const response = await fetch(
    `${getBaseUrl()}/api/portal/legacy/${encodeURIComponent(festaId)}/link`,
    { cache: "no-store" }
  );
  return handleResponse<PortalLinkResponse>(response);
}

/** Status público da festa (GET /api/portal/:token/status). */
export async function getPortalStatus(
  token: string
): Promise<PortalFestaStatus> {
  const response = await fetch(
    `${getBaseUrl()}/api/portal/${encodeURIComponent(token)}/status`,
    { cache: "no-store" }
  );
  return handleResponse<PortalFestaStatus>(response);
}

export function getPortalMidiaUrl(token: string, midiaId: string): string {
  return `${getBaseUrl()}/api/portal/${encodeURIComponent(token)}/midias/${midiaId}`;
}

export async function uploadPortalMidia(
  token: string,
  file: File
): Promise<Midia> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(
    `${getBaseUrl()}/api/portal/${encodeURIComponent(token)}/midias`,
    { method: "POST", body: formData }
  );
  return handleResponse<Midia>(response);
}

export async function assinarPortal(
  token: string,
  file: File
): Promise<PortalFestaStatus> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(
    `${getBaseUrl()}/api/portal/${encodeURIComponent(token)}/assinar`,
    { method: "POST", body: formData }
  );
  return handleResponse<PortalFestaStatus>(response);
}

export async function avaliarPortal(
  token: string,
  payload: { nota: number; comentario?: string }
): Promise<PortalFestaStatus> {
  const response = await fetch(
    `${getBaseUrl()}/api/portal/${encodeURIComponent(token)}/avaliar`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  return handleResponse<PortalFestaStatus>(response);
}

/** Link compartilhável do portal (POST /api/festas/:id/portal-link). */
export async function getPortalLink(
  festaId: string,
  token: string
): Promise<PortalLinkResponse> {
  const response = await fetch(
    `${getBaseUrl()}/api/festas/${festaId}/portal-link`,
    {
      method: "POST",
      headers: authHeaders(token),
    }
  );
  return handleResponse<PortalLinkResponse>(response);
}

export async function listMidiasFesta(
  festaId: string,
  authToken: string,
  tipos?: string[]
): Promise<Midia[]> {
  const qs = tipos?.length ? `?tipos=${tipos.join(",")}` : "";
  const response = await fetch(
    `${getBaseUrl()}/api/midias/festa/${festaId}${qs}`,
    { headers: authHeaders(authToken), cache: "no-store" }
  );
  return handleResponse<Midia[]>(response);
}

export function getMidiaAuthUrl(midiaId: string): string {
  return `${getBaseUrl()}/api/midias/${midiaId}`;
}

export async function listUsers(token: string): Promise<import("@/types/admin").UserAdmin[]> {
  const response = await fetch(`${getBaseUrl()}/api/users`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  return handleResponse(response);
}

export async function createUser(
  payload: {
    nome: string;
    role: string;
    email?: string | null;
    senha?: string;
  },
  token: string
): Promise<import("@/types/admin").UserAdmin> {
  const response = await fetch(`${getBaseUrl()}/api/users`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
}

export async function updateUser(
  id: string,
  payload: Partial<{
    nome: string;
    role: string;
    email: string | null;
    ativo: boolean;
    senha: string;
    ehSocia: boolean;
    ehDona: boolean;
    sociaDesde: string | null;
  }>,
  token: string
): Promise<import("@/types/admin").UserAdmin> {
  const response = await fetch(`${getBaseUrl()}/api/users/${id}`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
}

export async function deleteUser(
  id: string,
  token: string
): Promise<{
  modo: "excluido" | "desativado";
  usuario: import("@/types/admin").UserAdmin;
}> {
  const response = await fetch(`${getBaseUrl()}/api/users/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  return handleResponse(response);
}

export async function getConfiguracoes(
  token: string
): Promise<import("@/types/admin").ConfiguracaoNegocio> {
  const response = await fetch(`${getBaseUrl()}/api/configuracoes`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  return handleResponse(response);
}

export async function updateConfiguracoes(
  payload: Partial<import("@/types/admin").ConfiguracaoNegocio>,
  token: string
): Promise<import("@/types/admin").ConfiguracaoNegocio> {
  const response = await fetch(`${getBaseUrl()}/api/configuracoes`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
}

export async function getCatalogo(
  token: string
): Promise<import("@/types/admin").CatalogoPublico> {
  const response = await fetch(`${getBaseUrl()}/api/catalogo`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  return handleResponse(response);
}

export async function listCatalogoKitsAdmin(
  token: string
): Promise<import("@/types/admin").CatalogoKitApi[]> {
  const response = await fetch(`${getBaseUrl()}/api/catalogo/kits`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  return handleResponse(response);
}

export async function listCatalogoAddonsAdmin(
  token: string
): Promise<import("@/types/admin").CatalogoAddonApi[]> {
  const response = await fetch(`${getBaseUrl()}/api/catalogo/addons`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  return handleResponse(response);
}

export async function upsertCatalogoKit(
  payload: Record<string, unknown>,
  token: string
): Promise<import("@/types/admin").CatalogoKitApi> {
  const response = await fetch(`${getBaseUrl()}/api/catalogo/kits`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
}

export async function upsertCatalogoAddon(
  payload: Record<string, unknown>,
  token: string
): Promise<import("@/types/admin").CatalogoAddonApi> {
  const response = await fetch(`${getBaseUrl()}/api/catalogo/addons`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
}

export async function setCatalogoKitAtivo(
  id: string,
  ativo: boolean,
  token: string
): Promise<unknown> {
  const response = await fetch(`${getBaseUrl()}/api/catalogo/kits/${id}/ativo`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify({ ativo }),
  });
  return handleResponse(response);
}

export async function setCatalogoAddonAtivo(
  id: string,
  ativo: boolean,
  token: string
): Promise<unknown> {
  const response = await fetch(
    `${getBaseUrl()}/api/catalogo/addons/${id}/ativo`,
    {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify({ ativo }),
    }
  );
  return handleResponse(response);
}

export async function marcarComissoesPagas(
  ids: string[],
  token: string
): Promise<{ count: number }> {
  const response = await fetch(`${getBaseUrl()}/api/comissoes/marcar-pagas`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ ids }),
  });
  return handleResponse(response);
}

export async function listComissoesPendentes(token: string): Promise<unknown[]> {
  const response = await fetch(`${getBaseUrl()}/api/comissoes/pendentes`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  return handleResponse(response);
}

function normalizeComissaoExtrato(raw: Record<string, unknown>): ComissaoExtrato {
  const festaRaw =
    raw.festa && typeof raw.festa === "object"
      ? (raw.festa as Record<string, unknown>)
      : {};
  const clienteRaw =
    festaRaw.cliente && typeof festaRaw.cliente === "object"
      ? (festaRaw.cliente as Record<string, unknown>)
      : {};

  const statusRaw = raw.status;
  const status: ComissaoStatus =
    statusRaw === "PAGA" ? "PAGA" : "PENDENTE";

  return {
    id: typeof raw.id === "string" ? raw.id : String(raw.id ?? ""),
    tipo: typeof raw.tipo === "string" ? raw.tipo : undefined,
    tipoLabel: typeof raw.tipoLabel === "string" ? raw.tipoLabel : undefined,
    percentual:
      raw.percentual == null ? null : toNumber(raw.percentual),
    valor: toNumber(raw.valor),
    status,
    pagoEm: typeof raw.pagoEm === "string" ? raw.pagoEm : null,
    criadoEm:
      typeof raw.criadoEm === "string"
        ? raw.criadoEm
        : new Date().toISOString(),
    elegivelEm:
      typeof raw.elegivelEm === "string" ? raw.elegivelEm : undefined,
    liberadoParaPagamento:
      typeof raw.liberadoParaPagamento === "boolean"
        ? raw.liberadoParaPagamento
        : undefined,
    festa: {
      id: typeof festaRaw.id === "string" ? festaRaw.id : "",
      tema: typeof festaRaw.tema === "string" ? festaRaw.tema : "Festa",
      dataEvento:
        typeof festaRaw.dataEvento === "string"
          ? festaRaw.dataEvento
          : undefined,
      cliente: {
        nome:
          typeof clienteRaw.nome === "string" ? clienteRaw.nome : "Cliente",
      },
    },
  };
}

/** Extrato de comissões do vendedor logado (GET /api/comissoes/minhas). */
export async function listMinhasComissoes(token: string): Promise<ComissaoExtrato[]> {
  const response = await fetch(`${getBaseUrl()}/api/comissoes/minhas`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  const raw = await handleResponse<Array<Record<string, unknown>>>(response);
  return raw.map(normalizeComissaoExtrato);
}

/** Totais do próprio usuário por período (semana / 15 dias / mês). */
export async function getMeusTotais(
  token: string,
  options?: { periodo?: "semana" | "quinzena" | "mes"; offset?: number }
): Promise<MeusTotaisPeriodo> {
  const params = new URLSearchParams();
  if (options?.periodo) params.set("periodo", options.periodo);
  if (options?.offset != null) params.set("offset", String(options.offset));
  const qs = params.toString();
  const response = await fetch(
    `${getBaseUrl()}/api/comissoes/meus-totais${qs ? `?${qs}` : ""}`,
    {
      headers: authHeaders(token),
      cache: "no-store",
    }
  );
  const raw = await handleResponse<Record<string, unknown>>(response);
  const porTipoRaw = Array.isArray(raw.porTipo) ? raw.porTipo : [];
  const lancRaw = Array.isArray(raw.lancamentos) ? raw.lancamentos : [];
  return {
    periodo:
      raw.periodo === "quinzena" || raw.periodo === "mes"
        ? raw.periodo
        : "semana",
    offset: toNumber(raw.offset),
    label: typeof raw.label === "string" ? raw.label : "",
    inicio: typeof raw.inicio === "string" ? raw.inicio : "",
    fim: typeof raw.fim === "string" ? raw.fim : "",
    total: toNumber(raw.total),
    totalPendente: toNumber(raw.totalPendente),
    totalLiberado: toNumber(raw.totalLiberado),
    totalPago: toNumber(raw.totalPago),
    porTipo: porTipoRaw.map((item) => {
      const row = item as Record<string, unknown>;
      return {
        tipo: typeof row.tipo === "string" ? row.tipo : "",
        label: typeof row.label === "string" ? row.label : "",
        pendente: toNumber(row.pendente),
        pago: toNumber(row.pago),
        total: toNumber(row.total),
      };
    }),
    lancamentos: lancRaw.map((item) =>
      normalizeComissaoExtrato(item as Record<string, unknown>)
    ),
  };
}

export async function listColaboradoresFinanceiro(
  token: string
): Promise<ColaboradorFinanceiroResumo[]> {
  const response = await fetch(`${getBaseUrl()}/api/financeiro/colaboradores`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  const raw = await handleResponse<Array<Record<string, unknown>>>(response);
  return raw.map((row) => ({
    id: String(row.id ?? ""),
    nome: typeof row.nome === "string" ? row.nome : "",
    role: typeof row.role === "string" ? row.role : "",
    telefone: typeof row.telefone === "string" ? row.telefone : null,
    email: typeof row.email === "string" ? row.email : null,
    ehSocia: Boolean(row.ehSocia),
    ehDona: Boolean(row.ehDona),
    totalPendente: toNumber(row.totalPendente),
    totalLiberado: toNumber(row.totalLiberado),
    totalPago: toNumber(row.totalPago),
    totalComissaoVenda: toNumber(row.totalComissaoVenda),
    totalDiarias: toNumber(row.totalDiarias),
    totalDivisao: toNumber(row.totalDivisao),
  }));
}

export async function getColaboradorFinanceiro(
  token: string,
  id: string,
  options?: { periodo?: string; offset?: number }
): Promise<ColaboradorFinanceiroDetalhe> {
  const params = new URLSearchParams();
  if (options?.periodo) params.set("periodo", options.periodo);
  if (options?.offset != null) params.set("offset", String(options.offset));
  const qs = params.toString();
  const response = await fetch(
    `${getBaseUrl()}/api/financeiro/colaboradores/${id}${qs ? `?${qs}` : ""}`,
    {
      headers: authHeaders(token),
      cache: "no-store",
    }
  );
  const raw = await handleResponse<Record<string, unknown>>(response);
  const col = (raw.colaborador ?? {}) as Record<string, unknown>;
  const porTipoRaw = Array.isArray(raw.porTipo) ? raw.porTipo : [];
  const lancRaw = Array.isArray(raw.lancamentos) ? raw.lancamentos : [];
  const festasRaw = Array.isArray(raw.festasVendidas) ? raw.festasVendidas : [];
  return {
    colaborador: {
      id: String(col.id ?? id),
      nome: typeof col.nome === "string" ? col.nome : "",
      role: typeof col.role === "string" ? col.role : "",
      telefone: typeof col.telefone === "string" ? col.telefone : null,
      email: typeof col.email === "string" ? col.email : null,
      ehSocia: Boolean(col.ehSocia),
      ehDona: Boolean(col.ehDona),
      ativo: col.ativo !== false,
    },
    periodo:
      raw.periodo === "semana" ||
      raw.periodo === "quinzena" ||
      raw.periodo === "mes" ||
      raw.periodo === "tudo"
        ? raw.periodo
        : "mes",
    offset: toNumber(raw.offset),
    label: typeof raw.label === "string" ? raw.label : "",
    inicio: typeof raw.inicio === "string" ? raw.inicio : "",
    fim: typeof raw.fim === "string" ? raw.fim : "",
    total: toNumber(raw.total),
    totalPendente: toNumber(raw.totalPendente),
    totalLiberado: toNumber(raw.totalLiberado),
    totalPago: toNumber(raw.totalPago),
    porTipo: porTipoRaw.map((item) => {
      const row = item as Record<string, unknown>;
      return {
        tipo: typeof row.tipo === "string" ? row.tipo : "",
        label: typeof row.label === "string" ? row.label : "",
        pendente: toNumber(row.pendente),
        pago: toNumber(row.pago),
        total: toNumber(row.total),
      };
    }),
    lancamentos: lancRaw.map((item) =>
      normalizeComissaoExtrato(item as Record<string, unknown>)
    ),
    festasVendidas: festasRaw.map((item) => {
      const row = item as Record<string, unknown>;
      return {
        id: String(row.id ?? ""),
        tema: typeof row.tema === "string" ? row.tema : "",
        status: typeof row.status === "string" ? row.status : "",
        valor: toNumber(row.valor),
        dataEvento: typeof row.dataEvento === "string" ? row.dataEvento : "",
        clienteNome: typeof row.clienteNome === "string" ? row.clienteNome : "",
      };
    }),
  };
}

export async function listFollowUps(
  token: string,
  options?: { minhas?: boolean; hoje?: boolean }
): Promise<unknown[]> {
  const params = new URLSearchParams();
  if (options?.minhas) params.set("minhas", "1");
  if (options?.hoje) params.set("hoje", "1");
  const qs = params.toString();
  const response = await fetch(
    `${getBaseUrl()}/api/festas/follow-ups${qs ? `?${qs}` : ""}`,
    {
      headers: authHeaders(token),
      cache: "no-store",
    }
  );
  return handleResponse(response);
}

export async function registrarFollowUp(
  festaId: string,
  payload: { canal?: string; nota?: string; proximoContatoEm?: string | null },
  token: string
): Promise<unknown> {
  const response = await fetch(
    `${getBaseUrl()}/api/festas/${festaId}/follow-ups`,
    {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }
  );
  return handleResponse(response);
}

export async function gerarPixQr(
  pagamentoId: string,
  token: string
): Promise<import("@/types/festa").Pagamento> {
  const response = await fetch(
    `${getBaseUrl()}/api/pagamentos/${pagamentoId}/pix`,
    {
      method: "POST",
      headers: authHeaders(token),
    }
  );
  return handleResponse(response);
}

/** OS atribuídas ao montador logado (GET /api/os/mine). */
export async function listOsMine(token: string): Promise<OrdemServico[]> {
  const response = await fetch(`${getBaseUrl()}/api/os/mine`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  return handleResponse<OrdemServico[]>(response);
}

export async function getOs(id: string, token: string): Promise<OrdemServico> {
  const response = await fetch(`${getBaseUrl()}/api/os/${id}`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  return handleResponse<OrdemServico>(response);
}

export async function updateRomaneioItem(
  osId: string,
  itemId: string,
  payload: UpdateRomaneioItemPayload,
  token: string
): Promise<ItemRomaneio> {
  const response = await fetch(
    `${getBaseUrl()}/api/os/${osId}/romaneio/itens/${itemId}`,
    {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }
  );
  return handleResponse<ItemRomaneio>(response);
}

/** Upload de foto de item alto valor (POST /api/os/:id/romaneio/itens/:itemId/foto). */
export async function uploadItemFotoRomaneio(
  osId: string,
  itemId: string,
  file: File,
  token: string
): Promise<ItemRomaneio> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(
    `${getBaseUrl()}/api/os/${osId}/romaneio/itens/${itemId}/foto`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    }
  );
  return handleResponse<ItemRomaneio>(response);
}

export async function concluirRomaneio(
  osId: string,
  token: string
): Promise<OrdemServico> {
  const response = await fetch(
    `${getBaseUrl()}/api/os/${osId}/romaneio/concluir`,
    {
      method: "POST",
      headers: authHeaders(token),
    }
  );
  return handleResponse<OrdemServico>(response);
}

/** Gera itens do romaneio a partir das reservas (POST /api/os/:id/romaneio/seed). */
export async function seedRomaneio(
  osId: string,
  token: string
): Promise<OrdemServico> {
  const response = await fetch(
    `${getBaseUrl()}/api/os/${osId}/romaneio/seed`,
    {
      method: "POST",
      headers: authHeaders(token),
    }
  );
  return handleResponse<OrdemServico>(response);
}

/** Marca montagem no local como concluída (POST /api/os/:id/montagem-local/concluir). */
export async function concluirMontagemLocal(
  osId: string,
  token: string
): Promise<OrdemServico> {
  const response = await fetch(
    `${getBaseUrl()}/api/os/${osId}/montagem-local/concluir`,
    {
      method: "POST",
      headers: authHeaders(token),
    }
  );
  return handleResponse<OrdemServico>(response);
}

/** Registra saída e finaliza a montagem (POST /api/os/:id/finalizar). */
export async function finalizarOs(
  osId: string,
  token: string
): Promise<OrdemServico> {
  const response = await fetch(`${getBaseUrl()}/api/os/${osId}/finalizar`, {
    method: "POST",
    headers: authHeaders(token),
  });
  return handleResponse<OrdemServico>(response);
}

export async function checkinOs(
  osId: string,
  payload: CheckinPayload,
  token: string
): Promise<OrdemServico> {
  const response = await fetch(`${getBaseUrl()}/api/os/${osId}/checkin`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleResponse<OrdemServico>(response);
}

export async function uploadFotoFinalOs(
  osId: string,
  file: File,
  token: string
): Promise<OrdemServico> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(`${getBaseUrl()}/api/os/${osId}/foto-final`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  return handleResponse<OrdemServico>(response);
}

export async function fotoFinalOsByMidia(
  osId: string,
  midiaId: string,
  token: string
): Promise<OrdemServico> {
  const response = await fetch(`${getBaseUrl()}/api/os/${osId}/foto-final`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ midiaId }),
  });
  return handleResponse<OrdemServico>(response);
}

export async function scanQr(
  payload: QrScanPayload,
  token: string
): Promise<QrScanResult> {
  const response = await fetch(`${getBaseUrl()}/api/qr/scan`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleResponse<QrScanResult>(response);
}

/** Gera ou retorna contrato existente (POST /api/festas/:id/contrato). */
export async function gerarContrato(
  festaId: string,
  token: string
): Promise<Contrato> {
  const response = await fetch(
    `${getBaseUrl()}/api/festas/${festaId}/contrato`,
    {
      method: "POST",
      headers: authHeaders(token),
    }
  );
  const body = await handleResponse<{
    id: string;
    geradoEm: string;
    festaId?: string;
    pdfDisponivel?: boolean;
  }>(response);
  return {
    id: body.id,
    festaId: body.festaId ?? festaId,
    geradoEm: body.geradoEm,
    pdfDisponivel: body.pdfDisponivel,
  };
}

/** Contrato da festa, ou null se ainda não existir (GET /api/festas/:id/contrato). */
export async function getContrato(
  festaId: string,
  token: string
): Promise<Contrato | null> {
  const response = await fetch(
    `${getBaseUrl()}/api/festas/${festaId}/contrato`,
    {
      headers: authHeaders(token),
      cache: "no-store",
    }
  );
  if (response.status === 404) {
    return null;
  }
  const body = await handleResponse<{
    id: string;
    geradoEm: string;
    festaId?: string;
    pdfDisponivel?: boolean;
  }>(response);
  return {
    id: body.id,
    festaId: body.festaId ?? festaId,
    geradoEm: body.geradoEm,
    pdfDisponivel: body.pdfDisponivel,
  };
}

/** Baixa PDF do contrato com Authorization bearer (GET /api/contratos/:id/pdf). */
export async function downloadContratoPdf(
  contratoId: string,
  token: string,
  filename = `contrato-${contratoId}.pdf`
): Promise<void> {
  const response = await fetch(
    `${getBaseUrl()}/api/contratos/${contratoId}/pdf`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!response.ok) {
    let message = `Erro HTTP ${response.status}`;
    try {
      const body = (await response.json()) as {
        error?: string;
        message?: string;
      };
      message = body.message ?? body.error ?? message;
    } catch {
      // resposta pode ser binária ou vazia
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  if (blob.size === 0) {
    throw new Error("PDF vazio ou ainda não disponível");
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

/** Resumo financeiro do dono (GET /api/financeiro/resumo). */
export async function getFinanceiroResumo(
  token: string
): Promise<FinanceiroResumo> {
  const response = await fetch(`${getBaseUrl()}/api/financeiro/resumo`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  const raw = await handleResponse<Record<string, unknown>>(response);

  const rentabilidadeRaw = Array.isArray(raw.rentabilidadePorTema)
    ? raw.rentabilidadePorTema
    : [];
  const rankingRaw = Array.isArray(raw.rankingVendedores)
    ? raw.rankingVendedores
    : undefined;

  return {
    entradasConfirmadas: toNumber(raw.entradasConfirmadas),
    recebiveis: toNumber(raw.recebiveis ?? raw.recebiveisPendentes),
    recebiveisDetalhe:
      raw.recebiveisDetalhe && typeof raw.recebiveisDetalhe === "object"
        ? {
            pagamentosPendentes: toNumber(
              (raw.recebiveisDetalhe as Record<string, unknown>)
                .pagamentosPendentes
            ),
            saldoFestasSemPagamentoCompleto: toNumber(
              (raw.recebiveisDetalhe as Record<string, unknown>)
                .saldoFestasSemPagamentoCompleto
            ),
          }
        : undefined,
    comissoesPendentes: toNumber(
      raw.comissoesPendentesLiberadas ?? raw.comissoesPendentes
    ),
    comissoesPendentesLiberadas: toNumber(
      raw.comissoesPendentesLiberadas ?? raw.comissoesPendentes
    ),
    comissoesPendentesFuturas: toNumber(raw.comissoesPendentesFuturas),
    comissoesPendentesTotal: toNumber(
      raw.comissoesPendentesTotal ??
        (toNumber(raw.comissoesPendentesLiberadas ?? raw.comissoesPendentes) +
          toNumber(raw.comissoesPendentesFuturas))
    ),
    comissoesPagas: toNumber(raw.comissoesPagas),
    rentabilidadePorTema: rentabilidadeRaw.map((item) => {
      const row = item as Record<string, unknown>;
      return {
        tema: typeof row.tema === "string" ? row.tema : "Sem tema",
        receita: toNumber(row.receita ?? row.totalValor),
        custo: row.custo != null ? toNumber(row.custo) : undefined,
        margem: row.margem != null ? toNumber(row.margem) : undefined,
        quantidade:
          row.quantidade != null ? toNumber(row.quantidade) : undefined,
      };
    }),
    rankingVendedores: rankingRaw?.map((item) => {
      const row = item as Record<string, unknown>;
      return {
        vendedorId:
          typeof row.vendedorId === "string" ? row.vendedorId : String(row.id ?? ""),
        vendedorNome:
          typeof row.vendedorNome === "string"
            ? row.vendedorNome
            : typeof row.nome === "string"
              ? row.nome
              : "Vendedor",
        totalComissao: toNumber(row.totalComissao ?? row.total),
        comissoesPagas:
          row.comissoesPagas != null ? toNumber(row.comissoesPagas) : undefined,
        comissoesPendentes:
          row.comissoesPendentes != null
            ? toNumber(row.comissoesPendentes)
            : undefined,
      };
    }),
  };
}

/** Ranking gamificado de comissões (GET /api/comissoes/ranking). */
export async function getComissaoRanking(
  token: string,
  periodo: "semana" | "mes" = "semana"
): Promise<ComissaoRanking> {
  const qs = new URLSearchParams({ periodo }).toString();
  const response = await fetch(`${getBaseUrl()}/api/comissoes/ranking?${qs}`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  const raw = await handleResponse<Record<string, unknown>>(response);

  const rankingRaw = Array.isArray(raw.ranking) ? raw.ranking : [];

  return {
    periodo: raw.periodo === "mes" ? "mes" : "semana",
    inicio: typeof raw.inicio === "string" ? raw.inicio : new Date().toISOString(),
    meta: toNumber(raw.meta),
    ranking: rankingRaw.map((item) => {
      const row = item as Record<string, unknown>;
      return {
        vendedorId:
          typeof row.vendedorId === "string" ? row.vendedorId : String(row.id ?? ""),
        vendedorNome:
          typeof row.vendedorNome === "string"
            ? row.vendedorNome
            : typeof row.nome === "string"
              ? row.nome
              : "Vendedor",
        totalComissao: toNumber(row.totalComissao ?? row.total),
        posicao: row.posicao != null ? toNumber(row.posicao) : undefined,
        meta: row.meta != null ? toNumber(row.meta) : undefined,
        atingiuMeta:
          typeof row.atingiuMeta === "boolean" ? row.atingiuMeta : undefined,
        progressoMeta:
          row.progressoMeta != null ? toNumber(row.progressoMeta) : undefined,
      };
    }),
  };
}

/** Previsão de caixa (GET /api/financeiro/previsao). */
export async function getFinanceiroPrevisao(
  token: string,
  dias = 30
): Promise<PrevisaoCaixa> {
  const qs = new URLSearchParams({ dias: String(dias) }).toString();
  const response = await fetch(`${getBaseUrl()}/api/financeiro/previsao?${qs}`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  const raw = await handleResponse<Record<string, unknown>>(response);
  const periodosRaw = Array.isArray(raw.periodos) ? raw.periodos : [];

  return {
    dias: toNumber(raw.dias) || dias,
    inicio: typeof raw.inicio === "string" ? raw.inicio : new Date().toISOString(),
    fim: typeof raw.fim === "string" ? raw.fim : new Date().toISOString(),
    totalPrevisto: toNumber(raw.totalPrevisto),
    periodos: periodosRaw.map((item) => {
      const row = item as Record<string, unknown>;
      return {
        inicio: typeof row.inicio === "string" ? row.inicio : "",
        fim: typeof row.fim === "string" ? row.fim : "",
        confirmado: toNumber(row.confirmado),
        pendente: toNumber(row.pendente),
        saldoFesta: toNumber(row.saldoFesta),
        total: toNumber(row.total),
      };
    }),
  };
}

/** Diárias da equipe no período (GET /api/financeiro/equipe-diarias). */
export async function getEquipeDiarias(
  token: string,
  offset = 0
): Promise<EquipeDiariasPeriodo> {
  const qs = new URLSearchParams({ offset: String(offset) }).toString();
  const response = await fetch(
    `${getBaseUrl()}/api/financeiro/equipe-diarias?${qs}`,
    {
      headers: authHeaders(token),
      cache: "no-store",
    }
  );
  return normalizeEquipeDiarias(
    await handleResponse<EquipeDiariasPeriodo>(response)
  );
}

export async function pagarEquipeDiarias(
  token: string,
  payload: { pessoaId?: string; offset?: number }
): Promise<EquipeDiariasPeriodo> {
  const response = await fetch(
    `${getBaseUrl()}/api/financeiro/equipe-diarias/pagar`,
    {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }
  );
  const raw = await handleResponse<EquipeDiariasPeriodo & { pagas?: number }>(
    response
  );
  return normalizeEquipeDiarias(raw);
}

export async function setFrequenciaPagamentoEquipe(
  token: string,
  frequencia: FrequenciaPagamentoEquipe
): Promise<EquipeDiariasPeriodo> {
  const response = await fetch(
    `${getBaseUrl()}/api/financeiro/equipe-diarias/frequencia`,
    {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify({ frequencia }),
    }
  );
  return normalizeEquipeDiarias(
    await handleResponse<EquipeDiariasPeriodo>(response)
  );
}

function normalizeEquipeDiarias(raw: EquipeDiariasPeriodo): EquipeDiariasPeriodo {
  return {
    ...raw,
    totalPendente: toNumber(raw.totalPendente),
    totalPago: toNumber(raw.totalPago),
    pessoas: (raw.pessoas ?? []).map((p) => ({
      ...p,
      total: toNumber(p.total),
      totalPendente: toNumber(p.totalPendente),
      totalPago: toNumber(p.totalPago),
      diasPendentes: toNumber(p.diasPendentes),
      diasPagos: toNumber(p.diasPagos),
      dias: (p.dias ?? []).map((d) => ({
        ...d,
        valor: toNumber(d.valor),
      })),
    })),
  };
}

/** Lista mensagens WhatsApp da festa (GET /api/whatsapp/mensagens?festaId=). */
export async function listMensagensWhatsApp(
  festaId: string,
  token: string
): Promise<MensagemWhatsApp[]> {
  const qs = new URLSearchParams({ festaId }).toString();
  const response = await fetch(
    `${getBaseUrl()}/api/whatsapp/mensagens?${qs}`,
    {
      headers: authHeaders(token),
      cache: "no-store",
    }
  );
  return handleResponse<MensagemWhatsApp[]>(response);
}

/** Equipe ativa para montar/desmontar (GET /api/equipe/montadores). */
export async function listMontadores(token: string): Promise<Montador[]> {
  const response = await fetch(`${getBaseUrl()}/api/equipe/montadores`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  return handleResponse<Montador[]>(response);
}

/** Agenda de OS no período (GET /api/equipe/agenda?inicio&fim). */
export async function listEquipeAgenda(
  params: { inicio: string; fim: string },
  token: string
): Promise<AgendaOs[]> {
  const qs = new URLSearchParams({
    inicio: params.inicio,
    fim: params.fim,
  }).toString();
  const response = await fetch(`${getBaseUrl()}/api/equipe/agenda?${qs}`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  return handleResponse<AgendaOs[]>(response);
}

/** Atribui montador à OS (PATCH /api/os/:id/montador). */
export async function assignMontadorOs(
  osId: string,
  payload: AssignMontadorPayload,
  token: string
): Promise<OrdemServico> {
  const response = await fetch(`${getBaseUrl()}/api/os/${osId}/montador`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleResponse<OrdemServico>(response);
}

/** Descontos pendentes de aprovação (GET /api/festas/descontos/pendentes). */
export async function listDescontosPendentes(
  token: string
): Promise<FestaDescontoPendente[]> {
  const response = await fetch(
    `${getBaseUrl()}/api/festas/descontos/pendentes`,
    {
      headers: authHeaders(token),
      cache: "no-store",
    }
  );
  return handleResponse<FestaDescontoPendente[]>(response);
}

/** Aprova desconto (POST /api/festas/:id/desconto/aprovar). */
export async function aprovarDesconto(
  festaId: string,
  token: string
): Promise<FestaDescontoPendente> {
  const response = await fetch(
    `${getBaseUrl()}/api/festas/${festaId}/desconto/aprovar`,
    {
      method: "POST",
      headers: authHeaders(token),
    }
  );
  return handleResponse<FestaDescontoPendente>(response);
}

/** Recusa desconto (POST /api/festas/:id/desconto/recusar). */
export async function recusarDesconto(
  festaId: string,
  token: string
): Promise<FestaDescontoPendente> {
  const response = await fetch(
    `${getBaseUrl()}/api/festas/${festaId}/desconto/recusar`,
    {
      method: "POST",
      headers: authHeaders(token),
    }
  );
  return handleResponse<FestaDescontoPendente>(response);
}

/** Solicita desconto (POST /api/festas/:id/desconto). */
export async function solicitarDesconto(
  festaId: string,
  payload: SolicitarDescontoPayload,
  token: string
): Promise<FestaDescontoPendente> {
  const response = await fetch(`${getBaseUrl()}/api/festas/${festaId}/desconto`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleResponse<FestaDescontoPendente>(response);
}

// --- Atendimento / CRM inbox ---

export async function listConversas(
  token: string,
  params?: {
    status?: StatusConversa;
    canal?: CanalAtendimento;
    q?: string;
    minhas?: boolean;
  }
): Promise<ConversaListItem[]> {
  const search = new URLSearchParams();
  if (params?.status) search.set("status", params.status);
  if (params?.canal) search.set("canal", params.canal);
  if (params?.q) search.set("q", params.q);
  if (params?.minhas) search.set("minhas", "1");
  const qs = search.toString();
  const response = await fetch(
    `${getBaseUrl()}/api/atendimento${qs ? `?${qs}` : ""}`,
    { headers: authHeaders(token) }
  );
  return handleResponse<ConversaListItem[]>(response);
}

export async function getConversa(
  id: string,
  token: string
): Promise<ConversaDetalhe> {
  const response = await fetch(`${getBaseUrl()}/api/atendimento/${id}`, {
    headers: authHeaders(token),
  });
  return handleResponse<ConversaDetalhe>(response);
}

export async function getAtendimentoMetricas(
  token: string
): Promise<AtendimentoMetricas> {
  const response = await fetch(`${getBaseUrl()}/api/atendimento/metricas`, {
    headers: authHeaders(token),
  });
  return handleResponse<AtendimentoMetricas>(response);
}

export async function listAtendimentoVendedores(
  token: string
): Promise<AtendimentoVendedor[]> {
  const response = await fetch(`${getBaseUrl()}/api/atendimento/vendedores`, {
    headers: authHeaders(token),
  });
  return handleResponse<AtendimentoVendedor[]>(response);
}

export async function createConversaManual(
  payload: {
    contatoExterno: string;
    contatoNome?: string;
    canal?: CanalAtendimento;
    texto?: string;
    clienteId?: string;
  },
  token: string
): Promise<ConversaDetalhe> {
  const response = await fetch(`${getBaseUrl()}/api/atendimento`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleResponse<ConversaDetalhe>(response);
}

export async function replyConversa(
  id: string,
  texto: string,
  token: string
): Promise<ConversaDetalhe> {
  const response = await fetch(
    `${getBaseUrl()}/api/atendimento/${id}/mensagens`,
    {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ texto }),
    }
  );
  return handleResponse<ConversaDetalhe>(response);
}

export async function takeoverConversa(
  id: string,
  token: string
): Promise<ConversaDetalhe> {
  const response = await fetch(
    `${getBaseUrl()}/api/atendimento/${id}/takeover`,
    { method: "POST", headers: authHeaders(token) }
  );
  return handleResponse<ConversaDetalhe>(response);
}

export async function devolverConversaIa(
  id: string,
  token: string
): Promise<ConversaDetalhe> {
  const response = await fetch(
    `${getBaseUrl()}/api/atendimento/${id}/devolver-ia`,
    { method: "POST", headers: authHeaders(token) }
  );
  return handleResponse<ConversaDetalhe>(response);
}

export async function atribuirConversa(
  id: string,
  vendedorId: string | null,
  token: string
): Promise<ConversaDetalhe> {
  const response = await fetch(
    `${getBaseUrl()}/api/atendimento/${id}/atribuir`,
    {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ vendedorId }),
    }
  );
  return handleResponse<ConversaDetalhe>(response);
}

export async function fecharConversa(
  id: string,
  token: string
): Promise<ConversaDetalhe> {
  const response = await fetch(`${getBaseUrl()}/api/atendimento/${id}/fechar`, {
    method: "POST",
    headers: authHeaders(token),
  });
  return handleResponse<ConversaDetalhe>(response);
}

export async function updateConversaNotas(
  id: string,
  notasInternas: string | null,
  token: string
): Promise<ConversaDetalhe> {
  const response = await fetch(`${getBaseUrl()}/api/atendimento/${id}/notas`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify({ notasInternas }),
  });
  return handleResponse<ConversaDetalhe>(response);
}

export async function simularInboundAtendimento(
  payload: {
    telefone: string;
    texto: string;
    nome?: string;
    canal?: CanalAtendimento;
  },
  token: string
): Promise<{ conversa: ConversaDetalhe; agent: unknown }> {
  const response = await fetch(
    `${getBaseUrl()}/api/atendimento/simular-inbound`,
    {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }
  );
  return handleResponse<{ conversa: ConversaDetalhe; agent: unknown }>(
    response
  );
}

export async function listCatalogoBolas(
  token: string,
  all = false
): Promise<CatalogoBola[]> {
  const qs = all ? "?all=1" : "";
  const response = await fetch(`${getBaseUrl()}/api/bolas/catalogo${qs}`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  return handleResponse<CatalogoBola[]>(response);
}

export async function getBolasMarkup(
  token: string
): Promise<{ markupPercentual: number }> {
  const response = await fetch(`${getBaseUrl()}/api/bolas/markup`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  return handleResponse(response);
}

export async function upsertCatalogoBola(
  payload: {
    id?: string;
    nome: string;
    descricao?: string | null;
    valorTabela: number;
    ativo?: boolean;
    ordem?: number;
  },
  token: string
): Promise<CatalogoBola> {
  const response = await fetch(`${getBaseUrl()}/api/bolas/catalogo`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleResponse<CatalogoBola>(response);
}

export async function setCatalogoBolaAtivo(
  id: string,
  ativo: boolean,
  token: string
): Promise<CatalogoBola> {
  const response = await fetch(
    `${getBaseUrl()}/api/bolas/catalogo/${id}/ativo`,
    {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify({ ativo }),
    }
  );
  return handleResponse<CatalogoBola>(response);
}

export async function listPedidosBolas(
  token: string,
  options?: { from?: string; to?: string }
): Promise<PedidoBolas[]> {
  const params = new URLSearchParams();
  if (options?.from) params.set("from", options.from);
  if (options?.to) params.set("to", options.to);
  const qs = params.toString();
  const response = await fetch(
    `${getBaseUrl()}/api/bolas/pedidos${qs ? `?${qs}` : ""}`,
    {
      headers: authHeaders(token),
      cache: "no-store",
    }
  );
  return handleResponse<PedidoBolas[]>(response);
}

export async function getPedidoBolas(
  id: string,
  token: string
): Promise<PedidoBolas> {
  const response = await fetch(`${getBaseUrl()}/api/bolas/pedidos/${id}`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  return handleResponse<PedidoBolas>(response);
}

export async function createPedidoBolas(
  payload: CreatePedidoBolasPayload,
  token: string
): Promise<PedidoBolas> {
  const response = await fetch(`${getBaseUrl()}/api/bolas/pedidos`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleResponse<PedidoBolas>(response);
}

export async function updatePedidoBolas(
  id: string,
  payload: Record<string, unknown>,
  token: string
): Promise<PedidoBolas> {
  const response = await fetch(`${getBaseUrl()}/api/bolas/pedidos/${id}`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleResponse<PedidoBolas>(response);
}

export async function marcarRepasseBolas(
  id: string,
  payload: { pago?: boolean; obs?: string | null },
  token: string
): Promise<PedidoBolas> {
  const response = await fetch(
    `${getBaseUrl()}/api/bolas/pedidos/${id}/repasse`,
    {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }
  );
  return handleResponse<PedidoBolas>(response);
}

export async function getBolasFinanceiro(
  token: string
): Promise<BolasFinanceiroResumo> {
  const response = await fetch(`${getBaseUrl()}/api/bolas/financeiro`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  return handleResponse<BolasFinanceiroResumo>(response);
}

export async function listBolasCompras(
  token: string,
  dias = 14
): Promise<BolasComprasPedido[]> {
  const response = await fetch(
    `${getBaseUrl()}/api/bolas/compras?dias=${dias}`,
    {
      headers: authHeaders(token),
      cache: "no-store",
    }
  );
  return handleResponse<BolasComprasPedido[]>(response);
}

export async function addPedidoBolasCompra(
  pedidoId: string,
  payload: { descricao: string; quantidade?: string | null },
  token: string
): Promise<PedidoBolasCompra> {
  const response = await fetch(
    `${getBaseUrl()}/api/bolas/pedidos/${pedidoId}/compras`,
    {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }
  );
  return handleResponse<PedidoBolasCompra>(response);
}

export async function setPedidoBolasCompraComprado(
  compraId: string,
  comprado: boolean,
  token: string
): Promise<PedidoBolasCompra> {
  const response = await fetch(`${getBaseUrl()}/api/bolas/compras/${compraId}`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify({ comprado }),
  });
  return handleResponse<PedidoBolasCompra>(response);
}

export async function removePedidoBolasCompra(
  compraId: string,
  token: string
): Promise<void> {
  const response = await fetch(`${getBaseUrl()}/api/bolas/compras/${compraId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!response.ok && response.status !== 204) {
    await handleResponse(response);
  }
}
