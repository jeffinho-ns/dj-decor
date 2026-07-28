"use client";

import { Moon, Sun } from "lucide-react";

import { useTheme } from "@/components/theme/theme-provider";
import { cn } from "@/lib/utils";
import type { Theme } from "@/lib/theme";

const OPTIONS: {
  value: Theme;
  label: string;
  description: string;
  icon: typeof Sun;
  tone: string;
}[] = [
  {
    value: "light",
    label: "Claro",
    description: "Fundo festivo claro com neomorfismo suave.",
    icon: Sun,
    tone: "neo-sun",
  },
  {
    value: "dark",
    label: "Escuro",
    description: "Noite de festa com balões iluminados.",
    icon: Moon,
    tone: "neo-lilac",
  },
];

export function ThemeSettings() {
  const { theme, setTheme, ready } = useTheme();

  return (
    <section className="space-y-4">
      <div className="rounded-2xl neo-sm p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <span className="balloon-dot bg-balloon-pink" />
          <span className="balloon-dot bg-balloon-sky" />
          <span className="balloon-dot bg-balloon-lilac" />
          <h2 className="font-display text-xl text-foreground">Aparência</h2>
        </div>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Escolha o tema do aplicativo. A preferência fica salva neste
          dispositivo.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {OPTIONS.map((option) => {
            const Icon = option.icon;
            const selected = ready && theme === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setTheme(option.value)}
                aria-pressed={selected}
                className={cn(
                  "group relative flex flex-col items-start gap-3 rounded-2xl p-4 text-left transition-all neo-press",
                  selected ? "neo-sm ring-2 ring-balloon-pink/70" : "neo-inset"
                )}
              >
                <span
                  className={cn(
                    "flex size-11 items-center justify-center rounded-2xl",
                    option.tone
                  )}
                >
                  <Icon className="size-5" />
                </span>
                <span>
                  <span className="block font-display text-lg text-foreground">
                    {option.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {option.description}
                  </span>
                </span>
                <span
                  className={cn(
                    "absolute right-3 top-3 size-2.5 rounded-full transition-colors",
                    selected
                      ? "bg-balloon-pink shadow-[0_0_0_3px_rgba(255,92,138,0.25)]"
                      : "bg-muted-foreground/25"
                  )}
                />
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
