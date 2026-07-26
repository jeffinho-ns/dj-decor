export type Role = "ADMIN" | "GERENTE" | "VENDEDOR";

export interface User {
  id: string;
  nome: string;
  email: string;
  role: Role;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface MeResponse {
  user: User;
}
