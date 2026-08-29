export type StatusPedidoBolas =
  | "RASCUNHO"
  | "CONFIRMADO"
  | "EM_MONTAGEM"
  | "MONTADO"
  | "DESMONTADO"
  | "CONCLUIDO"
  | "CANCELADO";

export type StatusRepasseBolas = "PENDENTE" | "PAGO";
export type StatusPagamentoBolas = "PENDENTE" | "CONFIRMADO" | "ESTORNADO";

export interface CatalogoBola {
  id: string;
  nome: string;
  descricao: string | null;
  valorTabela: string | number;
  ativo: boolean;
  ordem: number;
}

export interface PedidoBolasItem {
  id: string;
  nome: string;
  quantidade: number;
  valorTabelaUnit: string | number;
  valorClienteUnit: string | number;
  catalogoBolaId?: string | null;
}

export interface PedidoBolasCompra {
  id: string;
  descricao: string;
  quantidade: string | null;
  comprado: boolean;
  criadoEm: string;
  pedidoId: string;
}

export interface PedidoBolasMidia {
  id: string;
  mimeType: string;
  tamanho: number;
  tipo: string;
  filename: string | null;
  criadoEm: string;
}

export interface PedidoBolas {
  id: string;
  dataEvento: string;
  horarioMontagem: string;
  horarioDesmontagem: string | null;
  tema: string;
  endereco: string;
  clienteNome: string;
  clienteTelefone: string;
  observacoes: string | null;
  cores: string | null;
  instrucoes: string | null;
  valorTabela: string | number;
  valorCliente: string | number;
  taxaEmpresa: string | number;
  markupPercentual: string | number;
  status: StatusPedidoBolas;
  montagemConcluida: boolean;
  desmontagemConcluida: boolean;
  statusPagamentoCliente: StatusPagamentoBolas;
  statusRepasse: StatusRepasseBolas;
  repassadoEm: string | null;
  repasseObs: string | null;
  festaId: string | null;
  bolistaId: string;
  itens: PedidoBolasItem[];
  compras?: PedidoBolasCompra[];
  midias?: PedidoBolasMidia[];
  bolista?: { id: string; nome: string };
  festa?: {
    id: string;
    status: string;
    valor: string | number;
    tema: string;
    dataEvento: string;
  } | null;
}

export interface CreatePedidoBolasPayload {
  festaId?: string | null;
  dataEvento: string;
  horarioMontagem: string;
  horarioDesmontagem?: string | null;
  tema: string;
  endereco: string;
  clienteNome: string;
  clienteTelefone: string;
  observacoes?: string | null;
  cores?: string | null;
  instrucoes?: string | null;
  itens: {
    catalogoBolaId?: string | null;
    nome?: string;
    quantidade?: number;
    valorTabelaUnit?: number;
  }[];
  midiaIds?: string[];
}

export interface BolasFinanceiroResumo {
  aReceber: {
    total: number;
    quantidade: number;
    itens: Array<{
      id: string;
      valorTabela: string | number;
      clienteNome: string;
      tema: string;
      dataEvento: string;
      statusPagamentoCliente: StatusPagamentoBolas;
    }>;
  };
  pagos: {
    total: number;
    quantidade: number;
    itens: Array<{
      id: string;
      valorTabela: string | number;
      clienteNome: string;
      tema: string;
      dataEvento: string;
    }>;
  };
  taxaEmpresaTotal: number;
}

export interface PedidoBolasResumoFesta {
  id: string;
  valorTabela: string | number;
  valorCliente: string | number;
  taxaEmpresa: string | number;
  status: StatusPedidoBolas;
  statusRepasse?: StatusRepasseBolas;
  cores?: string | null;
  tema?: string;
  itens?: PedidoBolasItem[];
  bolista?: { id: string; nome: string };
  midias?: Array<{
    id: string;
    tipo: string;
    mimeType: string;
    filename?: string | null;
  }>;
}

export interface BolasComprasPedido {
  id: string;
  dataEvento: string;
  clienteNome: string;
  tema: string;
  cores: string | null;
  itens: string[];
  compras: PedidoBolasCompra[];
  pendentes: number;
}
