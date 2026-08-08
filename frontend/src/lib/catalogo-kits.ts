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
    valorPegueEMonte: 80,
    tamanhoSugerido: "P",
    itens: ["Painel 50x50", "3 bandejas", "Cachepô"],
  },
  {
    id: "festa-mesa-com-mesa",
    nome: "Kit Festa na Mesa (+ mesa)",
    categoria: "mesa",
    descricaoCurta: "Mesmo kit + mesa inclusa.",
    valorEquipe: 130,
    valorPegueEMonte: 130,
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
    nome: "Decoração 4 Metros",
    categoria: "metros",
    descricaoCurta: "Montagem pela equipe + transporte (balões do cliente).",
    valorEquipe: 730,
    tamanhoSugerido: "G",
    itens: ["Montagem pela equipe", "Transporte"],
  },
  {
    id: "decoracao-6m",
    nome: "Decoração 6 Metros",
    categoria: "metros",
    descricaoCurta: "Montagem pela equipe + transporte (balões do cliente).",
    valorEquipe: 980,
    tamanhoSugerido: "GG",
    itens: ["Montagem pela equipe", "Transporte"],
  },
];

/** Add-ons gerais disponíveis para qualquer kit. */
export const CATALOGO_ADDONS: CatalogoAddon[] = [
  { id: "arco-bola-c", nome: "Arco de bola C", valor: 90 },
  { id: "balao-lateral", nome: "Balão Lateral", valor: 180 },
  { id: "baloes-organico", nome: "Balões orgânico", valor: 450 },
  { id: "painel-extra", nome: "Painel Extra", valor: 70 },
  { id: "numero-led", nome: "Número LED", valor: 30 },
  { id: "armario-escada", nome: "Armário escada", valor: 40 },
  { id: "cilindro-acrilico-trio", nome: "Cilindro Acrílico (trio)", valor: 100 },
  { id: "mesa-auxiliar", nome: "Mesa auxiliar", valor: 70 },
  { id: "cilindro-tradi-trio", nome: "Cilindro tradi (Temático trio)", valor: 70 },
];

/**
 * Extras exclusivos das decorações de 4m e 6m.
 * Só devem aparecer quando um desses kits estiver selecionado.
 */
export const CATALOGO_EXTRAS_METROS: CatalogoAddon[] = [
  {
    id: "cantinho-lembrancinha-p",
    nome: "Cantinho de lembrancinha temático Pequeno",
    valor: 250,
  },
  {
    id: "cantinho-lembrancinha-m",
    nome: "Cantinho de lembrancinha temático Médio",
    valor: 380,
  },
];

const EXTRA_METROS_IDS = new Set(CATALOGO_EXTRAS_METROS.map((item) => item.id));

export function kitAceitaExtrasMetros(
  kitId: string | null | undefined
): boolean {
  return kitId === "decoracao-4m" || kitId === "decoracao-6m";
}

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
  return [...CATALOGO_ADDONS, ...CATALOGO_EXTRAS_METROS].filter((addon) =>
    set.has(addon.id)
  );
}

/** Remove extras de 4m/6m quando o kit selecionado não os permite. */
export function filtrarAddonsParaKit(
  addonIds: string[],
  kitId: string | null | undefined
): string[] {
  if (kitAceitaExtrasMetros(kitId)) return addonIds;
  return addonIds.filter((id) => !EXTRA_METROS_IDS.has(id));
}

/** Taxa fixa quando montador leva e busca no modo pegue e monte. */
export const TAXA_PEGUE_ENTREGA = 30;

export const ITEM_TAXA_PEGUE_ENTREGA =
  "Taxa entrega e retirada pegue e monte — R$30";

export const TAG_PEGUE_ENTREGA = "[PEGUE_ENTREGA_30]";

/**
 * Extrai o último valor em reais do texto (ex.: "… R$100" → 100).
 * Aceita R$ 1.234,56 / R$100 / R$ 90,00.
 */
export function extrairValorReais(texto: string): number {
  const matches = [
    ...texto.matchAll(/R\$\s*([\d.]+(?:,\d{1,2})?|\d+(?:,\d{1,2})?)/gi),
  ];
  if (!matches.length) return 0;
  const raw = matches[matches.length - 1]?.[1] ?? "";
  const normalized = raw.includes(",")
    ? raw.replace(/\./g, "").replace(",", ".")
    : raw;
  const value = Number(normalized);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export interface CalcularOrcamentoInput {
  kit: CatalogoKit | undefined;
  pegueEMonte: boolean;
  addonIds: string[];
  extrasManuais?: string[];
  /** Taxa entrega/retirada pegue e monte (ex.: 30). */
  taxaEntrega?: number;
}

export interface CalcularOrcamentoResult {
  valorBase: number;
  valorAddons: number;
  valorExtras: number;
  valorTaxa: number;
  total: number;
  itensKit: string[];
  itensAddons: string[];
  itensExtras: string[];
  itens: string[];
}

export function calcularOrcamento({
  kit,
  pegueEMonte,
  addonIds,
  extrasManuais = [],
  taxaEntrega = 0,
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
  const valorExtras = extras.reduce(
    (sum, item) => sum + extrairValorReais(item),
    0
  );
  const valorTaxa = taxaEntrega > 0 ? taxaEntrega : 0;
  const itensTaxa =
    valorTaxa > 0
      ? [
          valorTaxa === TAXA_PEGUE_ENTREGA
            ? ITEM_TAXA_PEGUE_ENTREGA
            : `Taxa entrega e retirada pegue e monte — R$${valorTaxa}`,
        ]
      : [];

  return {
    valorBase,
    valorAddons,
    valorExtras,
    valorTaxa,
    total: valorBase + valorAddons + valorExtras + valorTaxa,
    itensKit,
    itensAddons,
    itensExtras: extras,
    itens: [...itensKit, ...itensAddons, ...extras, ...itensTaxa],
  };
}

function formatarReaisTexto(valor: number): string {
  return `R$ ${valor.toFixed(2).replace(".", ",")}`;
}

export function montarTextoOrcamento(params: {
  nomeCliente: string;
  telefone: string;
  tema: string;
  kitNome: string | null;
  pegueEMonte: boolean;
  tamanho?: string;
  dataEvento: string;
  horaEvento: string;
  horaMontagem?: string;
  endereco: string;
  /** true = montador leva e busca (taxa); false = retirada no depósito */
  entregaPegue?: boolean;
  itens: string[];
  valorBase?: number;
  valorAddons?: number;
  valorExtras?: number;
  valorTaxa?: number;
  valor: number;
  observacoes?: string;
}): string {
  const modo = params.pegueEMonte ? "Pegue e monte" : "Montagem pela equipe";
  const linhas = [
    `*Orçamento DJ festas*`,
    ``,
    `Cliente: ${params.nomeCliente || "—"}`,
    `Telefone: ${params.telefone || "—"}`,
    `Tema: ${params.tema || "—"}`,
  ];

  if (params.tamanho) {
    linhas.push(`Tamanho: ${params.tamanho}`);
  }

  if (params.kitNome) {
    linhas.push(`Kit: ${params.kitNome}`);
  }

  linhas.push(`Modo: ${modo}`);

  if (params.pegueEMonte) {
    linhas.push(
      params.entregaPegue
        ? `Retirada: entrega e busca pelo montador (+ taxa)`
        : `Retirada: cliente retira no depósito`
    );
  }

  if (params.dataEvento) {
    const rotuloData = params.pegueEMonte ? "Data da retirada" : "Data do evento";
    const rotuloHora = params.pegueEMonte
      ? "Horário da retirada"
      : "Horário da festa";
    linhas.push(
      `${rotuloData}: ${params.dataEvento}${
        params.horaEvento ? ` às ${params.horaEvento}` : ""
      }`
    );
    if (params.horaEvento) {
      linhas.push(`${rotuloHora}: ${params.horaEvento}`);
    }
    if (!params.pegueEMonte && params.horaMontagem) {
      linhas.push(`Horário de montagem: ${params.horaMontagem}`);
    }
  }

  if (params.endereco) {
    linhas.push(`Local: ${params.endereco}`);
  }

  if (params.itens.length) {
    linhas.push(``, `Itens:`, ...params.itens.map((item) => `• ${item}`));
  }

  const temBreakdown =
    params.valorBase != null ||
    params.valorAddons != null ||
    params.valorExtras != null ||
    params.valorTaxa != null;

  if (temBreakdown) {
    linhas.push(``, `Valores:`);
    if (params.valorBase != null && params.valorBase > 0) {
      linhas.push(`• Base: ${formatarReaisTexto(params.valorBase)}`);
    }
    if (params.valorAddons != null && params.valorAddons > 0) {
      linhas.push(`• Add-ons: ${formatarReaisTexto(params.valorAddons)}`);
    }
    if (params.valorExtras != null && params.valorExtras > 0) {
      linhas.push(`• Extras: ${formatarReaisTexto(params.valorExtras)}`);
    }
    if (params.valorTaxa != null && params.valorTaxa > 0) {
      linhas.push(`• Taxa entrega/retirada: ${formatarReaisTexto(params.valorTaxa)}`);
    }
  }

  linhas.push(``, `Total: ${formatarReaisTexto(params.valor)}`);

  if (params.observacoes?.trim()) {
    const obs = params.observacoes
      .trim()
      .split(TAG_PEGUE_ENTREGA)
      .join("")
      .replace(/\n{2,}/g, "\n")
      .trim();
    if (obs) {
      linhas.push(``, `Obs.: ${obs}`);
    }
  }

  return linhas.join("\n");
}
