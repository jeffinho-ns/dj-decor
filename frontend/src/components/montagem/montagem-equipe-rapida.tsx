"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, Users } from "lucide-react";

import { assignMontadorOs, listMontadores } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Montador } from "@/types/equipe";
import type { OrdemServico } from "@/types/os";

interface MontagemEquipeRapidaProps {
  os: OrdemServico;
  token: string;
  canEdit: boolean;
  onUpdated: (os: OrdemServico) => void;
  className?: string;
}

export function MontagemEquipeRapida({
  os,
  token,
  canEdit,
  onUpdated,
  className,
}: MontagemEquipeRapidaProps) {
  const [pessoas, setPessoas] = useState<Montador[]>([]);
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!canEdit) return;
    let cancelled = false;
    void listMontadores(token)
      .then((lista) => {
        if (!cancelled) setPessoas(lista);
      })
      .catch(() => {
        if (!cancelled) setPessoas([]);
      });
    return () => {
      cancelled = true;
    };
  }, [canEdit, token]);

  if (!canEdit) return null;

  function atribuir(
    campo: "montadorId" | "desmontadorId",
    value: string | null
  ) {
    setErro(null);
    startTransition(async () => {
      try {
        const updated = await assignMontadorOs(
          os.id,
          { [campo]: value },
          token
        );
        onUpdated(updated);
      } catch (err) {
        setErro(
          err instanceof Error ? err.message : "Falha ao trocar equipe"
        );
      }
    });
  }

  return (
    <section className={cn("rounded-2xl p-4 neo-sm sm:p-5", className)}>
      <div className="flex items-center gap-2">
        <Users className="size-4 text-balloon-sky" />
        <h3 className="font-display text-base text-foreground">
          Equipe desta OS
        </h3>
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-xs">
          <span className="text-muted-foreground">Montador</span>
          <select
            className="flex h-10 w-full rounded-xl border-0 bg-[var(--neo-bg)] px-3 text-sm shadow-[var(--shadow-neo-inset)] outline-none focus-visible:ring-2 focus-visible:ring-balloon-sky/30"
            value={os.montadorId ?? ""}
            disabled={pending}
            onChange={(e) =>
              atribuir("montadorId", e.target.value || null)
            }
          >
            <option value="">Sem montador</option>
            {pessoas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-xs">
          <span className="text-muted-foreground">Desmontador</span>
          <select
            className="flex h-10 w-full rounded-xl border-0 bg-[var(--neo-bg)] px-3 text-sm shadow-[var(--shadow-neo-inset)] outline-none focus-visible:ring-2 focus-visible:ring-balloon-sky/30"
            value={os.desmontadorId ?? ""}
            disabled={pending}
            onChange={(e) =>
              atribuir("desmontadorId", e.target.value || null)
            }
          >
            <option value="">Sem desmontador</option>
            {pessoas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </label>
      </div>
      {erro ? <p className="mt-2 text-xs text-destructive">{erro}</p> : null}
    </section>
  );
}
