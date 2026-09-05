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
  /** Gerente/vendedora — comissão só nas festas que ela vender (não no split de sócia). */
  { nome: "Suellem", role: Role.GERENTE },
  /** Sócia — % no geral das festas quitadas. */
  { nome: "Lorena", role: Role.GERENTE },
  { nome: "Vitória", role: Role.VENDEDOR },
  { nome: "Lais", role: Role.VENDEDOR },
  { nome: "Rodrigo", role: Role.VENDEDOR },
  { nome: "Carlos", role: Role.MONTADOR },
  { nome: "Bruno", role: Role.MONTADOR },
  { nome: "Marcelo", role: Role.BOLISTA },
];

const nomesEquipe = seedUsers.map((u) => u.nome);

async function seedUsuarios() {
  const senhaHash = await bcrypt.hash(SENHA_TEMPORARIA, SALT_ROUNDS);

  for (const seedUser of seedUsers) {
    /** Lorena permanece sócia no cargo/visual; não recebe mais fatia de sociedade no split. */
    const ehSocia = seedUser.nome === "Lorena";
    const ehDona = seedUser.nome === "Debora";
    const user = await prisma.user.upsert({
      where: { nome: seedUser.nome },
      update: {
        role: seedUser.role,
        ativo: true,
        ehSocia,
        ehDona,
        sociaDesde: null,
      },
      create: {
        nome: seedUser.nome,
        role: seedUser.role,
        senha: senhaHash,
        email: null,
        ativo: true,
        ehSocia,
        ehDona,
        sociaDesde: null,
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

  const marcelo = await prisma.user.findUnique({ where: { nome: "Marcelo" } });
  if (marcelo && marcelo.role !== Role.BOLISTA) {
    await prisma.user.update({
      where: { id: marcelo.id },
      data: { role: Role.BOLISTA, ativo: true },
    });
    console.log("[seed] Marcelo atualizado para BOLISTA");
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

async function seedConfigECatalogoVendas() {
  const { randomBytes } = await import("node:crypto");
  const { TipoCatalogoAddon, TamanhoDecoracao } = await import("@prisma/client");

  await prisma.configuracaoNegocio.upsert({
    where: { id: "default" },
    update: {
      comissaoPercentual: 10,
      comissaoSociaPercentual: 30,
      diariaMontador: 150,
      diariaDesmontador: 130,
      diariaMontadorCarroEmpresa: 130,
      diariaDesmontadorCarroEmpresa: 80,
      markupBolasPercentual: 10,
    },
    create: {
      id: "default",
      comissaoPercentual: 10,
      comissaoSociaPercentual: 30,
      comissaoMetaSemanal: 500,
      diariaMontador: 150,
      diariaDesmontador: 130,
      diariaMontadorCarroEmpresa: 130,
      diariaDesmontadorCarroEmpresa: 80,
      markupBolasPercentual: 10,
      nomeEmpresa: "DJ festas",
      sloganEmpresa: "Decoração de Festas · Locação de Materiais",
    },
  });
  console.log("[seed] configuração de negócio pronta");

  const kits: Array<{
    id: string;
    nome: string;
    categoria: string;
    descricaoCurta: string;
    valorEquipe: number;
    valorPegueEMonte?: number;
    tamanhoSugerido: TamanhoDecoracao;
    itens: string[];
    ordem: number;
  }> = [
    {
      id: "festa-mesa",
      nome: "Kit Festa na Mesa",
      categoria: "mesa",
      descricaoCurta: "Painel pequeno, bandejas e cachepô — ideal para mesa de bolo.",
      valorEquipe: 80,
      valorPegueEMonte: 80,
      tamanhoSugerido: TamanhoDecoracao.P,
      itens: ["Painel 50x50", "3 bandejas", "Cachepô"],
      ordem: 1,
    },
    {
      id: "festa-mesa-com-mesa",
      nome: "Kit Festa na Mesa (+ mesa)",
      categoria: "mesa",
      descricaoCurta: "Mesmo kit + mesa inclusa.",
      valorEquipe: 130,
      valorPegueEMonte: 130,
      tamanhoSugerido: TamanhoDecoracao.P,
      itens: ["Painel 50x50", "3 bandejas", "Cachepô", "Mesa"],
      ordem: 2,
    },
    {
      id: "pocket",
      nome: "Kit Festa Pocket",
      categoria: "pocket",
      descricaoCurta: "Painel, cilindros e tapete — formato compacto.",
      valorEquipe: 250,
      valorPegueEMonte: 150,
      tamanhoSugerido: TamanhoDecoracao.P,
      itens: [
        "Painel redondo/romano",
        "3 mesas cilíndricas (P/M/G)",
        "6 bandejas",
        "Cachepô",
        "Tapete",
      ],
      ordem: 3,
    },
    {
      id: "intermediaria",
      nome: "Kit Festa Intermediária",
      categoria: "intermediaria",
      descricaoCurta: "Painel, mesa retangular, trio de cilindros e 10 bandejas.",
      valorEquipe: 350,
      valorPegueEMonte: 250,
      tamanhoSugerido: TamanhoDecoracao.M,
      itens: [
        "Painel",
        "Mesa retangular",
        "Trio de cilindros",
        "10 bandejas",
        "Cachepô",
        "Tapete",
        "Escadinha/cabideiro",
      ],
      ordem: 4,
    },
    {
      id: "media",
      nome: "Kit Festa Média",
      categoria: "media",
      descricaoCurta: "Dois painéis, tapete 3M e estrutura completa.",
      valorEquipe: 450,
      valorPegueEMonte: 350,
      tamanhoSugerido: TamanhoDecoracao.G,
      itens: [
        "2 painéis",
        "Mesa retangular",
        "Trio de cilindros",
        "10 bandejas",
        "2 cachepôs",
        "Tapete 3M",
        "Escadinha/cabideiro",
      ],
      ordem: 5,
    },
    {
      id: "decoracao-4m",
      nome: "Decoração 4 Metros",
      categoria: "metros",
      descricaoCurta:
        "Estrutura completa 4m + montagem e transporte (balões do cliente).",
      valorEquipe: 730,
      tamanhoSugerido: TamanhoDecoracao.G,
      itens: [
        "2 painéis",
        "Mesa retangular",
        "Trio de cilindros",
        "12 bandejas",
        "2 cachepôs",
        "Tapete 3M",
        "Escadinha/cabideiro",
        "Montagem pela equipe",
        "Transporte",
      ],
      ordem: 6,
    },
    {
      id: "decoracao-6m",
      nome: "Decoração 6 Metros",
      categoria: "metros",
      descricaoCurta:
        "Estrutura completa 6m + montagem e transporte (balões do cliente).",
      valorEquipe: 980,
      tamanhoSugerido: TamanhoDecoracao.GG,
      itens: [
        "3 painéis",
        "Mesa retangular",
        "2 Trio de cilindros",
        "15 bandejas",
        "3 cachepôs",
        "2 Tapete 3M",
        "Escadinha/cabideiro",
        "Armário escada",
        "Montagem pela equipe",
        "Transporte",
      ],
      ordem: 7,
    },
    {
      id: "casamento-trio-bj",
      nome: "Casamento com Trio BJ",
      categoria: "casamento",
      descricaoCurta: "Tapete, arranjos, mini vazinhos e bandejas — trio BJ.",
      valorEquipe: 680,
      tamanhoSugerido: TamanhoDecoracao.M,
      itens: [
        "Tapete",
        "2 Arranjos",
        "6 Mini vazinhos",
        "10 Bandejas",
        "1 Arranjo de chão",
      ],
      ordem: 8,
    },
    {
      id: "casamento-dupla-bj",
      nome: "Casamento com Dupla BJ",
      categoria: "casamento",
      descricaoCurta: "Tapete, arranjos G/M, mini vazinhos e bandejas — dupla BJ.",
      valorEquipe: 1200,
      tamanhoSugerido: TamanhoDecoracao.G,
      itens: [
        "Tapete",
        "2 Arranjos G",
        "2 Arranjos M",
        "12 Mini vazinhos",
        "20 Bandejas",
        "2 Arranjos de chão",
      ],
      ordem: 9,
    },
    {
      id: "casamento-kit-bj",
      nome: "Casamento Kit BJ",
      categoria: "casamento",
      descricaoCurta:
        "Kit completo BJ com varal de lâmpadas âmbar e acabamento aéreo.",
      valorEquipe: 1900,
      tamanhoSugerido: TamanhoDecoracao.GG,
      itens: [
        "Tapete",
        "4 Arranjos G",
        "2 Arranjos M",
        "18 Mini vazinhos",
        "30 a 35 Bandejas",
        "Par de Bandeja dupla para Bem Casados",
        "Varal de Lâmpadas Âmbar",
        "Acabamento Aéreo com folhagens",
      ],
      ordem: 10,
    },
    {
      id: "pos-civil-p",
      nome: "Pós Civil P",
      categoria: "casamento",
      descricaoCurta: "Arco ou fundo livre, mesinhas e arranjos — formato P.",
      valorEquipe: 250,
      tamanhoSugerido: TamanhoDecoracao.P,
      itens: [
        "1 Arco Romano vazado ou fundo livre",
        "3 Mesinhas douradas ou uma mesa rústica e um tapete",
        "4 Bandejas",
        "2 Arranjos de flores",
      ],
      ordem: 11,
    },
    {
      id: "pos-civil-m",
      nome: "Pós Civil M",
      categoria: "casamento",
      descricaoCurta: "Mesas ou trio tendência, tapete e floreira — formato M.",
      valorEquipe: 450,
      tamanhoSugerido: TamanhoDecoracao.M,
      itens: [
        "2 Mesas ou Trio Tendência",
        "Tapete",
        "Dupla de Arranjos grandes",
        "6 Mini vazinhos de flores",
        "1 Floreira de chão",
        "8 a 10 Bandejas",
        "Fundo Livre ou Cortinado",
      ],
      ordem: 12,
    },
  ];

  for (const kit of kits) {
    await prisma.catalogoKit.upsert({
      where: { id: kit.id },
      update: {
        nome: kit.nome,
        categoria: kit.categoria,
        descricaoCurta: kit.descricaoCurta,
        valorEquipe: kit.valorEquipe,
        valorPegueEMonte: kit.valorPegueEMonte ?? null,
        tamanhoSugerido: kit.tamanhoSugerido,
        itens: kit.itens,
        ordem: kit.ordem,
        ativo: true,
      },
      create: {
        id: kit.id,
        nome: kit.nome,
        categoria: kit.categoria,
        descricaoCurta: kit.descricaoCurta,
        valorEquipe: kit.valorEquipe,
        valorPegueEMonte: kit.valorPegueEMonte ?? null,
        tamanhoSugerido: kit.tamanhoSugerido,
        itens: kit.itens,
        ordem: kit.ordem,
        ativo: true,
      },
    });
  }
  console.log(`[seed] ${kits.length} kits de venda prontos`);

  const addons: Array<{
    id: string;
    nome: string;
    valor: number;
    tipo: TipoCatalogoAddon;
    ordem: number;
  }> = [
    { id: "arco-bola-c", nome: "Arco de bola C", valor: 90, tipo: TipoCatalogoAddon.ADDON, ordem: 1 },
    { id: "balao-lateral", nome: "Balão Lateral", valor: 180, tipo: TipoCatalogoAddon.ADDON, ordem: 2 },
    { id: "baloes-organico", nome: "Balões orgânico", valor: 450, tipo: TipoCatalogoAddon.ADDON, ordem: 3 },
    { id: "painel-extra", nome: "Painel Extra", valor: 70, tipo: TipoCatalogoAddon.ADDON, ordem: 4 },
    { id: "numero-led", nome: "Número LED", valor: 30, tipo: TipoCatalogoAddon.ADDON, ordem: 5 },
    { id: "armario-escada", nome: "Armário escada", valor: 40, tipo: TipoCatalogoAddon.ADDON, ordem: 6 },
    { id: "cilindro-acrilico-trio", nome: "Cilindro Acrílico (trio)", valor: 100, tipo: TipoCatalogoAddon.ADDON, ordem: 7 },
    { id: "mesa-auxiliar", nome: "Mesa auxiliar", valor: 70, tipo: TipoCatalogoAddon.ADDON, ordem: 8 },
    { id: "cilindro-tradi-trio", nome: "Cilindro tradi (Temático trio)", valor: 70, tipo: TipoCatalogoAddon.ADDON, ordem: 9 },
    {
      id: "cantinho-lembrancinha-p",
      nome: "Cantinho de lembrancinha temático Pequeno",
      valor: 250,
      tipo: TipoCatalogoAddon.EXTRA_METROS,
      ordem: 10,
    },
    {
      id: "cantinho-lembrancinha-m",
      nome: "Cantinho de lembrancinha temático Médio",
      valor: 380,
      tipo: TipoCatalogoAddon.EXTRA_METROS,
      ordem: 11,
    },
    {
      id: "mesa-bem-casado",
      nome: "Mesa Bem Casado",
      valor: 180,
      tipo: TipoCatalogoAddon.EXTRA_CASAMENTO,
      ordem: 12,
    },
    {
      id: "mesa-bem-casado-armario",
      nome: "Mesa Bem Casado com Armário",
      valor: 380,
      tipo: TipoCatalogoAddon.EXTRA_CASAMENTO,
      ordem: 13,
    },
    {
      id: "mesa-cerimonia-passarela",
      nome: "Mesa Cerimônia com passarela de noiva",
      valor: 180,
      tipo: TipoCatalogoAddon.EXTRA_CASAMENTO,
      ordem: 14,
    },
  ];

  for (const addon of addons) {
    await prisma.catalogoAddon.upsert({
      where: { id: addon.id },
      update: {
        nome: addon.nome,
        valor: addon.valor,
        tipo: addon.tipo,
        ordem: addon.ordem,
        ativo: true,
      },
      create: {
        id: addon.id,
        nome: addon.nome,
        valor: addon.valor,
        tipo: addon.tipo,
        ordem: addon.ordem,
        ativo: true,
      },
    });
  }
  console.log(`[seed] ${addons.length} add-ons de venda prontos`);

  const bolista = await prisma.user.findUnique({ where: { nome: "Marcelo" } });
  /** Catálogo oficial — adicional de serviços de balões (PDF). */
  const catalogoBolasSeed = [
    {
      nome: "Arco em todo painel elaborado",
      descricao:
        "Arco de balões incluso na decoração — em todo painel elaborado.",
      valorTabela: 300,
      ordem: 1,
    },
    {
      nome: "Arco de entrada elaborado",
      descricao: "Arco de entrada elaborado.",
      valorTabela: 340,
      ordem: 2,
    },
    {
      nome: "Arco de entrada uma lateral elaborado",
      descricao: "Arco de entrada em uma lateral — elaborado.",
      valorTabela: 230,
      ordem: 3,
    },
    {
      nome: "Arco de entrada temático",
      descricao: "Arco de entrada temático (tema da festa).",
      valorTabela: 340,
      ordem: 4,
    },
    {
      nome: "Arco de entrada simples",
      descricao:
        "Arco de entrada simples (túnel de arcos simples — unidade).",
      valorTabela: 180,
      ordem: 5,
    },
    {
      nome: "Túnel de entrada bolas em tela",
      descricao: "Túnel de entrada com bolas em tela.",
      valorTabela: 680,
      ordem: 6,
    },
    {
      nome: "Centro de mesa temático",
      descricao: "Centro de mesa temático (unidade).",
      valorTabela: 20,
      ordem: 7,
    },
  ];

  /** Itens antigos do seed — substituídos pelo PDF oficial. */
  const catalogoBolasLegado = [
    "Arco de bolas ornamentado",
    "Coluna de bolas",
    "Painel de bolas",
    "Números / letras com bolas",
    "Centro de mesa com balões",
  ];

  for (const item of catalogoBolasSeed) {
    const existing = await prisma.catalogoBola.findFirst({
      where: { nome: item.nome },
    });
    if (existing) {
      await prisma.catalogoBola.update({
        where: { id: existing.id },
        data: {
          descricao: item.descricao,
          valorTabela: item.valorTabela,
          ordem: item.ordem,
          ativo: true,
        },
      });
    } else {
      await prisma.catalogoBola.create({
        data: {
          nome: item.nome,
          descricao: item.descricao,
          valorTabela: item.valorTabela,
          ordem: item.ordem,
          ativo: true,
          criadoPorId: bolista?.id ?? null,
        },
      });
    }
  }
  await prisma.catalogoBola.updateMany({
    where: { nome: { in: catalogoBolasLegado } },
    data: { ativo: false },
  });
  console.log(`[seed] ${catalogoBolasSeed.length} itens de catálogo de bolas prontos`);

  const semToken = await prisma.festa.findMany({
    where: { portalToken: null },
    select: { id: true },
  });
  for (const festa of semToken) {
    await prisma.festa.update({
      where: { id: festa.id },
      data: { portalToken: randomBytes(24).toString("base64url") },
    });
  }
  if (semToken.length > 0) {
    console.log(`[seed] portalToken gerado para ${semToken.length} festa(s)`);
  }
}

async function main() {
  await seedUsuarios();
  await seedCatalogoEstoque();
  await seedConfigECatalogoVendas();
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
