import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";
import { Prisma, Role } from "@prisma/client";
import { env } from "../config/env";
import { prisma } from "../prisma/client";

export interface AuthUser {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
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

export class UserNotFoundError extends Error {
  constructor() {
    super("Usuário não encontrado");
    this.name = "UserNotFoundError";
  }
}

export class EmailInUseError extends Error {
  constructor() {
    super("E-mail já está em uso");
    this.name = "EmailInUseError";
  }
}

export interface UpdateProfileInput {
  email?: string | null;
  telefone?: string | null;
  novaSenha?: string;
}

function toAuthUser(user: {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  role: Role;
}): AuthUser {
  return {
    id: user.id,
    nome: user.nome,
    email: user.email,
    telefone: user.telefone,
    role: user.role,
  };
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

    if (!user.ativo) {
      throw new InvalidCredentialsError();
    }

    const authUser = toAuthUser(user);

    return { token: this.generateToken(authUser), user: authUser };
  }

  async getUserById(id: string): Promise<AuthUser | null> {
    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      return null;
    }

    return toAuthUser(user);
  }

  async updateProfile(
    userId: string,
    { email, telefone, novaSenha }: UpdateProfileInput
  ): Promise<AuthUser> {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new UserNotFoundError();
    }

    const data: {
      email?: string | null;
      telefone?: string | null;
      senha?: string;
    } = {};

    if (email !== undefined) {
      const emailNormalizado = email && email.trim().length > 0 ? email.trim() : null;
      data.email = emailNormalizado;
    }

    if (telefone !== undefined) {
      const tel =
        telefone && telefone.trim().length > 0 ? telefone.trim() : null;
      data.telefone = tel;
    }

    if (novaSenha !== undefined) {
      data.senha = await bcrypt.hash(novaSenha, 10);
    }

    try {
      const updated = await prisma.user.update({
        where: { id: userId },
        data,
      });

      return toAuthUser(updated);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new EmailInUseError();
      }
      throw error;
    }
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
