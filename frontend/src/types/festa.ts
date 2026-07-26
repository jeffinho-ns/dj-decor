export type StatusFesta = "ORCAMENTO" | "FECHADO" | "CONCLUIDO";

export interface Cliente {
  id: string;
  nome: string;
  telefone: string;
}

export interface VendedorResumo {
  id: string;
  nome: string;
  email: string;
  role: "ADMIN" | "GERENTE" | "VENDEDOR";
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
  vendedor: VendedorResumo;
}

export interface CreateFestaPayload {
  nomeCliente: string;
  telefone: string;
  tema: string;
  dataEvento: string;
  endereco: string;
  valor: number;
}
