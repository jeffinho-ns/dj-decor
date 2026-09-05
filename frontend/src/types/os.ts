import type { User } from "./auth";
import type { Cliente, Festa, StatusFesta } from "./festa";

export type StatusOS =
  | "ABERTA"
  | "ROMANEIO"
  | "EM_TRANSITO"
  | "CHECKIN"
  | "FINALIZADA";

export type TipoMovimentacao = "SAIDA_GALPAO" | "ENTRADA_RETORNO";

export interface UnidadeRomaneio {
  id: string;
  codigoQr: string;
  etiqueta: string | null;
  produto?: {
    id: string;
    nome: string;
    categoria: string;
    requerQr?: boolean;
  };
}

export interface ItemRomaneio {
  id: string;
  descricao: string | null;
  carregado: boolean;
  conferido: boolean;
  montado: boolean;
  osId: string;
  unidadeId: string | null;
  fotoMidiaId: string | null;
  unidade?: UnidadeRomaneio | null;
}

export interface OrdemServico {
  id: string;
  status: StatusOS;
  checkinLat: number | null;
  checkinLng: number | null;
  checkinAt: string | null;
  romaneioConcluido: boolean;
  montagemLocalConcluida: boolean;
  /** Presente quando a foto da montagem já foi enviada. */
  fotoFinalMidiaId?: string | null;
  criadoEm: string;
  festaId: string;
  montadorId: string | null;
  desmontadorId?: string | null;
  montadorCarroProprio?: boolean;
  desmontadorCarroProprio?: boolean;
  festa: Festa;
  montador?: User | null;
  desmontador?: User | null;
  itensRomaneio: ItemRomaneio[];
}

/** Resposta de GET /api/os/today — festas do dia com OS aninhada. */
export interface FestaMontagemHoje {
  id: string;
  dataEvento: string;
  horarioMontagem: string;
  status: StatusFesta;
  tema: string;
  tamanhoDecoracao: string;
  endereco: string;
  cliente: Cliente;
  ordemServico: OrdemServico | null;
}

export interface UpdateRomaneioItemPayload {
  carregado?: boolean;
  conferido?: boolean;
  montado?: boolean;
  fotoMidiaId?: string | null;
}

/** Resposta de GET /api/os/today/rota — ordem sugerida de visitas. */
export interface RotaDiaItem {
  ordem: number;
  osId: string;
  festaId: string;
  endereco: string;
  horarioMontagem: string;
  clienteNome: string;
  tema: string;
  checkinLat: number | null;
  checkinLng: number | null;
  criterio: "horario" | "proximidade";
}

/** Status público do portal do cliente. */
export interface PortalTimelineStep {
  key: string;
  label: string;
  done: boolean;
  at?: string;
}

export interface PortalGaleriaItem {
  id: string;
  tipo: string;
  mimeType: string;
  filename: string | null;
}

export interface MontagemGaleriaItem {
  id: string;
  mimeType: string;
  tamanho: number;
  tipo: string;
  filename: string | null;
  storagePath: string | null;
  visivelPortal: boolean;
  ordem: number;
  festaId: string | null;
  uploadedById: string | null;
  criadoEm: string;
}

export interface PortalPagamentoItem {
  id: string;
  valor: number;
  tipo: string;
  status: string;
  criadoEm: string;
  confirmadoEm: string | null;
}

export interface PortalFinanceiro {
  valorTotal: number;
  valorPago: number;
  valorFalta: number;
  quitado: boolean;
  lancamentos: PortalPagamentoItem[];
}

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
  itensExtras?: string[];
  kitCatalogo?: string | null;
  pegueEMonte?: boolean;
  galeria?: PortalGaleriaItem[];
  podeAssinar?: boolean;
  assinaturaClienteEm?: string | null;
  avaliacaoNota?: number | null;
  financeiro?: PortalFinanceiro;
}

export interface PortalLinkResponse {
  url: string;
  token?: string;
}

export interface CheckinPayload {
  lat: number;
  lng: number;
}

export interface QrScanPayload {
  codigoQr: string;
  tipo: TipoMovimentacao;
  osId?: string;
  lat?: number;
  lng?: number;
}

export interface QrScanResult {
  movimentacao: {
    id: string;
    tipo: TipoMovimentacao;
    lat: number | null;
    lng: number | null;
    criadoEm: string;
    unidade: UnidadeRomaneio & {
      produto?: { id: string; nome: string };
    };
  };
  unidadeStatus: string;
}
