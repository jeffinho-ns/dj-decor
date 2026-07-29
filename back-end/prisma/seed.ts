import bcrypt from "bcryptjs";
import {
  PrismaClient,
  Role,
  StatusFesta,
  StatusOS,
  StatusUnidade,
  TamanhoDecoracao,
} from "@prisma/client";
import { INVENTARIO_CATALOGO } from "../src/catalog/inventario";

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
  for (const item of INVENTARIO_CATALOGO) {
    let produto = await prisma.produto.findFirst({
      where: { nome: item.nome },
      include: { unidades: true },
    });

    if (!produto) {
      produto = await prisma.produto.create({
        data: {
          nome: item.nome,
          categoria: item.categoria,
          valorAluguel: item.valorAluguel,
          requerQr: item.requerQr ?? false,
          ativo: true,
        },
        include: { unidades: true },
      });
      console.log(`[seed] produto criado: ${produto.nome}`);
    } else {
      await prisma.produto.update({
        where: { id: produto.id },
        data: {
          categoria: item.categoria,
          valorAluguel: item.valorAluguel,
          requerQr: item.requerQr ?? produto.requerQr,
          ativo: true,
        },
      });
    }

    const faltam = Math.max(0, item.quantidadePadrao - produto.unidades.length);
    for (let i = 0; i < faltam; i++) {
      const seq = produto.unidades.length + i + 1;
      const codigoQr = `DJ-${item.chave.toUpperCase()}-${String(seq).padStart(3, "0")}`;
      try {
        await prisma.unidadeProduto.create({
          data: {
            produtoId: produto.id,
            codigoQr,
            etiqueta: `${item.nome} #${seq}`,
            status: StatusUnidade.DISPONIVEL,
          },
        });
      } catch {
        await prisma.unidadeProduto.create({
          data: {
            produtoId: produto.id,
            codigoQr: `${codigoQr}-${Date.now().toString(36)}`,
            etiqueta: `${item.nome} #${seq}`,
            status: StatusUnidade.DISPONIVEL,
          },
        });
      }
    }

    if (faltam > 0) {
      console.log(
        `[seed] ${item.nome}: +${faltam} unidade(s) (meta ${item.quantidadePadrao})`
      );
    }
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

const DEMO_ROMANEIO_ITENS = [
  "Arco de Balões Premium — kit principal",
  "Mesa Provençal + 6 cadeiras Tiffany",
] as const;

async function seedOrdemServicoDemo() {
  const festa = await prisma.festa.findFirst({
    where: { tema: DEMO_FESTA_TEMA },
  });

  if (!festa) {
    console.log("[seed] OS demo ignorada: festa demo não encontrada");
    return;
  }

  const montador = await prisma.user.findUnique({ where: { nome: "Carlos" } });

  let os = await prisma.ordemServico.findUnique({
    where: { festaId: festa.id },
  });

  if (!os) {
    os = await prisma.ordemServico.create({
      data: {
        festaId: festa.id,
        status: StatusOS.ABERTA,
        montadorId: montador?.id ?? null,
      },
    });
    console.log(`[seed] OS demo criada: ${os.id} (ABERTA, festa=${festa.id})`);
  } else {
    console.log(`[seed] OS demo já existe: ${os.id} (${os.status})`);
  }

  for (const descricao of DEMO_ROMANEIO_ITENS) {
    const itemExistente = await prisma.itemRomaneio.findFirst({
      where: { osId: os.id, descricao },
    });

    if (itemExistente) {
      continue;
    }

    await prisma.itemRomaneio.create({
      data: {
        osId: os.id,
        descricao,
      },
    });
    console.log(`[seed] item romaneio demo: "${descricao}"`);
  }
}

async function main() {
  await seedUsuarios();
  await seedCatalogoEstoque();
  await seedFestaDemo();
  await seedOrdemServicoDemo();
}

main()
  .catch((error) => {
    console.error("[seed] erro ao popular dados:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
