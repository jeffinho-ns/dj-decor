"use client";

import { Info } from "lucide-react";

interface SobreAppProps {
  nomeEmpresa?: string | null;
}

export function SobreApp({ nomeEmpresa }: SobreAppProps) {
  return (
    <section className="rounded-2xl p-5 sm:p-6 neo-sm">
      <div className="flex items-center gap-2">
        <Info className="size-5 text-balloon-lilac" />
        <h2 className="font-display text-xl text-foreground">Sobre</h2>
      </div>
      <p className="mt-3 text-sm text-foreground">
        {nomeEmpresa?.trim() || "DJ Decor"} — operação de festas e montagem.
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        App interno da equipe. Se ainda usa senha temporária, troque em Perfil.
      </p>
    </section>
  );
}
