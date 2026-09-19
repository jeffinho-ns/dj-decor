export type PlataformaPush = "ios" | "android" | "desktop";

export interface PushChavePublica {
  habilitado: boolean;
  chavePublica: string | null;
}

export interface PushInscricao {
  id: string;
  aparelho: string | null;
  plataforma: PlataformaPush | null;
  criadoEm: string;
  ultimoEnvioEm?: string | null;
}

export interface PushInscreverPayload {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  aparelho?: string;
  plataforma?: PlataformaPush;
}

export interface PushEnvioResultado {
  enviados: number;
  removidos: number;
}
