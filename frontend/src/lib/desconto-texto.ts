import { formatCurrency } from "@/lib/format";

export type DescontoInterpretado =
  | { tipo: "percentual"; percentual: number }
  | { tipo: "valor"; valor: number };

const EXEMPLO =
  'Escreva "desconto de R$50", "desconto de 50 reais", "desconto de 50%" ou "desconto de 100%".';

const NUM = String.raw`(?:\d{1,3}(?:\.\d{3})+(?:,\d{2})?|\d+\.\d{1,2}|\d+(?:,\d{1,2})?)`;

function normalizar(texto: string): string {
  return texto
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function parseNumeroBr(raw: string): number {
  const t = raw.trim();
  if (t.includes(",") && t.includes(".")) {
    return Number(t.replace(/\./g, "").replace(",", "."));
  }
  if (t.includes(",")) {
    return Number(t.replace(",", "."));
  }
  if (t.includes(".")) {
    const parts = t.split(".");
    if (parts.length > 2) {
      return Number(t.replace(/\./g, ""));
    }
    const frac = parts[1] ?? "";
    if (frac.length === 3) {
      return Number(t.replace(".", ""));
    }
    return Number(t);
  }
  return Number(t);
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function parseDescontoTexto(raw: string): DescontoInterpretado {
  const texto = raw.trim();
  if (!texto) {
    throw new Error(EXEMPLO);
  }

  const normalizado = normalizar(texto);
  if (!/\bdesconto\b/.test(normalizado)) {
    throw new Error(EXEMPLO);
  }

  const percentMatch = normalizado.match(new RegExp(`(${NUM})\\s*%`));
  const currencyMatch = normalizado.match(
    new RegExp(`(?:r\\$\\s*(${NUM})|(${NUM})\\s*(?:reais|real)\\b)`)
  );

  if (percentMatch && currencyMatch) {
    throw new Error("Escreva só um desconto: ou em reais, ou em porcentagem.");
  }

  if (percentMatch?.[1]) {
    const percentual = parseNumeroBr(percentMatch[1]);
    if (!Number.isFinite(percentual) || percentual <= 0 || percentual > 100) {
      throw new Error("A porcentagem precisa ser maior que 0 e no máximo 100%.");
    }
    return { tipo: "percentual", percentual: roundMoney(percentual) };
  }

  const bruto = currencyMatch?.[1] ?? currencyMatch?.[2];
  if (bruto) {
    const valor = parseNumeroBr(bruto);
    if (!Number.isFinite(valor) || valor <= 0) {
      throw new Error("O valor em reais precisa ser maior que zero.");
    }
    return { tipo: "valor", valor: roundMoney(valor) };
  }

  throw new Error(`Não consegui identificar o desconto. ${EXEMPLO}`);
}

export function aplicarDesconto(
  valorOriginal: number,
  desconto: DescontoInterpretado
): { abatimento: number; valorFinal: number } {
  const base = roundMoney(valorOriginal);
  if (!Number.isFinite(base) || base <= 0) {
    throw new Error("Informe o valor da venda antes de lançar o desconto.");
  }

  if (desconto.tipo === "percentual") {
    const abatimento = roundMoney(base * (desconto.percentual / 100));
    return { abatimento, valorFinal: roundMoney(base - abatimento) };
  }

  const abatimento = roundMoney(desconto.valor);
  if (abatimento - base > 0.009) {
    throw new Error(
      `Esse desconto (${formatCurrency(abatimento)}) é maior que o valor da venda (${formatCurrency(base)}).`
    );
  }

  return {
    abatimento,
    valorFinal: roundMoney(Math.max(0, base - abatimento)),
  };
}

function toNumber(value: string | number | null | undefined): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(n) ? n : null;
}

export function rotuloDesconto(input: {
  percentual?: string | number | null;
  valor?: string | number | null;
}): string | null {
  const valor = toNumber(input.valor);
  if (valor != null && valor > 0) {
    return formatCurrency(valor);
  }
  const pct = toNumber(input.percentual);
  if (pct == null || pct <= 0) return null;
  const texto = Number.isInteger(pct)
    ? String(pct)
    : String(pct).replace(".", ",");
  return `${texto}%`;
}

export function descreverDesconto(
  valorVenda: number,
  texto: string
):
  | { ok: true; abatimento: number; valorFinal: number; rotulo: string }
  | { ok: false; mensagem: string } {
  try {
    const parsed = parseDescontoTexto(texto);
    const { abatimento, valorFinal } = aplicarDesconto(valorVenda, parsed);
    const rotulo =
      parsed.tipo === "percentual"
        ? rotuloDesconto({ percentual: parsed.percentual }) ?? ""
        : formatCurrency(parsed.valor);
    return { ok: true, abatimento, valorFinal, rotulo };
  } catch (error) {
    return {
      ok: false,
      mensagem:
        error instanceof Error ? error.message : "Desconto inválido.",
    };
  }
}

export function preverValorComDesconto(input: {
  valor: string | number;
  valorOriginal?: string | number | null;
  descontoPercentual?: string | number | null;
  descontoValor?: string | number | null;
}): number {
  const original = toNumber(input.valorOriginal) ?? toNumber(input.valor) ?? 0;
  const fixo = toNumber(input.descontoValor);
  const pct = toNumber(input.descontoPercentual);
  try {
    if (fixo != null && fixo > 0) {
      return aplicarDesconto(original, { tipo: "valor", valor: fixo }).valorFinal;
    }
    if (pct != null && pct > 0) {
      return aplicarDesconto(original, {
        tipo: "percentual",
        percentual: pct,
      }).valorFinal;
    }
  } catch {
    return toNumber(input.valor) ?? original;
  }
  return toNumber(input.valor) ?? original;
}
