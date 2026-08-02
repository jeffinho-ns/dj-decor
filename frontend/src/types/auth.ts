export type Role = "ADMIN" | "GERENTE" | "VENDEDOR" | "MONTADOR";

export interface User {
  id: string;
  nome: string;
  email: string | null;
  telefone?: string | null;
  role: Role;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface MeResponse {
  user: User;
}

export interface UpdatePerfilPayload {
  email?: string | null;
  telefone?: string | null;
  novaSenha?: string;
}

export interface UpdatePerfilResponse {
  user: User;
}
