import type { Cliente, StatusFesta } from "./festa";

export interface Montador {
  id: string;
  nome: string;
}

export interface AgendaOsFesta {
  id: string;
  dataEvento: string;
  horarioMontagem: string;
  tema: string;
  endereco: string;
  status: StatusFesta;
  cliente: Cliente;
}

export interface AgendaOs {
  id: string;
  status: string;
  montadorId: string | null;
  desmontadorId?: string | null;
  festa: AgendaOsFesta;
  montador: Montador | null;
  desmontador?: Montador | null;
}

export interface AssignMontadorPayload {
  montadorId?: string | null;
  desmontadorId?: string | null;
}
