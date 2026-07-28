/** Rentabilidade agregada por tema de festa. */
export interface RentabilidadeTema {
  tema: string;
  receita: number;
  /** Custo operacional estimado, quando disponível. */
  custo?: number;
  /** Margem em valor ou percentual, conforme retorno da API. */
  margem?: number;
  quantidade?: number;
}

/** Posição no ranking de comissões por vendedor. */
export interface RankingVendedor {
  vendedorId: string;
  vendedorNome: string;
  totalComissao: number;
  comissoesPagas?: number;
  comissoesPendentes?: number;
}

/** Resumo financeiro (GET /api/financeiro/resumo). */
export interface FinanceiroResumo {
  entradasConfirmadas: number;
  recebiveis: number;
  comissoesPendentes: number;
  comissoesPagas: number;
  rentabilidadePorTema: RentabilidadeTema[];
  rankingVendedores?: RankingVendedor[];
}
