import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";
import { Role } from "@prisma/client";
import { env } from "../config/env";
import { prisma } from "../prisma/client";

export interface AuthUser {
  id: string;
  nome: string;
  email: string | null;
  role: Role;
}

export interface JwtPayload {
  sub: string;
  nome: string;
  email: string | null;
  role: Role;
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super("Credenciais inválidas");
    this.name = "InvalidCredentialsError";
  }
}

export class AuthService {
  async login(nome: string, senha: string): Promise<{ token: string; user: AuthUser }> {
    const nomeNormalizado = nome.trim();

    const user = await prisma.user.findFirst({
      where: {
        nome: { equals: nomeNormalizado, mode: "insensitive" },
      },
    });

    if (!user) {
      throw new InvalidCredentialsError();
    }

    const senhaValida = await bcrypt.compare(senha, user.senha);

    if (!senhaValida) {
      throw new InvalidCredentialsError();
    }

    const authUser: AuthUser = {
      id: user.id,
      nome: user.nome,
      email: user.email,
      role: user.role,
    };

    return { token: this.generateToken(authUser), user: authUser };
  }

  async getUserById(id: string): Promise<AuthUser | null> {
    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      return null;
    }

    return { id: user.id, nome: user.nome, email: user.email, role: user.role };
  }

  generateToken(user: AuthUser): string {
    const payload: JwtPayload = {
      sub: user.id,
      nome: user.nome,
      email: user.email,
      role: user.role,
    };

    const options: SignOptions = {
      expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
    };

    return jwt.sign(payload, env.JWT_SECRET, options);
  }

  verifyToken(token: string): JwtPayload {
    return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
  }
}

export const authService = new AuthService();
