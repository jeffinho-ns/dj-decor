import bcrypt from "bcryptjs";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

const SALT_ROUNDS = 10;

/** Senha temporária até a página de perfil permitir troca. */
const SENHA_TEMPORARIA = "@123Mudar";

interface SeedUser {
  nome: string;
  role: Role;
}

const seedUsers: SeedUser[] = [
  // SuperAdmin → Role.ADMIN
  { nome: "Jefferson", role: Role.ADMIN },
  { nome: "Jonathan", role: Role.ADMIN },
  // Gerentes
  { nome: "Debora", role: Role.GERENTE },
  { nome: "Suellem", role: Role.GERENTE },
  { nome: "Lorena", role: Role.GERENTE },
  // Vendedores
  { nome: "Vitória", role: Role.VENDEDOR },
  { nome: "Lais", role: Role.VENDEDOR },
  { nome: "Rodrigo", role: Role.VENDEDOR },
  // Montadores (placeholder)
  { nome: "Carlos", role: Role.MONTADOR },
  { nome: "Bruno", role: Role.MONTADOR },
];

const nomesEquipe = seedUsers.map((u) => u.nome);

async function main() {
  const senhaHash = await bcrypt.hash(SENHA_TEMPORARIA, SALT_ROUNDS);

  for (const seedUser of seedUsers) {
    const user = await prisma.user.upsert({
      where: { nome: seedUser.nome },
      update: {
        role: seedUser.role,
        senha: senhaHash,
        email: null,
      },
      create: {
        nome: seedUser.nome,
        role: seedUser.role,
        senha: senhaHash,
        email: null,
      },
    });

    console.log(`[seed] usuário pronto: ${user.nome} (${user.role}, id=${user.id})`);
  }

  // Remove contas antigas de demonstração que não fazem parte da equipe
  const removed = await prisma.user.deleteMany({
    where: {
      nome: { notIn: nomesEquipe },
      festas: { none: {} },
    },
  });

  if (removed.count > 0) {
    console.log(`[seed] removidos ${removed.count} usuário(s) fora da equipe (sem festas)`);
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
