import { randomBytes } from "node:crypto";

/** Token opaco para links públicos do portal do cliente. */
export function generatePortalToken(): string {
  return randomBytes(24).toString("base64url");
}
