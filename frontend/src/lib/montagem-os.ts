import type { FestaMontagemHoje } from "@/types/os";

export interface MontagemListaItem {
  osId: string | null;
  festaId: string;
  clienteNome: string;
  tema: string;
  endereco: string;
  horarioMontagem: string;
  dataEvento: string;
  statusOs: string | null;
  romaneioConcluido: boolean;
  itensPendentes: number;
  totalItens: number;
}

/** Normaliza festas de GET /api/os/today para cards da lista. */
export function normalizarListaMontagem(
  festas: FestaMontagemHoje[]
): MontagemListaItem[] {
  return festas
    .map((festa) => {
      const os = festa.ordemServico;
      const itens = os?.itensRomaneio ?? [];
      const pendentes = itens.filter(
        (item) => !item.carregado || !item.conferido
      ).length;

      return {
        osId: os?.id ?? null,
        festaId: festa.id,
        clienteNome: festa.cliente?.nome ?? "—",
        tema: festa.tema || "—",
        endereco: festa.endereco || "—",
        horarioMontagem: festa.horarioMontagem,
        dataEvento: festa.dataEvento,
        statusOs: os?.status ?? null,
        romaneioConcluido: os?.romaneioConcluido ?? false,
        itensPendentes: pendentes,
        totalItens: itens.length,
      };
    })
    .sort((a, b) => {
      const ta = new Date(a.horarioMontagem).getTime();
      const tb = new Date(b.horarioMontagem).getTime();
      return ta - tb;
    });
}
