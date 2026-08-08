import {
  CATALOGO_ADDONS,
  CATALOGO_EXTRAS_METROS,
  ITEM_TAXA_PEGUE_ENTREGA,
  TAXA_PEGUE_ENTREGA,
  extrairValorReais,
  getCatalogoKit,
  valorDoKit,
} from "@/lib/catalogo-kits";

const PRECO_POR_NOME = new Map<string, number>();

for (const addon of [...CATALOGO_ADDONS, ...CATALOGO_EXTRAS_METROS]) {
  PRECO_POR_NOME.set(addon.nome.toLowerCase(), addon.valor);
}
PRECO_POR_NOME.set(ITEM_TAXA_PEGUE_ENTREGA.toLowerCase(), TAXA_PEGUE_ENTREGA);

/** Nomes de peças internas do kit (não somam preço individual). */
function nomesItensKit(kitCatalogo: string | null | undefined): Set<string> {
  const kit = getCatalogoKit(kitCatalogo);
  if (!kit) return new Set();
  return new Set(kit.itens.map((item) => item.toLowerCase()));
}

/**
 * Valor sugerido pelo catálogo:
 * preço do kit (se houver) + add-ons/extras reconhecidos + R$ em extras manuais.
 */
export function calcularValorCatalogo(params: {
  kitCatalogo?: string | null;
  pegueEMonte?: boolean;
  itensExtras: string[];
}): number {
  const kit = getCatalogoKit(params.kitCatalogo);
  const base = kit ? valorDoKit(kit, Boolean(params.pegueEMonte)) : 0;
  const kitItens = nomesItensKit(params.kitCatalogo);

  let extras = 0;
  for (const item of params.itensExtras) {
    const key = item.trim().toLowerCase();
    if (!key || kitItens.has(key)) continue;
    const precoCatalogo = PRECO_POR_NOME.get(key);
    if (precoCatalogo != null) {
      extras += precoCatalogo;
      continue;
    }
    extras += extrairValorReais(item);
  }

  return Number((base + extras).toFixed(2));
}

export function catalogoAddonsDisponiveis() {
  return [...CATALOGO_ADDONS, ...CATALOGO_EXTRAS_METROS];
}

export function precoItemCatalogo(nome: string): number | null {
  return PRECO_POR_NOME.get(nome.trim().toLowerCase()) ?? null;
}
