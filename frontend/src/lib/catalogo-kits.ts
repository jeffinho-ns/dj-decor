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
  return valor.toFixed(2).replace(".", ",");
}

/** Data do form (YYYY-MM-DD ou dd/mm/aaaa) → dd/MM */
function formatarDataCurta(dataEvento: string): string {
  const iso = dataEvento.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}`;
  const br = dataEvento.match(/^(\d{2})\/(\d{2})/);
  if (br) return `${br[1]}/${br[2]}`;
  return dataEvento;
}

const MARCA_CONFIRMACAO = "Débora Pimentel Decoradora";
const RODAPE_CONFIRMACAO =
  "📍 Paracambi - RJ | 📱 Instagram: @deborapimenteldecoradora";

/**
 * Texto WhatsApp no formato de confirmação de sinal da marca.
 */
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
  /** Valor do sinal/entrada. Se omitido ou 0, usa o valor total. */
  valorSinal?: number;
  observacoes?: string;
}): string {
  const total = Number.isFinite(params.valor) ? params.valor : 0;
  const sinalRaw =
    params.valorSinal != null &&
    Number.isFinite(params.valorSinal) &&
    params.valorSinal > 0
      ? params.valorSinal
      : total;
  const sinalTxt = formatarReaisTexto(sinalRaw);
  const totalTxt = formatarReaisTexto(total);

  let local = params.endereco?.trim() || "—";
  if (params.pegueEMonte && !params.entregaPegue) {
    local = "Retirada no Depósito";
  } else if (params.pegueEMonte && params.entregaPegue) {
    local = params.endereco?.trim()
      ? `Entrega no local — ${params.endereco.trim()}`
      : "Entrega e busca pelo montador";
  }

  const detalhes: string[] = [];
  for (const item of params.itens) {
    const t = item.trim();
    if (t && !detalhes.includes(t)) detalhes.push(t);
  }
  if (params.observacoes?.trim()) {
    const obs = params.observacoes
      .trim()
      .split(TAG_PEGUE_ENTREGA)
      .join("")
      .replace(/\n{2,}/g, "\n")
      .trim();
    for (const linha of obs.split("\n")) {
      const t = linha.trim();
      if (t && !detalhes.includes(t)) detalhes.push(t);
    }
  }

  const linhas = [
    `💬 Confirmação de sinal — ${MARCA_CONFIRMACAO} 🎈`,
    ``,
    `Recebi o sinal de R$*${sinalTxt}*`,
    `referente à decoração de R$ ${totalTxt}*`,
    `evento de ${params.nomeCliente || "—"}`,
    `Data ${params.dataEvento ? formatarDataCurta(params.dataEvento) : "—"}`,
    `Local ${local}`,
    ...detalhes,
    `Telefone ${params.telefone || "—"}`,
    `Horário início ${params.horaEvento || "—"}`,
    ``,
    `Segue foto referência decoração.`,
    `⸻`,
    `Se houver valor restante deverá ser quitado até a véspera do evento independente se for Pix, espécie ou cartão !`,
    `_________`,
    ``,
    `Aviso importante:`,
    `O valor pago não é devolvido em caso de desistência.`,
    `Fica como crédito por até 12 meses, podendo ser usado em outra data ou transferido para outra pessoa.`,
    ``,
    `✨ ${MARCA_CONFIRMACAO}`,
    RODAPE_CONFIRMACAO,
  ];

  return linhas.join("\n");
}
