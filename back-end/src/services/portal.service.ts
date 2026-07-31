import { StatusFesta, StatusOS, TipoMidia } from "@prisma/client";
import { env } from "../config/env";
import { generatePortalToken } from "../lib/portal-token";
import { prisma } from "../prisma/client";
import {
  MidiaValidationError,
  midiasService,
} from "./midias.service";

export class PortalFestaNotFoundError extends Error {
  constructor(token: string) {
    super(`Portal não encontrado: ${token}`);
    this.name = "PortalFestaNotFoundError";
  }
}

export interface PortalTimelineStep {
  key: string;
  label: string;
  done: boolean;
  at?: string;
}

export interface PortalGaleriaItem {
  id: string;
  tipo: TipoMidia;
  mimeType: string;
  filename: string | null;
}

/** Status público da festa — sem telefone do cliente. */
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
  itensExtras: string[];
  kitCatalogo: string | null;
  pegueEMonte: boolean;
  galeria: PortalGaleriaItem[];
  podeAssinar: boolean;
  assinaturaClienteEm: string | null;
  avaliacaoNota: number | null;
}

export interface PortalLinkResponse {
  url: string;
  token: string;
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

const GALERIA_TIPOS: TipoMidia[] = [
  TipoMidia.REFERENCIA_FESTA,
  TipoMidia.CLIENTE_REFERENCIA,
  TipoMidia.MONTAGEM_FINAL,
];

function primeiroNome(nome: string): string {
  const part = nome.trim().split(/\s+/)[0];
  return part || nome.trim();
}

function enderecoResumo(endereco: string): string {
  const trimmed = endereco.trim();
  const commaIdx = trimmed.indexOf(",");
  if (commaIdx > 0) return trimmed.slice(0, commaIdx).trim();
  const dashIdx = trimmed.indexOf(" - ");
  if (dashIdx > 0) return trimmed.slice(0, dashIdx).trim();
  return trimmed.length > 72 ? `${trimmed.slice(0, 69)}…` : trimmed;
}

function buildTimeline(
  festaStatus: StatusFesta,
  festa: { criadoEm: Date; horarioMontagem: Date },
  os: {
    status: StatusOS;
    checkinAt: Date | null;
    romaneioConcluido: boolean;
    montagemLocalConcluida: boolean;
  } | null,
  pagamentoConfirmadoEm: Date | null
): PortalTimelineStep[] {
  const festaRank = FESTA_RANK[festaStatus] ?? 0;
  const osRank = os ? OS_RANK[os.status] : -1;
  const cancelled = festaStatus === StatusFesta.CANCELADO;

  const pagamentoDone = festaRank >= FESTA_RANK.PAGO;
  const pagamentoKey = pagamentoDone ? "PAGO" : "AGUARDANDO_PAGAMENTO";
  const pagamentoLabel = pagamentoDone
    ? "Pagamento confirmado"
    : festaRank >= FESTA_RANK.AGUARDANDO_PAGAMENTO
      ? "Aguardando pagamento"
      : "Pagamento";

  let montagemKey = "EM_MONTAGEM";
  let montagemLabel = "Em montagem";
  if (
    os?.montagemLocalConcluida ||
    os?.status === StatusOS.FINALIZADA ||
    festaRank >= FESTA_RANK.CONCLUIDO
  ) {
    montagemKey = "CONCLUIDO";
    montagemLabel = "Decoração concluída";
  } else if (os?.checkinAt || os?.status === StatusOS.CHECKIN) {
    montagemKey = "CHECKIN";
    montagemLabel = "Equipe no local";
  } else if (os?.status === StatusOS.EM_TRANSITO) {
    montagemKey = "EM_TRANSITO";
    montagemLabel = "Equipe a caminho";
  } else if (
    os?.status === StatusOS.ROMANEIO ||
    (os && !os.romaneioConcluido)
  ) {
    montagemKey = "ROMANEIO";
    montagemLabel = "Separando material";
  }

  return [
    {
      key: "ORCAMENTO",
      label: "Orçamento",
      done: !cancelled && festaRank > FESTA_RANK.ORCAMENTO,
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
      done: festaRank >= FESTA_RANK.FECHADO && !cancelled,
    },
    {
      key: montagemKey,
      label: montagemLabel,
      done:
        (festaRank >= FESTA_RANK.EM_MONTAGEM || osRank >= OS_RANK.ROMANEIO) &&
        !cancelled,
      at:
        festaRank >= FESTA_RANK.EM_MONTAGEM || osRank >= OS_RANK.ROMANEIO
          ? festa.horarioMontagem.toISOString()
          : undefined,
    },
    {
      key: "CHECKIN",
      label: "Equipe no local",
      done: osRank >= OS_RANK.CHECKIN && !cancelled,
      at: os?.checkinAt?.toISOString(),
    },
    {
      key: "CONCLUIDO",
      label: "Decoração concluída",
      done:
        (festaRank >= FESTA_RANK.CONCLUIDO ||
          os?.status === StatusOS.FINALIZADA) &&
        !cancelled,
    },
  ];
}

export class PortalService {
  async ensurePortalToken(festaId: string): Promise<string> {
    const festa = await prisma.festa.findUnique({
      where: { id: festaId },
      select: { id: true, portalToken: true },
    });
    if (!festa) throw new PortalFestaNotFoundError(festaId);
    if (festa.portalToken) return festa.portalToken;

    const token = generatePortalToken();
    await prisma.festa.update({
      where: { id: festaId },
      data: { portalToken: token },
    });
    return token;
  }

  async getFestaByToken(token: string) {
    const festa = await prisma.festa.findUnique({
      where: { portalToken: token },
      select: {
        id: true,
        status: true,
        dataEvento: true,
        horarioMontagem: true,
        tema: true,
        endereco: true,
        criadoEm: true,
        itensExtras: true,
        kitCatalogo: true,
        pegueEMonte: true,
        assinaturaClienteEm: true,
        avaliacaoNota: true,
        cliente: { select: { nome: true } },
        ordemServico: {
          select: {
            status: true,
            checkinAt: true,
            romaneioConcluido: true,
            montagemLocalConcluida: true,
          },
        },
        pagamentos: {
          where: { status: "CONFIRMADO" },
          orderBy: { confirmadoEm: "desc" },
          take: 1,
          select: { confirmadoEm: true },
        },
        midias: {
          where: { tipo: { in: GALERIA_TIPOS } },
          select: {
            id: true,
            tipo: true,
            mimeType: true,
            filename: true,
          },
          orderBy: { criadoEm: "desc" },
        },
      },
    });

    if (!festa) throw new PortalFestaNotFoundError(token);
    return festa;
  }

  async getFestaStatusByToken(token: string): Promise<PortalFestaStatus> {
    const festa = await this.getFestaByToken(token);
    const pagamentoConfirmadoEm = festa.pagamentos[0]?.confirmadoEm ?? null;

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
      itensExtras: festa.itensExtras,
      kitCatalogo: festa.kitCatalogo,
      pegueEMonte: festa.pegueEMonte,
      galeria: festa.midias,
      podeAssinar:
        !festa.assinaturaClienteEm &&
        festa.status !== StatusFesta.CANCELADO &&
        festa.status !== StatusFesta.ORCAMENTO,
      assinaturaClienteEm: festa.assinaturaClienteEm?.toISOString() ?? null,
      avaliacaoNota: festa.avaliacaoNota,
    };
  }

  async getMidiaForToken(token: string, midiaId: string) {
    const festa = await prisma.festa.findUnique({
      where: { portalToken: token },
      select: { id: true },
    });
    if (!festa) throw new PortalFestaNotFoundError(token);

    const midia = await midiasService.getById(midiaId);
    if (midia.festaId !== festa.id) {
      throw new PortalFestaNotFoundError(token);
    }
    return midia;
  }

  async uploadClienteMidia(
    token: string,
    file: Express.Multer.File
  ) {
    const festa = await prisma.festa.findUnique({
      where: { portalToken: token },
      select: { id: true },
    });
    if (!festa) throw new PortalFestaNotFoundError(token);

    const validated = midiasService.validateFile(file);
    return midiasService.create(
      validated,
      { tipo: TipoMidia.CLIENTE_REFERENCIA, festaId: festa.id },
      null
    );
  }

  async buildPortalLink(festaId: string): Promise<PortalLinkResponse> {
    const token = await this.ensurePortalToken(festaId);
    return {
      token,
      url: `${env.FRONTEND_URL}/portal?t=${encodeURIComponent(token)}`,
    };
  }

  /** Compatibilidade: resolve festaId antigo → token seguro. */
  async resolveLegacyFestaId(festaId: string): Promise<PortalLinkResponse> {
    const festa = await prisma.festa.findUnique({
      where: { id: festaId },
      select: { id: true },
    });
    if (!festa) throw new PortalFestaNotFoundError(festaId);
    return this.buildPortalLink(festa.id);
  }

  async assinar(token: string, file: Express.Multer.File) {
    const festa = await prisma.festa.findUnique({
      where: { portalToken: token },
      select: { id: true, assinaturaClienteEm: true, status: true },
    });
    if (!festa) throw new PortalFestaNotFoundError(token);
    if (festa.assinaturaClienteEm) {
      throw new MidiaValidationError("Contrato já assinado");
    }

    const validated = midiasService.validateFile(file);
    await midiasService.create(
      validated,
      { tipo: TipoMidia.ASSINATURA_CLIENTE, festaId: festa.id },
      null
    );
    await prisma.festa.update({
      where: { id: festa.id },
      data: { assinaturaClienteEm: new Date() },
    });
    return this.getFestaStatusByToken(token);
  }

  async avaliar(token: string, nota: number, comentario?: string | null) {
    const festa = await prisma.festa.findUnique({
      where: { portalToken: token },
      select: { id: true },
    });
    if (!festa) throw new PortalFestaNotFoundError(token);
    if (!Number.isInteger(nota) || nota < 1 || nota > 5) {
      throw new MidiaValidationError("Nota deve ser entre 1 e 5");
    }
    await prisma.festa.update({
      where: { id: festa.id },
      data: {
        avaliacaoNota: nota,
        avaliacaoComentario: comentario?.trim() || null,
        avaliacaoEm: new Date(),
      },
    });
    return this.getFestaStatusByToken(token);
  }
}

export const portalService = new PortalService();
