import bcrypt from "bcryptjs";
import {
  PrismaClient,
  Role,
  StatusFesta,
  StatusUnidade,
  TamanhoDecoracao,
} from "@prisma/client";

const prisma = new PrismaClient();

const SALT_ROUNDS = 10;

/** Senha temporária até a página de perfil permitir troca. */
const SENHA_TEMPORARIA = "@123Mudar";

interface SeedUser {
  nome: string;
  role: Role;
}

const seedUsers: SeedUser[] = [
  { nome: "Jefferson", role: Role.ADMIN },
  { nome: "Jonathan", role: Role.ADMIN },
  { nome: "Debora", role: Role.GERENTE },
  { nome: "Suellem", role: Role.GERENTE },
  { nome: "Lorena", role: Role.GERENTE },
  { nome: "Vitória", role: Role.VENDEDOR },
  { nome: "Lais", role: Role.VENDEDOR },
  { nome: "Rodrigo", role: Role.VENDEDOR },
  { nome: "Carlos", role: Role.MONTADOR },
  { nome: "Bruno", role: Role.MONTADOR },
];

const nomesEquipe = seedUsers.map((u) => u.nome);

const seedProdutos = [
  {
    nome: "Mesa Provençal Branca",
    categoria: "Móveis",
    valorAluguel: 180,
    tema: "Provençal",
    requerQr: true,
    unidades: [
      { codigoQr: "DJ-MESA-001", etiqueta: "Mesa #1" },
      { codigoQr: "DJ-MESA-002", etiqueta: "Mesa #2" },
    ],
  },
  {
    nome: "Cadeira Tiffany Dourada",
    categoria: "Móveis",
    valorAluguel: 25,
    tema: null,
    requerQr: true,
    unidades: [
      { codigoQr: "DJ-CAD-001", etiqueta: "Tiffany #1" },
      { codigoQr: "DJ-CAD-002", etiqueta: "Tiffany #2" },
    ],
  },
  {
    nome: "Arco de Balões Premium",
    categoria: "Decoração",
    valorAluguel: 350,
    tema: "Infantil",
    requerQr: false,
    unidades: [
      { codigoQr: "DJ-ARCO-001", etiqueta: "Arco A" },
      { codigoQr: "DJ-ARCO-002", etiqueta: "Arco B" },
    ],
  },
] as const;

async function seedUsuarios() {
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

async function seedCatalogoEstoque() {
  for (const item of seedProdutos) {
    const existente = await prisma.produto.findFirst({
      where: { nome: item.nome },
      include: { unidades: true },
    });

    if (existente) {
      for (const u of item.unidades) {
        await prisma.unidadeProduto.upsert({
          where: { codigoQr: u.codigoQr },
          update: {
            etiqueta: u.etiqueta,
            produtoId: existente.id,
            status: StatusUnidade.DISPONIVEL,
          },
          create: {
            codigoQr: u.codigoQr,
            etiqueta: u.etiqueta,
            produtoId: existente.id,
            status: StatusUnidade.DISPONIVEL,
          },
        });
      }
      console.log(`[seed] produto atualizado: ${existente.nome} (${existente.id})`);
      continue;
    }

    const produto = await prisma.produto.create({
      data: {
        nome: item.nome,
        categoria: item.categoria,
        valorAluguel: item.valorAluguel,
        tema: item.tema,
        requerQr: item.requerQr,
        ativo: true,
        unidades: {
          create: item.unidades.map((u) => ({
            codigoQr: u.codigoQr,
            etiqueta: u.etiqueta,
            status: StatusUnidade.DISPONIVEL,
          })),
        },
      },
      include: { unidades: true },
    });

    console.log(
      `[seed] produto criado: ${produto.nome} com ${produto.unidades.length} unidade(s)`
    );
  }
}

const DEMO_CLIENTE_TELEFONE = "11999990001";
const DEMO_FESTA_TEMA = "Aniversário Infantil — demo seed";

async function seedFestaDemo() {
  const vendedor = await prisma.user.findUnique({ where: { nome: "Vitória" } });
  if (!vendedor) {
    console.log("[seed] festa demo ignorada: vendedor Vitória não encontrado");
    return;
  }

  let cliente = await prisma.cliente.findFirst({
    where: { telefone: DEMO_CLIENTE_TELEFONE },
  });

  if (!cliente) {
    cliente = await prisma.cliente.create({
      data: {
        nome: "Maria Silva (demo)",
        telefone: DEMO_CLIENTE_TELEFONE,
      },
    });
  }

  const existente = await prisma.festa.findFirst({
    where: { clienteId: cliente.id, tema: DEMO_FESTA_TEMA },
  });

  if (existente) {
    console.log(`[seed] festa demo já existe: ${existente.id} (${existente.status})`);
    return;
  }

  const dataEvento = new Date();
  dataEvento.setDate(dataEvento.getDate() + 14);
  dataEvento.setHours(18, 0, 0, 0);

  const horarioMontagem = new Date(dataEvento);
  horarioMontagem.setHours(14, 0, 0, 0);

  const festa = await prisma.festa.create({
    data: {
      dataEvento,
      horarioMontagem,
      status: StatusFesta.AGUARDANDO_PAGAMENTO,
      valor: 850,
      tema: DEMO_FESTA_TEMA,
      tamanhoDecoracao: TamanhoDecoracao.M,
      itensExtras: ["Balões extras", "Nome personalizado"],
      endereco: "Rua das Flores, 100 — São Paulo, SP",
      clienteId: cliente.id,
      vendedorId: vendedor.id,
    },
  });

  console.log(
    `[seed] festa demo criada: ${festa.id} (${festa.status}, vendedor=${vendedor.nome})`
  );
}

async function main() {
  await seedUsuarios();
  await seedCatalogoEstoque();
  await seedFestaDemo();
}

main()
  .catch((error) => {
    console.error("[seed] erro ao popular dados:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
