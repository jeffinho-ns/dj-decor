export type TipoMidia =
  | "REFERENCIA_FESTA"
  | "ITEM"
  | "COMPROVANTE_PIX"
  | "MONTAGEM_FINAL"
  | "CONTRATO";

export interface Midia {
  id: string;
  mimeType: string;
  tamanho: number;
  tipo: TipoMidia;
  filename: string | null;
  criadoEm: string;
  festaId: string | null;
  uploadedById: string;
}
