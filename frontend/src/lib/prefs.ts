import type { Role } from "@/types/auth";

export const PREFS_STORAGE_KEY = "dj-prefs";
export const HOME_COOKIE = "dj_home";

export type HomePath = "/dashboard" | "/montagem" | "/vendas";

export interface DevicePrefs {
  homePath: HomePath;
}

const DEFAULT_HOME: Record<Role, HomePath> = {
  MONTADOR: "/montagem",
  VENDEDOR: "/dashboard",
  GERENTE: "/dashboard",
  ADMIN: "/dashboard",
};

const ALLOWED_BY_ROLE: Record<Role, HomePath[]> = {
  MONTADOR: ["/montagem", "/dashboard"],
  VENDEDOR: ["/dashboard", "/vendas"],
  GERENTE: ["/dashboard", "/vendas", "/montagem"],
  ADMIN: ["/dashboard", "/vendas", "/montagem"],
};

const HOME_LABELS: Record<HomePath, string> = {
  "/dashboard": "Agenda",
  "/montagem": "Montagem",
  "/vendas": "Vendas",
};

export function defaultHomeForRole(role: Role): HomePath {
  return DEFAULT_HOME[role];
}

export function homeOptionsForRole(role: Role): { value: HomePath; label: string }[] {
  return ALLOWED_BY_ROLE[role].map((value) => ({
    value,
    label: HOME_LABELS[value],
  }));
}

export function isAllowedHome(role: Role, path: string): path is HomePath {
  return (ALLOWED_BY_ROLE[role] as string[]).includes(path);
}

function writeHomeCookie(path: HomePath): void {
  if (typeof document === "undefined") return;
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "; secure"
      : "";
  document.cookie = `${HOME_COOKIE}=${encodeURIComponent(
    path
  )}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax${secure}`;
}

export function readPrefs(): DevicePrefs | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DevicePrefs>;
    if (
      parsed.homePath === "/dashboard" ||
      parsed.homePath === "/montagem" ||
      parsed.homePath === "/vendas"
    ) {
      return { homePath: parsed.homePath };
    }
    return null;
  } catch {
    return null;
  }
}

export function writePrefs(prefs: DevicePrefs): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
  writeHomeCookie(prefs.homePath);
}

export function resolveHomePath(
  role: Role,
  cookieValue?: string | null
): HomePath {
  if (cookieValue) {
    const decoded = decodeURIComponent(cookieValue);
    if (isAllowedHome(role, decoded)) return decoded;
  }
  return defaultHomeForRole(role);
}
