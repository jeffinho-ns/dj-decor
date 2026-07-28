import type { User } from "./auth";

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
  endereco: string;
  criadoEm: string;
  clienteId: string;
  vendedorId: string;
  cliente: Cliente;
  vendedor: User;
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
}

export interface CreatePagamentoPayload {
  valor: number;
  tipo?: TipoPagamento;
}

export interface ConfirmarPagamentoPayload {
  comprovanteMidiaId?: string | null;
}

export interface CreateFestaPayload {
  nomeCliente: string;
  telefone: string;
  tema: string;
  dataEvento: string;
  horarioMontagem: string;
  tamanhoDecoracao: TamanhoDecoracao;
  itensExtras?: string[];
  kitCatalogo?: string | null;
  pegueEMonte?: boolean;
  observacoes?: string | null;
  endereco: string;
  valor: number;
}
