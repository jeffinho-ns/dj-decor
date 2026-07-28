export type StatusUnidade =
  | "DISPONIVEL"
  | "RESERVADA"
  | "EM_USO"
  | "MANUTENCAO";

export interface UnidadeProduto {
  id: string;
  codigoQr: string;
  etiqueta: string | null;
  status: StatusUnidade;
  produtoId: string;
}

export interface Produto {
  id: string;
  nome: string;
  categoria: string;
  valorAluguel: string | number;
  tema: string | null;
  requerQr: boolean;
  ativo: boolean;
  criadoEm: string;
  unidades: UnidadeProduto[];
}

export interface CreateProdutoPayload {
  nome: string;
  categoria: string;
  valorAluguel: number;
  tema?: string | null;
  requerQr?: boolean;
  ativo?: boolean;
}

export interface CreateUnidadePayload {
  codigoQr: string;
  etiqueta?: string | null;
  status?: StatusUnidade;
}

export interface DisponibilidadeResult {
  produto: {
    id: string;
    nome: string;
    categoria: string;
    valorAluguel: string | number;
  };
  inicio: string;
  fim: string;
  totalUnidades: number;
  disponiveis: number;
  unidades: UnidadeProduto[];
}

export interface ReservarEstoquePayload {
  unidadeId: string;
  festaId: string;
  inicio: string;
  fim: string;
}

export interface ReservaEstoque {
  id: string;
  inicio: string;
  fim: string;
  criadoEm: string;
  festaId: string;
  unidadeId: string;
  unidade: UnidadeProduto & {
    produto: { id: string; nome: string; categoria: string };
  };
  festa?: {
    id: string;
    tema: string;
    dataEvento: string;
    horarioMontagem: string;
  };
}
