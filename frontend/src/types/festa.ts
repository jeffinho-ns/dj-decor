import type { User } from "./auth";

export type StatusFesta = "ORCAMENTO" | "FECHADO" | "CONCLUIDO";

export interface Cliente {
  id: string;
  nome: string;
  telefone: string;
}

export interface Festa {
  id: string;
  dataEvento: string;
  status: StatusFesta;
  valor: string | number;
  tema: string;
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
  endereco: string;
  valor: number;
}
