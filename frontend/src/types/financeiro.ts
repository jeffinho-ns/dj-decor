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

/** Status de uma comissão individual. */
export type ComissaoStatus = "PENDENTE" | "PAGA";

/** Linha do extrato de comissões / repasses (GET /api/comissoes/minhas). */
export interface ComissaoExtrato {
  id: string;
  tipo?: string;
  tipoLabel?: string;
  percentual: number | null;
  valor: number;
  status: ComissaoStatus;
  pagoEm: string | null;
  criadoEm: string;
  elegivelEm?: string;
  liberadoParaPagamento?: boolean;
  festa: {
    id: string;
    tema: string;
    dataEvento?: string;
    cliente: { nome: string };
  };
}

/** Posição no ranking de comissões por vendedor. */
export interface RankingVendedor {
  vendedorId: string;
  vendedorNome: string;
  totalComissao: number;
  comissoesPagas?: number;
  comissoesPendentes?: number;
  posicao?: number;
  meta?: number;
  atingiuMeta?: boolean;
  progressoMeta?: number;
}

/** Ranking gamificado (GET /api/comissoes/ranking). */
export interface ComissaoRanking {
  periodo: "semana" | "mes";
  inicio: string;
  meta: number;
  ranking: RankingVendedor[];
}

/** Período da previsão de caixa. */
export interface PrevisaoCaixaPeriodo {
  inicio: string;
  fim: string;
  confirmado: number;
  pendente: number;
  saldoFesta: number;
  total: number;
}

/** Previsão de caixa (GET /api/financeiro/previsao). */
export interface PrevisaoCaixa {
  dias: number;
  inicio: string;
  fim: string;
  totalPrevisto: number;
  periodos: PrevisaoCaixaPeriodo[];
}

/** Resumo financeiro (GET /api/financeiro/resumo). */
export interface FinanceiroResumo {
  entradasConfirmadas: number;
  recebiveis: number;
  /** Saldo ainda devido nas festas (sinais parciais etc.). */
  recebiveisDetalhe?: {
    pagamentosPendentes: number;
    saldoFestasSemPagamentoCompleto: number;
  };
  /** Liberadas para pagar agora (mês do evento). */
  comissoesPendentes: number;
  comissoesPendentesLiberadas?: number;
  /** Pendentes mas ainda no mês futuro do evento. */
  comissoesPendentesFuturas?: number;
  comissoesPendentesTotal?: number;
  comissoesPagas: number;
  rentabilidadePorTema: RentabilidadeTema[];
  rankingVendedores?: RankingVendedor[];
}
