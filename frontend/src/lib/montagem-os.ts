import type { FestaMontagemHoje, OrdemServico } from "@/types/os";

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
  montagemLocalConcluida: boolean;
  checkinAt: string | null;
  itensPendentes: number;
  totalItens: number;
  pegueEMonte: boolean;
  prontoRetirada: boolean;
  retiradoClienteEm: string | null;
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
      const pegueEMonte = Boolean(festa.pegueEMonte);
      const prontoRetiradaEm = festa.prontoRetiradaEm;
      const retiradoClienteEm = festa.retiradoClienteEm ?? null;

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
        montagemLocalConcluida: os?.montagemLocalConcluida ?? false,
        checkinAt: os?.checkinAt ?? null,
        itensPendentes: pendentes,
        totalItens: itens.length,
        pegueEMonte,
        prontoRetirada: Boolean(
          pegueEMonte && prontoRetiradaEm && !retiradoClienteEm
        ),
        retiradoClienteEm,
      };
    })
    .sort((a, b) => {
      const ta = new Date(a.horarioMontagem).getTime();
      const tb = new Date(b.horarioMontagem).getTime();
      return ta - tb;
    });
}

/** Normaliza OS de GET /api/os/mine (montador). */
export function normalizarListaMontagemFromOs(
  ordens: OrdemServico[]
): MontagemListaItem[] {
  return ordens
    .map((os) => {
      const itens = os.itensRomaneio ?? [];
      const pendentes = itens.filter(
        (item) => !item.carregado || !item.conferido
      ).length;
      const festa = os.festa;
      const pegueEMonte = Boolean(festa?.pegueEMonte);
      const prontoRetiradaEm = festa?.prontoRetiradaEm;
      const retiradoClienteEm = festa?.retiradoClienteEm ?? null;

      return {
        osId: os.id,
        festaId: os.festaId,
        clienteNome: festa?.cliente?.nome ?? "—",
        tema: festa?.tema || "—",
        endereco: festa?.endereco || "—",
        horarioMontagem: festa?.horarioMontagem ?? os.criadoEm,
        dataEvento: festa?.dataEvento ?? os.criadoEm,
        statusOs: os.status,
        romaneioConcluido: os.romaneioConcluido,
        montagemLocalConcluida: os.montagemLocalConcluida,
        checkinAt: os.checkinAt,
        itensPendentes: pendentes,
        totalItens: itens.length,
        pegueEMonte,
        prontoRetirada: Boolean(
          pegueEMonte && prontoRetiradaEm && !retiradoClienteEm
        ),
        retiradoClienteEm,
      };
    })
    .sort((a, b) => {
      const ta = new Date(a.horarioMontagem).getTime();
      const tb = new Date(b.horarioMontagem).getTime();
      return ta - tb;
    });
}
