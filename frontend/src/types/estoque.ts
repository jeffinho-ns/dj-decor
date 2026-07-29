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
  curaHoras?: number;
}

export interface AlertaQr {
  unidade: {
    id: string;
    etiqueta: string | null;
    status: StatusUnidade;
  };
  codigoQr: string;
  produto: { id: string; nome: string };
  saidaEm: string;
  osId?: string;
  festaTema?: string;
}

export interface ProdutoSugestao {
  id: string;
  nome: string;
  reason: string;
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

export interface InventarioItem {
  id: string;
  nome: string;
  categoria: string;
  valorAluguel: string | number;
  requerQr: boolean;
  total: number;
  disponivel: number;
  reservada: number;
  emUso: number;
  manutencao: number;
  unidades: UnidadeProduto[];
}

export interface SincronizarCatalogoResult {
  criados: string[];
  atualizados: string[];
  totalProdutos: number;
  inventario: InventarioItem[];
}
