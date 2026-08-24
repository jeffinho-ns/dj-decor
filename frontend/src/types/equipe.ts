import type { Cliente, StatusFesta } from "./festa";
import type { Role } from "./auth";

export interface Montador {
  id: string;
  nome: string;
  role?: Role;
}

export interface EquipeFestaValue {
  montadorEquipeId: string | null;
  desmontadorEquipeId: string | null;
  montadorCarroProprio: boolean;
  desmontadorCarroProprio: boolean;
}

export interface AgendaOsFesta {
  id: string;
  dataEvento: string;
  horarioMontagem: string;
  tema: string;
  endereco: string;
  status: StatusFesta;
  notasInternas?: string | null;
  cliente: Cliente;
}

export interface AgendaOs {
  id: string;
  status: string;
  montadorId: string | null;
  desmontadorId?: string | null;
  montadorCarroProprio?: boolean;
  desmontadorCarroProprio?: boolean;
  festa: AgendaOsFesta;
  montador: Montador | null;
  desmontador?: Montador | null;
}

export interface AssignMontadorPayload {
  montadorId?: string | null;
  desmontadorId?: string | null;
  montadorCarroProprio?: boolean;
  desmontadorCarroProprio?: boolean;
}
