/**
 * Inventário físico alinhado ao catálogo comercial (kits + add-ons).
 * Usado no seed, sincronização e avaliação de falta no fechamento.
 */
export type InventarioItemDef = {
  /** Chave estável para upsert/seed */
  chave: string;
  nome: string;
  categoria: string;
  valorAluguel: number;
  /** Quantidade inicial sugerida de unidades */
  quantidadePadrao: number;
  requerQr?: boolean;
  /** Textos normalizados (sem acento, minúsculos) que mapeiam itensExtras → produto */
  aliases: string[];
};

/** Itens de serviço — não entram no inventário físico. */
export const ITENS_SERVICO = [
  "montagem pela equipe",
  "transporte",
] as const;

export const INVENTARIO_CATALOGO: InventarioItemDef[] = [
  {
    chave: "painel-50x50",
    nome: "Painel 50x50",
    categoria: "Painéis",
    valorAluguel: 40,
    quantidadePadrao: 4,
    aliases: ["painel 50x50"],
  },
  {
    chave: "painel",
    nome: "Painel",
    categoria: "Painéis",
    valorAluguel: 80,
    quantidadePadrao: 6,
    aliases: ["painel", "paineis", "painéis"],
  },
  {
    chave: "painel-redondo",
    nome: "Painel redondo/romano",
    categoria: "Painéis",
    valorAluguel: 90,
    quantidadePadrao: 4,
    aliases: ["painel redondo/romano", "painel redondo", "painel romano"],
  },
  {
    chave: "painel-extra",
    nome: "Painel Extra",
    categoria: "Painéis",
    valorAluguel: 70,
    quantidadePadrao: 3,
    aliases: ["painel extra"],
  },
  {
    chave: "mesa",
    nome: "Mesa",
    categoria: "Móveis",
    valorAluguel: 50,
    quantidadePadrao: 4,
    requerQr: true,
    aliases: ["mesa"],
  },
  {
    chave: "mesa-retangular",
    nome: "Mesa retangular",
    categoria: "Móveis",
    valorAluguel: 70,
    quantidadePadrao: 3,
    requerQr: true,
    aliases: ["mesa retangular"],
  },
  {
    chave: "mesa-auxiliar",
    nome: "Mesa auxiliar",
    categoria: "Móveis",
    valorAluguel: 70,
    quantidadePadrao: 3,
    aliases: ["mesa auxiliar"],
  },
  {
    chave: "mesa-cilindrica",
    nome: "Mesa cilíndrica",
    categoria: "Móveis",
    valorAluguel: 45,
    quantidadePadrao: 9,
    aliases: [
      "mesa cilindrica",
      "mesas cilindricas",
      "mesas cilindricas (p/m/g)",
      "3 mesas cilindricas (p/m/g)",
    ],
  },
  {
    chave: "trio-cilindros",
    nome: "Trio de cilindros",
    categoria: "Móveis",
    valorAluguel: 60,
    quantidadePadrao: 4,
    aliases: ["trio de cilindros"],
  },
  {
    chave: "cilindro-acrilico",
    nome: "Cilindro Acrílico (trio)",
    categoria: "Móveis",
    valorAluguel: 100,
    quantidadePadrao: 2,
    aliases: ["cilindro acrilico (trio)", "cilindro acrilico"],
  },
  {
    chave: "cilindro-tradi",
    nome: "Cilindro tradi (Temático trio)",
    categoria: "Móveis",
    valorAluguel: 70,
    quantidadePadrao: 2,
    aliases: [
      "cilindro tradi (tematico trio)",
      "cilindro tradi",
      "cilindro tradi (temático trio)",
    ],
  },
  {
    chave: "bandeja",
    nome: "Bandeja",
    categoria: "Acessórios",
    valorAluguel: 8,
    quantidadePadrao: 30,
    aliases: ["bandeja", "bandejas"],
  },
  {
    chave: "cachepo",
    nome: "Cachepô",
    categoria: "Acessórios",
    valorAluguel: 15,
    quantidadePadrao: 12,
    aliases: ["cachepo", "cachepô", "cachepos", "cachepôs"],
  },
  {
    chave: "tapete",
    nome: "Tapete",
    categoria: "Acessórios",
    valorAluguel: 35,
    quantidadePadrao: 6,
    aliases: ["tapete"],
  },
  {
    chave: "tapete-3m",
    nome: "Tapete 3M",
    categoria: "Acessórios",
    valorAluguel: 55,
    quantidadePadrao: 3,
    aliases: ["tapete 3m"],
  },
  {
    chave: "escadinha",
    nome: "Escadinha/cabideiro",
    categoria: "Acessórios",
    valorAluguel: 40,
    quantidadePadrao: 4,
    aliases: ["escadinha/cabideiro", "escadinha", "cabideiro"],
  },
  {
    chave: "armario-escada",
    nome: "Armário escada",
    categoria: "Acessórios",
    valorAluguel: 40,
    quantidadePadrao: 3,
    aliases: ["armario escada", "armário escada"],
  },
  {
    chave: "arco-bola-c",
    nome: "Arco de bola C",
    categoria: "Balões",
    valorAluguel: 90,
    quantidadePadrao: 3,
    aliases: ["arco de bola c", "arco de baloes", "arco de balões"],
  },
  {
    chave: "balao-lateral",
    nome: "Balão Lateral",
    categoria: "Balões",
    valorAluguel: 180,
    quantidadePadrao: 2,
    aliases: ["balao lateral", "balão lateral"],
  },
  {
    chave: "baloes-organico",
    nome: "Balões orgânico",
    categoria: "Balões",
    valorAluguel: 450,
    quantidadePadrao: 2,
    aliases: ["baloes organico", "balões orgânico", "baloes organicos"],
  },
  {
    chave: "numero-led",
    nome: "Número LED",
    categoria: "Iluminação",
    valorAluguel: 30,
    quantidadePadrao: 10,
    aliases: ["numero led", "número led", "balao numero", "balão número"],
  },
  {
    chave: "cantinho-p",
    nome: "Cantinho de lembrancinha temático Pequeno",
    categoria: "Cantinhos",
    valorAluguel: 250,
    quantidadePadrao: 2,
    aliases: [
      "cantinho de lembrancinha tematico pequeno",
      "cantinho de lembrancinha temático pequeno",
    ],
  },
  {
    chave: "cantinho-m",
    nome: "Cantinho de lembrancinha temático Médio",
    categoria: "Cantinhos",
    valorAluguel: 380,
    quantidadePadrao: 2,
    aliases: [
      "cantinho de lembrancinha tematico medio",
      "cantinho de lembrancinha temático médio",
    ],
  },
];

export function normalizarTexto(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function isItemServico(linha: string): boolean {
  const n = normalizarTexto(linha);
  return ITENS_SERVICO.some((s) => n === s || n.includes(s));
}

export function parseLinhaInventario(
  linha: string
): { quantidade: number; texto: string } | null {
  if (!linha.trim() || isItemServico(linha)) return null;
  const n = normalizarTexto(linha);
  const match = n.match(/^(\d+)\s+(.+)$/);
  if (match) {
    return { quantidade: Number(match[1]), texto: match[2] };
  }
  return { quantidade: 1, texto: n };
}

export function encontrarDefInventario(
  textoNormalizado: string
): InventarioItemDef | undefined {
  // Preferência: match mais específico (alias mais longo)
  let best: InventarioItemDef | undefined;
  let bestLen = -1;

  for (const item of INVENTARIO_CATALOGO) {
    const candidatos = [
      normalizarTexto(item.nome),
      ...item.aliases.map(normalizarTexto),
    ];
    for (const alias of candidatos) {
      if (
        textoNormalizado === alias ||
        textoNormalizado.includes(alias) ||
        alias.includes(textoNormalizado)
      ) {
        if (alias.length > bestLen) {
          best = item;
          bestLen = alias.length;
        }
      }
    }
  }

  return best;
}

export type NecessidadeInventario = {
  chave: string;
  nome: string;
  quantidade: number;
};

/** Consolida linhas de itensExtras em necessidades por produto do inventário. */
export function consolidarNecessidades(
  itensExtras: string[]
): NecessidadeInventario[] {
  const map = new Map<string, NecessidadeInventario>();

  for (const linha of itensExtras) {
    const parsed = parseLinhaInventario(linha);
    if (!parsed) continue;
    const def = encontrarDefInventario(parsed.texto);
    if (!def) continue;

    const atual = map.get(def.chave);
    if (atual) {
      atual.quantidade += parsed.quantidade;
    } else {
      map.set(def.chave, {
        chave: def.chave,
        nome: def.nome,
        quantidade: parsed.quantidade,
      });
    }
  }

  return [...map.values()];
}
