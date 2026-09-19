import {
  cancelarPush,
  getPushChavePublica,
  inscreverPush,
} from "@/lib/api";
import type { PlataformaPush } from "@/types/push";

export const SW_URL = "/sw.js";

export type StatusPermissao = NotificationPermission | "indisponivel";

export interface DiagnosticoPwa {
  plataforma: PlataformaPush;
  /** iOS/iPadOS — muda as instruções de instalação e a regra do push. */
  ehIos: boolean;
  /** Rodando como app instalado (sem barra do navegador). */
  instalado: boolean;
  /** O navegador tem Service Worker + Push API. */
  suportaPush: boolean;
  /**
   * No iOS, o push só existe depois de instalar na tela de início.
   * Fora do iOS funciona direto no navegador.
   */
  precisaInstalarParaPush: boolean;
  permissao: StatusPermissao;
  versaoIos: number | null;
}

/** Converte a chave VAPID (base64url) para o formato que o navegador exige. */
function base64UrlParaUint8Array(base64Url: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const saida = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) {
    saida[i] = raw.charCodeAt(i);
  }
  return saida;
}

function arrayBufferParaBase64Url(buffer: ArrayBuffer | null): string {
  if (!buffer) return "";
  const bytes = new Uint8Array(buffer);
  let binario = "";
  for (const byte of bytes) binario += String.fromCharCode(byte);
  return window
    .btoa(binario)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function ehIos(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  // iPadOS 13+ se identifica como Mac; o toque é o que denuncia.
  const ipadDisfarcado =
    /Macintosh/.test(ua) && typeof document !== "undefined" && "ontouchend" in document;
  return /iPad|iPhone|iPod/.test(ua) || ipadDisfarcado;
}

/** Versão principal do iOS (push exige 16.4+). */
export function versaoIos(): number | null {
  if (typeof navigator === "undefined") return null;
  const match = navigator.userAgent.match(/OS (\d+)[._](\d+)/);
  if (!match) return null;
  return Number(`${match[1]}.${match[2]}`);
}

export function detectarPlataforma(): PlataformaPush {
  if (ehIos()) return "ios";
  if (typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent)) {
    return "android";
  }
  return "desktop";
}

/** Nome amigável do aparelho, só para a pessoa se reconhecer na lista. */
export function nomeAparelho(): string {
  if (typeof navigator === "undefined") return "Aparelho";
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Android/.test(ua)) {
    const modelo = ua.match(/Android[^;]*;\s*([^;)]+)/);
    return modelo ? `Android (${modelo[1].trim()})` : "Android";
  }
  if (/Macintosh/.test(ua)) return "Mac";
  if (/Windows/.test(ua)) return "Windows";
  return "Navegador";
}

export function estaInstalado(): boolean {
  if (typeof window === "undefined") return false;
  const standalone = window.matchMedia?.("(display-mode: standalone)").matches;
  const iosStandalone = (
    window.navigator as Navigator & { standalone?: boolean }
  ).standalone;
  return Boolean(standalone || iosStandalone);
}

export function suportaPush(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function diagnosticar(): DiagnosticoPwa {
  const ios = ehIos();
  const instalado = estaInstalado();
  const suporte = suportaPush();

  return {
    plataforma: detectarPlataforma(),
    ehIos: ios,
    instalado,
    suportaPush: suporte,
    // No iOS a Push API só aparece dentro do app instalado.
    precisaInstalarParaPush: ios && !instalado,
    permissao:
      typeof window !== "undefined" && "Notification" in window
        ? Notification.permission
        : "indisponivel",
    versaoIos: ios ? versaoIos() : null,
  };
}

export async function registrarServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  try {
    const registro = await navigator.serviceWorker.register(SW_URL, {
      scope: "/",
    });
    return registro;
  } catch (error) {
    console.warn("[pwa] falha ao registrar service worker:", error);
    return null;
  }
}

async function registroPronto(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  const existente = await navigator.serviceWorker.getRegistration("/");
  if (existente) return existente;
  return registrarServiceWorker();
}

export async function inscricaoAtual(): Promise<PushSubscription | null> {
  if (!suportaPush()) return null;
  const registro = await registroPronto();
  if (!registro) return null;
  return registro.pushManager.getSubscription();
}

export class PushIndisponivelError extends Error {}
export class PushPermissaoNegadaError extends Error {}

/**
 * Pede permissão e registra o aparelho no backend.
 * Deve ser chamada a partir de um toque do usuário — o iOS exige isso.
 */
export async function ativarPush(token: string): Promise<PushSubscription> {
  if (!suportaPush()) {
    throw new PushIndisponivelError(
      ehIos()
        ? "No iPhone, instale o app na tela de início primeiro."
        : "Este navegador não suporta notificações."
    );
  }

  const { habilitado, chavePublica } = await getPushChavePublica(token);
  if (!habilitado || !chavePublica) {
    throw new PushIndisponivelError(
      "Notificações ainda não configuradas no servidor (chaves VAPID)."
    );
  }

  const permissao = await Notification.requestPermission();
  if (permissao !== "granted") {
    throw new PushPermissaoNegadaError(
      "Permissão negada. Libere em Ajustes > Notificações > DJ festas."
    );
  }

  const registro = await registroPronto();
  if (!registro) {
    throw new PushIndisponivelError("Service worker não disponível.");
  }

  const existente = await registro.pushManager.getSubscription();
  const inscricao =
    existente ??
    (await registro.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlParaUint8Array(chavePublica),
    }));

  await inscreverPush(
    {
      endpoint: inscricao.endpoint,
      keys: {
        p256dh: arrayBufferParaBase64Url(inscricao.getKey("p256dh")),
        auth: arrayBufferParaBase64Url(inscricao.getKey("auth")),
      },
      aparelho: nomeAparelho(),
      plataforma: detectarPlataforma(),
    },
    token
  );

  return inscricao;
}

export async function desativarPush(token: string): Promise<void> {
  const inscricao = await inscricaoAtual();
  if (!inscricao) return;

  const { endpoint } = inscricao;
  await inscricao.unsubscribe().catch(() => undefined);
  await cancelarPush(endpoint, token);
}
