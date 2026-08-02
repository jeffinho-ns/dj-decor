import type { StatusFesta } from "./festa";

export interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  observacoes?: string | null;
  origem?: string | null;
  tags: string[];
  criadoEm: string;
  atualizadoEm: string;
}

export interface ClienteListItem extends Cliente {
  totalFestas: number;
  ultimaFesta: string | null;
}

export interface ClienteFestaResumo {
  id: string;
  tema: string;
  dataEvento: string;
  status: StatusFesta;
  valor: string | number;
}

export interface ClienteDetalhe extends Cliente {
  totalFestas: number;
  festas: ClienteFestaResumo[];
}

export interface CreateClientePayload {
  nome: string;
  telefone: string;
  observacoes?: string | null;
  origem?: string | null;
  tags?: string[];
}

export interface UpdateClientePayload {
  nome?: string;
  telefone?: string;
  observacoes?: string | null;
  origem?: string | null;
  tags?: string[];
}

export const ORIGENS_CLIENTE = [
  "Instagram",
  "Indicação",
  "WhatsApp",
  "Salão",
  "Google",
  "Outro",
] as const;

export type OrigemCliente = (typeof ORIGENS_CLIENTE)[number];
