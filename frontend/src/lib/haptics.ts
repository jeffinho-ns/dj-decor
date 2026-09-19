/**
 * Feedback tátil nas ações do app.
 *
 * Android responde à Vibration API. O Safari no iOS não implementa
 * `navigator.vibrate` — lá o retorno continua sendo só visual, e essa é
 * hoje a principal diferença sensorial entre o PWA e um app nativo.
 */

export type Toque = "leve" | "sucesso" | "erro" | "alerta";

const PADROES: Record<Toque, number | number[]> = {
  leve: 12,
  sucesso: [18, 40, 28],
  erro: [60, 50, 60],
  alerta: [30, 60, 30, 60, 30],
};

export function suportaVibracao(): boolean {
  return typeof navigator !== "undefined" && "vibrate" in navigator;
}

export function vibrar(toque: Toque = "leve"): void {
  if (!suportaVibracao()) return;
  try {
    navigator.vibrate(PADROES[toque]);
  } catch {
    // Alguns navegadores bloqueiam sem gesto do usuário — silencioso de propósito.
  }
}
