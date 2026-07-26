export type Role = "ADMIN" | "GERENTE" | "VENDEDOR" | "MONTADOR";

export interface User {
  id: string;
  nome: string;
  email: string | null;
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
  senhaAtual?: string;
  novaSenha?: string;
}

export interface UpdatePerfilResponse {
  user: User;
}
