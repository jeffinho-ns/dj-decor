export type CanalAtendimento = "WHATSAPP" | "INSTAGRAM" | "MANUAL";
export type ModoAtendimento = "AI" | "HUMANO" | "HIBRIDO";
export type StatusConversa = "ABERTA" | "AGUARDANDO" | "FECHADA";
export type DirecaoMensagem = "IN" | "OUT";

export interface ConversaListItem {
  id: string;
  canal: CanalAtendimento;
  externalThreadId: string;
  contatoExterno: string | null;
  contatoNome: string | null;
  modo: ModoAtendimento;
  status: StatusConversa;
  ultimaMensagemEm: string | null;
  resumo: string | null;
  criadoEm: string;
  atualizadoEm: string;
  clienteId: string | null;
  vendedorId: string | null;
  festaId: string | null;
  cliente: { id: string; nome: string; telefone: string } | null;
  vendedor: { id: string; nome: string; role: string } | null;
  festa: {
    id: string;
    tema: string;
    status: string;
    valor: string | number;
    dataEvento: string;
    notasInternas?: string | null;
  } | null;
  notasInternas?: string | null;
  _count: { mensagens: number };
}

export interface MensagemCanal {
  id: string;
  direcao: DirecaoMensagem;
  texto: string | null;
  midiaUrl: string | null;
  midiaMimeType: string | null;
  providerMessageId: string | null;
  statusEnvio: string | null;
  autorTipo: string;
  criadoEm: string;
  conversaId: string;
  festaId: string | null;
}

export interface AtendimentoEvento {
  id: string;
  tipo: string;
  payload: unknown;
  criadoEm: string;
  autor: { id: string; nome: string } | null;
}

export interface ConversaDetalhe extends ConversaListItem {
  mensagens: MensagemCanal[];
  eventos: AtendimentoEvento[];
}

export interface AtendimentoMetricas {
  abertas: number;
  ai: number;
  humanas: number;
  fechadasHoje: number;
  agentEnabled: boolean;
  agentProvider?: "groq" | "openai" | null;
}

export interface AtendimentoVendedor {
  id: string;
  nome: string;
  role: string;
  telefone: string | null;
}
