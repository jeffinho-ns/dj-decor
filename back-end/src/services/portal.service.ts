import { StatusFesta, StatusOS } from "@prisma/client";
import { env } from "../config/env";
import { prisma } from "../prisma/client";

export class PortalFestaNotFoundError extends Error {
  constructor(id: string) {
    super(`Festa não encontrada: ${id}`);
    this.name = "PortalFestaNotFoundError";
  }
}

export interface PortalTimelineStep {
  key: string;
  label: string;
  done: boolean;
  at?: string;
}

/** Status público da festa — sem valor, telefone ou dados internos. */
export interface PortalFestaStatus {
  tema: string;
  status: string;
  dataEvento: string;
  horarioMontagem: string;
  enderecoResumo: string;
  endereco: string;
  clienteNomePrimeiro: string;
  timeline: PortalTimelineStep[];
  montagemStatus?: string;
}

export interface PortalLinkResponse {
  url: string;
}

const FESTA_RANK: Record<StatusFesta, number> = {
  ORCAMENTO: 0,
  AGUARDANDO_PAGAMENTO: 1,
  PAGO: 2,
  FECHADO: 3,
  EM_MONTAGEM: 4,
  CONCLUIDO: 5,
  CANCELADO: -1,
};

const OS_RANK: Record<StatusOS, number> = {
  ABERTA: 0,
  ROMANEIO: 1,
  EM_TRANSITO: 2,
  CHECKIN: 3,
  FINALIZADA: 4,
};

function primeiroNome(nome: string): string {
  const part = nome.trim().split(/\s+/)[0];
  return part || nome.trim();
}

function enderecoResumo(endereco: string): string {
  const trimmed = endereco.trim();
  const commaIdx = trimmed.indexOf(",");
  if (commaIdx > 0) {
    return trimmed.slice(0, commaIdx).trim();
  }
  const dashIdx = trimmed.indexOf(" - ");
  if (dashIdx > 0) {
    return trimmed.slice(0, dashIdx).trim();
  }
  const parts = trimmed.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return parts[parts.length - 1]!;
  }
  return trimmed.length > 72 ? `${trimmed.slice(0, 69)}…` : trimmed;
}

function buildTimeline(
  festaStatus: StatusFesta,
  festa: { criadoEm: Date; horarioMontagem: Date },
  os: { status: StatusOS; checkinAt: Date | null } | null,
  pagamentoConfirmadoEm: Date | null
): PortalTimelineStep[] {
  const festaRank = FESTA_RANK[festaStatus] ?? 0;
  const osRank = os ? OS_RANK[os.status] : -1;
  const cancelled = festaStatus === StatusFesta.CANCELADO;

  const orcamentoDone =
    !cancelled && festaRank > FESTA_RANK.ORCAMENTO;

  const pagamentoDone = festaRank >= FESTA_RANK.PAGO;
  const pagamentoKey = pagamentoDone ? "PAGO" : "AGUARDANDO_PAGAMENTO";
  const pagamentoLabel = pagamentoDone
    ? "Pagamento confirmado"
    : festaRank >= FESTA_RANK.AGUARDANDO_PAGAMENTO
      ? "Aguardando pagamento"
      : "Pagamento";

  const fechadoDone = festaRank >= FESTA_RANK.FECHADO;

  let montagemKey = "EM_MONTAGEM";
  let montagemLabel = "Em montagem";
  if (os?.status === StatusOS.EM_TRANSITO) {
    montagemKey = "EM_TRANSITO";
    montagemLabel = "Equipe a caminho";
  } else if (os?.status === StatusOS.ROMANEIO) {
    montagemLabel = "Preparando montagem";
  }

  const montagemDone =
    festaRank >= FESTA_RANK.EM_MONTAGEM || osRank >= OS_RANK.ROMANEIO;
  const checkinDone = osRank >= OS_RANK.CHECKIN;
  const concluidoDone =
    festaRank >= FESTA_RANK.CONCLUIDO || os?.status === StatusOS.FINALIZADA;

  return [
    {
      key: "ORCAMENTO",
      label: "Orçamento",
      done: orcamentoDone,
      at: festa.criadoEm.toISOString(),
    },
    {
      key: pagamentoKey,
      label: pagamentoLabel,
      done: pagamentoDone && !cancelled,
      at: pagamentoConfirmadoEm?.toISOString(),
    },
    {
      key: "FECHADO",
      label: "Reserva fechada",
      done: fechadoDone && !cancelled,
    },
    {
      key: montagemKey,
      label: montagemLabel,
      done: montagemDone && !cancelled,
      at: montagemDone ? festa.horarioMontagem.toISOString() : undefined,
    },
    {
      key: "CHECKIN",
      label: "Equipe no local",
      done: checkinDone && !cancelled,
      at: os?.checkinAt?.toISOString(),
    },
    {
      key: "CONCLUIDO",
      label: "Decoração concluída",
      done: concluidoDone && !cancelled,
    },
  ];
}

export class PortalService {
  async getFestaStatus(festaId: string): Promise<PortalFestaStatus> {
    const festa = await prisma.festa.findUnique({
      where: { id: festaId },
      select: {
        status: true,
        dataEvento: true,
        horarioMontagem: true,
        tema: true,
        endereco: true,
        criadoEm: true,
        cliente: { select: { nome: true } },
        ordemServico: {
          select: {
            status: true,
            checkinAt: true,
          },
        },
        pagamentos: {
          where: { status: "CONFIRMADO" },
          orderBy: { confirmadoEm: "desc" },
          take: 1,
          select: { confirmadoEm: true },
        },
      },
    });

    if (!festa) {
      throw new PortalFestaNotFoundError(festaId);
    }

    const pagamentoConfirmadoEm =
      festa.pagamentos[0]?.confirmadoEm ?? null;

    return {
      tema: festa.tema,
      status: festa.status,
      dataEvento: festa.dataEvento.toISOString(),
      horarioMontagem: festa.horarioMontagem.toISOString(),
      enderecoResumo: enderecoResumo(festa.endereco),
      endereco: festa.endereco,
      clienteNomePrimeiro: primeiroNome(festa.cliente.nome),
      timeline: buildTimeline(
        festa.status,
        festa,
        festa.ordemServico,
        pagamentoConfirmadoEm
      ),
      montagemStatus: festa.ordemServico?.status,
    };
  }

  buildPortalUrl(festaId: string): PortalLinkResponse {
    return {
      url: `${env.FRONTEND_URL}/portal?id=${festaId}`,
    };
  }
}

export const portalService = new PortalService();
