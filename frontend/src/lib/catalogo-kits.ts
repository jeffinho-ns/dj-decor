import type { TamanhoDecoracao } from "@/types/festa";

export type CatalogoKitId =
  | "festa-mesa"
  | "festa-mesa-com-mesa"
  | "pocket"
  | "intermediaria"
  | "media"
  | "decoracao-4m"
  | "decoracao-6m";

export type CatalogoCategoria =
  | "mesa"
  | "pocket"
  | "intermediaria"
  | "media"
  | "metros";

export interface CatalogoKit {
  id: CatalogoKitId;
  nome: string;
  categoria: CatalogoCategoria;
  descricaoCurta: string;
  valorEquipe: number;
  /** Preço pege-e-monte; undefined = não disponível */
  valorPegueEMonte?: number;
  tamanhoSugerido: TamanhoDecoracao;
  itens: string[];
}

export interface CatalogoAddon {
  id: string;
  nome: string;
  valor: number;
}

export const CATALOGO_KITS: CatalogoKit[] = [
  {
    id: "festa-mesa",
    nome: "Kit Festa na Mesa",
    categoria: "mesa",
    descricaoCurta: "Painel pequeno, bandejas e cachepô — ideal para mesa de bolo.",
    valorEquipe: 80,
    tamanhoSugerido: "P",
    itens: ["Painel 50x50", "3 bandejas", "Cachepô"],
  },
  {
    id: "festa-mesa-com-mesa",
    nome: "Kit Festa na Mesa (com mesa)",
    categoria: "mesa",
    descricaoCurta: "Mesmo kit + mesa inclusa.",
    valorEquipe: 130,
    tamanhoSugerido: "P",
    itens: ["Painel 50x50", "3 bandejas", "Cachepô", "Mesa"],
  },
  {
    id: "pocket",
    nome: "Kit Festa Pocket",
    categoria: "pocket",
    descricaoCurta: "Painel, cilindros e tapete — formato compacto.",
    valorEquipe: 250,
    valorPegueEMonte: 150,
    tamanhoSugerido: "P",
    itens: [
      "Painel redondo/romano",
      "3 mesas cilíndricas (P/M/G)",
      "6 bandejas",
      "Cachepô",
      "Tapete",
    ],
  },
  {
    id: "intermediaria",
    nome: "Kit Festa Intermediária",
    categoria: "intermediaria",
    descricaoCurta: "Painel, mesa retangular, trio de cilindros e 10 bandejas.",
    valorEquipe: 350,
    valorPegueEMonte: 250,
    tamanhoSugerido: "M",
    itens: [
      "Painel",
      "Mesa retangular",
      "Trio de cilindros",
      "10 bandejas",
      "Cachepô",
      "Tapete",
      "Escadinha/cabideiro",
    ],
  },
  {
    id: "media",
    nome: "Kit Festa Média",
    categoria: "media",
    descricaoCurta: "Dois painéis, tapete 3M e estrutura completa.",
    valorEquipe: 450,
    valorPegueEMonte: 350,
    tamanhoSugerido: "G",
    itens: [
      "2 painéis",
      "Mesa retangular",
      "Trio de cilindros",
      "10 bandejas",
      "2 cachepôs",
      "Tapete 3M",
      "Escadinha/cabideiro",
    ],
  },
  {
    id: "decoracao-4m",
    nome: "Decoração 4 metros",
    categoria: "metros",
    descricaoCurta: "Montagem pela equipe + transporte (balões do cliente).",
    valorEquipe: 730,
    tamanhoSugerido: "G",
    itens: ["Montagem pela equipe", "Transporte"],
  },
  {
    id: "decoracao-6m",
    nome: "Decoração 6 metros",
    categoria: "metros",
    descricaoCurta: "Montagem pela equipe + transporte (balões do cliente).",
    valorEquipe: 980,
    tamanhoSugerido: "GG",
    itens: ["Montagem pela equipe", "Transporte"],
  },
];

export const CATALOGO_ADDONS: CatalogoAddon[] = [
  { id: "arco", nome: "Arco de balões", valor: 80 },
  { id: "mesa-cake", nome: "Mesa cake", valor: 50 },
  { id: "balao-numero", nome: "Balão número", valor: 35 },
  { id: "escadinha-extra", nome: "Escadinha extra", valor: 40 },
  { id: "painel-extra", nome: "Painel extra", valor: 120 },
  { id: "cilindro-extra", nome: "Cilindro extra", valor: 45 },
];

export function getCatalogoKit(id: string | null | undefined): CatalogoKit | undefined {
  if (!id) return undefined;
  return CATALOGO_KITS.find((kit) => kit.id === id);
}

export function nomeDoKit(id: string | null | undefined): string | null {
  const kit = getCatalogoKit(id);
  return kit?.nome ?? null;
}

export function valorDoKit(kit: CatalogoKit, pegueEMonte: boolean): number {
  if (pegueEMonte && kit.valorPegueEMonte != null) {
    return kit.valorPegueEMonte;
  }
  return kit.valorEquipe;
}

export function getAddonsByIds(addonIds: string[]): CatalogoAddon[] {
  const set = new Set(addonIds);
  return CATALOGO_ADDONS.filter((addon) => set.has(addon.id));
}

export interface CalcularOrcamentoInput {
  kit: CatalogoKit | undefined;
  pegueEMonte: boolean;
  addonIds: string[];
  extrasManuais?: string[];
}

export interface CalcularOrcamentoResult {
  valorBase: number;
  valorAddons: number;
  total: number;
  itensKit: string[];
  itensAddons: string[];
  itens: string[];
}

export function calcularOrcamento({
  kit,
  pegueEMonte,
  addonIds,
  extrasManuais = [],
}: CalcularOrcamentoInput): CalcularOrcamentoResult {
  const valorBase = kit ? valorDoKit(kit, pegueEMonte) : 0;
  const addons = getAddonsByIds(addonIds);
  const valorAddons = addons.reduce((sum, addon) => sum + addon.valor, 0);
  const itensKit = kit ? [...kit.itens] : [];
  const itensAddons = addons.map((addon) => addon.nome);
  const extras = extrasManuais
    .map((item) => item.trim())
    .filter(Boolean)
    .filter(
      (item) =>
        !itensKit.some((k) => k.toLowerCase() === item.toLowerCase()) &&
        !itensAddons.some((a) => a.toLowerCase() === item.toLowerCase())
    );

  return {
    valorBase,
    valorAddons,
    total: valorBase + valorAddons,
    itensKit,
    itensAddons,
    itens: [...itensKit, ...itensAddons, ...extras],
  };
}

export function montarTextoOrcamento(params: {
  nomeCliente: string;
  telefone: string;
  tema: string;
  kitNome: string | null;
  pegueEMonte: boolean;
  dataEvento: string;
  horaEvento: string;
  endereco: string;
  itens: string[];
  valor: number;
  observacoes?: string;
}): string {
  const linhas = [
    `*Orçamento DJ Decor*`,
    ``,
    `Cliente: ${params.nomeCliente || "—"}`,
    `Telefone: ${params.telefone || "—"}`,
    `Tema: ${params.tema || "—"}`,
  ];

  if (params.kitNome) {
    linhas.push(
      `Kit: ${params.kitNome}${params.pegueEMonte ? " (pegue e monte)" : ""}`
    );
  }

  if (params.dataEvento) {
    linhas.push(
      `Data: ${params.dataEvento}${params.horaEvento ? ` às ${params.horaEvento}` : ""}`
    );
  }

  if (params.endereco) {
    linhas.push(`Local: ${params.endereco}`);
  }

  if (params.itens.length) {
    linhas.push(``, `Itens:`, ...params.itens.map((item) => `• ${item}`));
  }

  linhas.push(``, `Valor: R$ ${params.valor.toFixed(2).replace(".", ",")}`);

  if (params.observacoes?.trim()) {
    linhas.push(``, `Obs.: ${params.observacoes.trim()}`);
  }

  return linhas.join("\n");
}
