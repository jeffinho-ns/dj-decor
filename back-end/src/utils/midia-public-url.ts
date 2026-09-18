import { createHmac, timingSafeEqual } from "crypto";
import { env } from "../config/env";

const DEFAULT_TTL_SEC = 60 * 60; // 1h — Meta precisa baixar a imagem

function signingSecret(): string {
  return (
    env.IA_SERVICE_TOKEN ||
    env.JWT_SECRET ||
    "dj-decor-midia-public"
  );
}

export function publicApiBaseUrl(): string {
  const fromEnv =
    process.env.PUBLIC_API_URL?.trim() ||
    process.env.RENDER_EXTERNAL_URL?.trim() ||
    "";
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return "https://dj-decor.onrender.com";
}

/** URL que a Meta consegue baixar sem header de auth. */
export function buildPublicMidiaUrl(
  midiaId: string,
  ttlSec = DEFAULT_TTL_SEC
): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  const payload = `${midiaId}:${exp}`;
  const sig = createHmac("sha256", signingSecret())
    .update(payload)
    .digest("hex");
  return `${publicApiBaseUrl()}/api/public/midias/${midiaId}?exp=${exp}&sig=${sig}`;
}

export function verifyPublicMidiaSig(
  midiaId: string,
  expRaw: string,
  sig: string
): boolean {
  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp * 1000 < Date.now()) return false;
  const payload = `${midiaId}:${exp}`;
  const expected = createHmac("sha256", signingSecret())
    .update(payload)
    .digest("hex");
  try {
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(String(sig || ""), "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
