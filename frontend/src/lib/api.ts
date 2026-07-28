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
import type { Contrato, MensagemWhatsApp } from "@/types/contrato";
import type { FestaDescontoPendente, SolicitarDescontoPayload } from "@/types/desconto";
import type {
  AgendaOs,
  AssignMontadorPayload,
  Montador,
} from "@/types/equipe";
import type { FinanceiroResumo } from "@/types/financeiro";
import type {
  CheckinPayload,
  FestaMontagemHoje,
  ItemRomaneio,
  OrdemServico,
  QrScanPayload,
  QrScanResult,
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

/** Festas/OS de montagem do dia (GET /api/os/today). */
export async function listOsHoje(token: string): Promise<FestaMontagemHoje[]> {
  const response = await fetch(`${getBaseUrl()}/api/os/today`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  return handleResponse<FestaMontagemHoje[]>(response);
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
    recebiveis: toNumber(
      raw.recebiveis ?? raw.recebiveisPendentes
    ),
    comissoesPendentes: toNumber(raw.comissoesPendentes),
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

/** Montadores disponíveis (GET /api/equipe/montadores). */
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
