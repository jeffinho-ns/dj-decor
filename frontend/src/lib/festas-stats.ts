import type { Festa } from "@/types/festa";

export interface FestasStats {
  total: number;
  valorTotal: number;
  orcamentos: number;
  fechadas: number;
  concluidas: number;
}

export function computeFestasStats(festas: Festa[]): FestasStats {
  return festas.reduce<FestasStats>(
    (acc, festa) => {
      const valor =
        typeof festa.valor === "string" ? Number(festa.valor) : festa.valor;
      acc.total += 1;
      acc.valorTotal += Number.isFinite(valor) ? valor : 0;
      if (festa.status === "ORCAMENTO") acc.orcamentos += 1;
      if (festa.status === "FECHADO") acc.fechadas += 1;
      if (festa.status === "CONCLUIDO") acc.concluidas += 1;
      return acc;
    },
    { total: 0, valorTotal: 0, orcamentos: 0, fechadas: 0, concluidas: 0 }
  );
}
