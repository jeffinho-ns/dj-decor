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
  };
}

export interface ItemRomaneio {
  id: string;
  descricao: string | null;
  carregado: boolean;
  conferido: boolean;
  osId: string;
  unidadeId: string | null;
  unidade?: UnidadeRomaneio | null;
}

export interface OrdemServico {
  id: string;
  status: StatusOS;
  checkinLat: number | null;
  checkinLng: number | null;
  checkinAt: string | null;
  romaneioConcluido: boolean;
  criadoEm: string;
  festaId: string;
  montadorId: string | null;
  festa: Festa;
  montador?: User | null;
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
