import type { User } from "./auth";
import type { StatusDesconto } from "./desconto";

export type StatusFesta =
  | "ORCAMENTO"
  | "AGUARDANDO_PAGAMENTO"
  | "PAGO"
  | "FECHADO"
  | "EM_MONTAGEM"
  | "CONCLUIDO"
  | "CANCELADO";
export type TamanhoDecoracao = "P" | "M" | "G" | "GG";

export type TipoPagamento = "PIX" | "DINHEIRO" | "CARTAO" | "OUTRO";
export type StatusPagamento = "PENDENTE" | "CONFIRMADO" | "ESTORNADO";

export interface Cliente {
  id: string;
  nome: string;
  telefone: string;
}

export type NivelRisco = "BAIXO" | "MEDIO" | "ALTO";

export interface RiscoOrcamento {
  score: number;
  nivel: NivelRisco;
  fatores: string[];
}

export interface Festa {
  id: string;
  dataEvento: string;
  horarioMontagem: string;
  status: StatusFesta;
  valor: string | number;
  tema: string;
  tamanhoDecoracao: TamanhoDecoracao;
  itensExtras: string[];
  itensExtrasConcluidos: string[];
  kitCatalogo?: string | null;
  pegueEMonte?: boolean;
  observacoes?: string | null;
  notasInternas?: string | null;
  endereco: string;
  foraParacambi?: boolean;
  criadoEm: string;
  clienteId: string;
  vendedorId: string;
  cliente: Cliente;
  vendedor: User;
  risco?: RiscoOrcamento;
  descontoPercentual?: string | number | null;
  descontoStatus?: StatusDesconto;
  alertaCompraEstoque?: boolean;
  itensFaltaEstoque?: string[];
  montadorEquipeId?: string | null;
  desmontadorEquipeId?: string | null;
  montadorCarroProprio?: boolean;
  desmontadorCarroProprio?: boolean;
  montadorEquipe?: { id: string; nome: string; role?: string } | null;
  desmontadorEquipe?: { id: string; nome: string; role?: string } | null;
  pedidoBolas?: import("./bolas").PedidoBolasResumoFesta | null;
}

export interface Pagamento {
  id: string;
  valor: string | number;
  tipo: TipoPagamento;
  status: StatusPagamento;
  confirmadoEm: string | null;
  criadoEm: string;
  festaId: string;
  comprovanteMidiaId?: string | null;
  pixTxid?: string | null;
  pixQrCode?: string | null;
  pixCopiaCola?: string | null;
  pixExpiresAt?: string | null;
}

export interface CreatePagamentoPayload {
  valor: number;
  tipo?: TipoPagamento;
}

export interface ConfirmarPagamentoPayload {
  comprovanteMidiaId?: string | null;
}

export interface CreateFestaPayload {
  clienteId?: string;
  nomeCliente?: string;
  telefone?: string;
  origem?: string | null;
  tema: string;
  dataEvento: string;
  horarioMontagem: string;
  tamanhoDecoracao: TamanhoDecoracao;
  itensExtras?: string[];
  kitCatalogo?: string | null;
  pegueEMonte?: boolean;
  observacoes?: string | null;
  notasInternas?: string | null;
  endereco: string;
  foraParacambi?: boolean;
  valor: number;
  montadorEquipeId?: string | null;
  desmontadorEquipeId?: string | null;
  montadorCarroProprio?: boolean;
  desmontadorCarroProprio?: boolean;
  bolasItens?: {
    catalogoBolaId?: string | null;
    nome?: string;
    quantidade?: number;
    valorTabelaUnit?: number;
  }[];
  bolasCores?: string | null;
  bolasMidiaIds?: string[];
  temaMidiaIds?: string[];
}

export interface UpdateFestaPayload {
  tema?: string;
  dataEvento?: string;
  horarioMontagem?: string;
  tamanhoDecoracao?: TamanhoDecoracao;
  itensExtras?: string[];
  kitCatalogo?: string | null;
  pegueEMonte?: boolean;
  observacoes?: string | null;
  notasInternas?: string | null;
  endereco?: string;
  foraParacambi?: boolean;
  valor?: number;
  nomeCliente?: string;
  telefone?: string;
  montadorEquipeId?: string | null;
  desmontadorEquipeId?: string | null;
  montadorCarroProprio?: boolean;
  desmontadorCarroProprio?: boolean;
}
