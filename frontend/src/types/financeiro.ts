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

export type FrequenciaPagamentoEquipe = "SEMANAL" | "QUINZENAL" | "MENSAL";

/** Tipo de lançamento na fila "A pagar". */
export type APagarTipo =
  | "COMISSAO_VENDEDOR"
  | "COMISSAO_SOCIA"
  | "COMISSAO_DONA"
  | "DIARIA_MONTAGEM"
  | "DIARIA_DESMONTAGEM"
  | string;

/** Linha da fila liberada para pagar (GET /api/financeiro/a-pagar). */
export interface APagarItem {
  id: string;
  beneficiarioId: string;
  beneficiarioNome: string;
  tipo: APagarTipo;
  tipoLabel: string;
  valor: number;
  festaId: string;
  festaTema: string;
  dataEvento: string;
  liberado: true;
}

/** Resposta da fila "A pagar". */
export interface APagarFila {
  mes: string | null;
  label: string;
  total: number;
  itens: APagarItem[];
}

export interface EquipeDiariaFesta {
  id: string;
  tema: string;
  clienteNome: string;
}

export interface EquipeDiariaDia {
  ymd: string;
  tipo: "DIARIA_MONTAGEM" | "DIARIA_DESMONTAGEM";
  tipoLabel: string;
  carroProprio: boolean;
  valor: number;
  status: "PENDENTE" | "PAGA";
  comissaoId: string | null;
  festas: EquipeDiariaFesta[];
}

export interface EquipeDiariaPessoa {
  id: string;
  nome: string;
  dias: EquipeDiariaDia[];
  total: number;
  totalPendente: number;
  totalPago: number;
  diasPendentes: number;
  diasPagos: number;
}

export interface EquipeDiariasPeriodo {
  frequencia: FrequenciaPagamentoEquipe;
  offset: number;
  inicioYmd: string;
  fimYmd: string;
  label: string;
  totalPendente: number;
  totalPago: number;
  pessoas: EquipeDiariaPessoa[];
}

export type PeriodoRecebimento = "semana" | "quinzena" | "mes" | "tudo";

export interface MeusTotaisPorTipo {
  tipo: string;
  label: string;
  pendente: number;
  pago: number;
  total: number;
}

export interface MeusTotaisPeriodo {
  periodo: "semana" | "quinzena" | "mes";
  offset: number;
  label: string;
  inicio: string;
  fim: string;
  total: number;
  totalPendente: number;
  totalLiberado: number;
  totalPago: number;
  porTipo: MeusTotaisPorTipo[];
  lancamentos: ComissaoExtrato[];
}

export interface ColaboradorFinanceiroResumo {
  id: string;
  nome: string;
  role: string;
  telefone?: string | null;
  email?: string | null;
  ehSocia?: boolean;
  ehDona?: boolean;
  totalPendente: number;
  totalLiberado: number;
  totalPago: number;
  totalComissaoVenda: number;
  totalDiariaMontagem: number;
  totalDiariaDesmontagem: number;
  totalDiarias: number;
  totalComissaoFora: number;
  totalDivisao: number;
}

export interface ColaboradorFinanceiroDetalhe {
  colaborador: {
    id: string;
    nome: string;
    role: string;
    telefone?: string | null;
    email?: string | null;
    ehSocia?: boolean;
    ehDona?: boolean;
    ativo?: boolean;
  };
  periodo: PeriodoRecebimento;
  offset: number;
  label: string;
  inicio: string;
  fim: string;
  total: number;
  totalPendente: number;
  totalLiberado: number;
  totalPago: number;
  porTipo: MeusTotaisPorTipo[];
  lancamentos: ComissaoExtrato[];
  festasVendidas: Array<{
    id: string;
    tema: string;
    status: string;
    valor: number;
    dataEvento: string;
    clienteNome: string;
  }>;
}

/** Pessoa numa diária do calendário mensal. */
export interface CalendarioDiariaPessoa {
  pessoaId: string;
  pessoaNome: string;
  tipo: "DIARIA_MONTAGEM" | "DIARIA_DESMONTAGEM";
  tipoLabel: string;
  valor: number;
  status: "PENDENTE" | "PAGA" | "PREVISTA";
  comissaoId: string | null;
  festaId: string;
  festaTema: string;
}

/** Dia com diárias no calendário (GET /api/financeiro/calendario-diarias). */
export interface CalendarioDiariaDia {
  ymd: string;
  total: number;
  pessoas: CalendarioDiariaPessoa[];
}

/** Resposta do calendário de diárias do mês. */
export interface CalendarioDiariasMes {
  mes: string;
  label: string;
  inicioYmd: string;
  fimYmd: string;
  total: number;
  dias: CalendarioDiariaDia[];
}

/** Fatia do split na aba Festas do mês. */
export interface FestaMesSplitFatia {
  percentual: number | null;
  valor: number;
  beneficiarioNome?: string;
}

/** Resumo de split (comissões + diárias) por festa. */
export interface FestaMesSplit {
  vendedor: FestaMesSplitFatia | null;
  suellemFora: FestaMesSplitFatia | null;
  debora: { percentual: number | null; valor: number } | null;
  diarias: {
    montagem: number;
    desmontagem: number;
    total: number;
  };
  total: number;
}

/** Linha da aba Festas (GET /api/financeiro/festas-mes). */
export interface FestaFinanceiroMesItem {
  id: string;
  tema: string;
  status: string;
  valor: number;
  dataEvento: string;
  clienteNome: string;
  foraParacambi: boolean;
  vendedor: { id: string; nome: string };
  montador: { id: string; nome: string } | null;
  desmontador: { id: string; nome: string } | null;
  split: FestaMesSplit | null;
}

/** Resposta das festas do mês. */
export interface FestasFinanceiroMes {
  mes: string;
  label: string;
  totalValor: number;
  quantidade: number;
  itens: FestaFinanceiroMesItem[];
}

/** Totais COMISSAO_DONA da Debora no mês (GET /api/financeiro/resumo-debora). */
export interface ResumoDeboraMes {
  mes: string;
  label: string;
  beneficiarias: Array<{ id: string; nome: string }>;
  pendente: number;
  liberado: number;
  pago: number;
  total: number;
}

/** Festa suspeita de estar fora de Paracambi sem checkbox. */
export interface AlertaForaParacambiItem {
  id: string;
  tema: string;
  endereco: string;
  dataEvento: string;
  status: string;
  clienteNome: string;
}

/** Alertas fora de Paracambi (GET /api/financeiro/alertas-fora). */
export interface AlertasForaParacambi {
  mes: string;
  label: string;
  total: number;
  itens: AlertaForaParacambiItem[];
}
