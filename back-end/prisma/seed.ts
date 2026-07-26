import bcrypt from "bcryptjs";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

const SALT_ROUNDS = 10;

interface SeedUser {
  email: string;
  senha: string;
  role: Role;
  nome: string;
}

const seedUsers: SeedUser[] = [
  { email: "admin@djdecor.com", senha: "admin123", role: Role.ADMIN, nome: "Admin DJ" },
  { email: "gerente@djdecor.com", senha: "gerente123", role: Role.GERENTE, nome: "Gerente DJ" },
  { email: "vendedor@djdecor.com", senha: "vendedor123", role: Role.VENDEDOR, nome: "Vendedor DJ" },
];

async function main() {
  for (const seedUser of seedUsers) {
    const senhaHash = await bcrypt.hash(seedUser.senha, SALT_ROUNDS);

    const user = await prisma.user.upsert({
      where: { email: seedUser.email },
      update: {
        nome: seedUser.nome,
        role: seedUser.role,
        senha: senhaHash,
      },
      create: {
        email: seedUser.email,
        nome: seedUser.nome,
        role: seedUser.role,
        senha: senhaHash,
      },
    });

    console.log(`[seed] usuário pronto: ${user.email} (${user.role}, id=${user.id})`);
  }
}

main()
  .catch((error) => {
    console.error("[seed] erro ao popular usuários:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
