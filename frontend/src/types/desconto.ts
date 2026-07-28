import type { User } from "./auth";
import type { Cliente, StatusFesta } from "./festa";

export type StatusDesconto = "NENHUM" | "PENDENTE" | "APROVADO" | "RECUSADO";

export interface FestaDescontoPendente {
  id: string;
  dataEvento: string;
  horarioMontagem: string;
  status: StatusFesta;
  valor: string | number;
  valorOriginal: string | number | null;
  descontoPercentual: string | number | null;
  descontoStatus: StatusDesconto;
  tema: string;
  endereco: string;
  cliente: Cliente;
  vendedor: User;
  descontoSolicitadoPor: User | null;
  descontoAprovadoPor: User | null;
}

export interface SolicitarDescontoPayload {
  percentual: number;
}
