import type { User } from "./auth";

export type StatusFesta = "ORCAMENTO" | "FECHADO" | "CONCLUIDO";
export type TamanhoDecoracao = "P" | "M" | "G" | "GG";

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
