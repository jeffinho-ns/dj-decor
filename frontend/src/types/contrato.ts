export type StatusMensagemWhatsApp = "PENDENTE" | "ENVIADA" | "FALHA";

export interface Contrato {
  id: string;
  festaId: string;
  geradoEm: string;
  /** Indica se o PDF já pode ser baixado (quando o backend renderizou). */
  pdfDisponivel?: boolean;
}

export interface MensagemWhatsApp {
  id: string;
  template: string;
  telefone?: string | null;
  status: StatusMensagemWhatsApp;
  erro?: string | null;
  criadoEm: string;
  enviadoEm?: string | null;
  festaId?: string | null;
}
