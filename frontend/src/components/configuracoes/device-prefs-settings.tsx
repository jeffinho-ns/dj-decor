"use client";

import { useEffect, useState } from "react";
import { Home } from "lucide-react";

import {
  homeOptionsForRole,
  readPrefs,
  writePrefs,
  defaultHomeForRole,
  type HomePath,
} from "@/lib/prefs";
import { cn } from "@/lib/utils";
import type { Role } from "@/types/auth";

interface DevicePrefsSettingsProps {
  role: Role;
}

export function DevicePrefsSettings({ role }: DevicePrefsSettingsProps) {
  const options = homeOptionsForRole(role);
  const [homePath, setHomePath] = useState<HomePath>(defaultHomeForRole(role));
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const prefs = readPrefs();
    const allowed = homeOptionsForRole(role).map((o) => o.value);
    if (prefs && allowed.includes(prefs.homePath)) {
      setHomePath(prefs.homePath);
    } else {
      setHomePath(defaultHomeForRole(role));
    }
    setReady(true);
  }, [role]);

  function choose(path: HomePath) {
    setHomePath(path);
    writePrefs({ homePath: path });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  }

  return (
    <section className="rounded-2xl p-5 sm:p-6 neo-sm">
      <div className="flex items-center gap-2">
        <Home className="size-5 text-balloon-sky" />
        <h2 className="font-display text-xl text-foreground">
          Preferências deste dispositivo
        </h2>
      </div>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Escolha a tela inicial após o login. Fica salva só neste aparelho.
      </p>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {options.map((option) => {
          const selected = ready && homePath === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => choose(option.value)}
              aria-pressed={selected}
              className={cn(
                "rounded-2xl px-4 py-3 text-left text-sm font-medium transition-all neo-press",
                selected
                  ? "neo-sm ring-2 ring-balloon-sky/60 text-foreground"
                  : "neo-inset text-muted-foreground hover:text-foreground"
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {saved ? (
        <p className="mt-3 text-xs text-balloon-mint">Preferência salva.</p>
      ) : null}
    </section>
  );
}
