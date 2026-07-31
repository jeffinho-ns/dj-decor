export type TipoMidia =
  | "REFERENCIA_FESTA"
  | "CLIENTE_REFERENCIA"
  | "ITEM"
  | "COMPROVANTE_PIX"
  | "MONTAGEM_FINAL"
  | "CONTRATO"
  | "LOGO_EMPRESA"
  | "CATALOGO_ITEM"
  | "ASSINATURA_CLIENTE";

export interface Midia {
  id: string;
  mimeType: string;
  tamanho: number;
  tipo: TipoMidia;
  filename: string | null;
  criadoEm: string;
  festaId: string | null;
  uploadedById: string | null;
}
