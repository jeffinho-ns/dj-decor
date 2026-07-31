"use client";

import { useEffect, useState, useTransition } from "react";
import { format, parseISO } from "date-fns";
import { Loader2, MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { listFollowUps, registrarFollowUp } from "@/lib/api";
import { formatCurrency } from "@/lib/format";

interface FollowUpItem {
  id: string;
  tema: string;
  status: string;
  valor: number | string;
  criadoEm: string;
  cliente: { nome: string; telefone: string };
  vendedor: { nome: string };
  risco: { score: number; nivel: string; fatores: string[] };
  followUps: Array<{ id: string; criadoEm: string; nota: string | null }>;
}

interface FollowUpFilaProps {
  token: string;
}

export function FollowUpFila({ token }: FollowUpFilaProps) {
  const [items, setItems] = useState<FollowUpItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reload() {
    return listFollowUps(token).then((data) =>
      setItems(data as FollowUpItem[])
    );
  }

  useEffect(() => {
    reload().catch((err) =>
      setError(err instanceof Error ? err.message : "Falha ao carregar")
    );
  }, [token]);

  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <p className="rounded-2xl neo-inset px-4 py-10 text-center text-sm text-muted-foreground">
          Nenhum orçamento na fila de follow-up.
        </p>
      ) : (
        items.map((item) => (
          <article key={item.id} className="rounded-2xl neo-sm p-4 space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium">{item.cliente.nome}</p>
                <p className="text-sm text-balloon-pink">{item.tema}</p>
                <p className="text-xs text-muted-foreground">
                  {item.cliente.telefone} · {item.vendedor.nome} ·{" "}
                  {formatCurrency(item.valor)}
                </p>
              </div>
              <span className="rounded-lg bg-balloon-sun/15 px-2 py-0.5 text-[11px] font-medium text-balloon-sun">
                Risco {item.risco.nivel} ({item.risco.score})
              </span>
            </div>
            {item.risco.fatores?.length ? (
              <ul className="list-disc pl-4 text-xs text-muted-foreground">
                {item.risco.fatores.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            ) : null}
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button
                type="button"
                size="xs"
                variant="outline"
                className="min-h-10 w-full gap-1 sm:w-auto"
                disabled={pending}
                onClick={() => {
                  const phone = item.cliente.telefone.replace(/\D/g, "");
                  window.open(`https://wa.me/55${phone}`, "_blank");
                  startTransition(async () => {
                    await registrarFollowUp(
                      item.id,
                      { canal: "WHATSAPP", nota: "Contato via WhatsApp" },
                      token
                    );
                    await reload();
                  });
                }}
              >
                <MessageCircle className="size-3.5" />
                WhatsApp
              </Button>
              <Button
                type="button"
                size="xs"
                variant="secondary"
                className="min-h-10 w-full sm:w-auto"
                disabled={pending}
                onClick={() => {
                  startTransition(async () => {
                    await registrarFollowUp(
                      item.id,
                      { canal: "LIGACAO", nota: "Ligação registrada" },
                      token
                    );
                    await reload();
                  });
                }}
              >
                {pending ? <Loader2 className="size-3 animate-spin" /> : null}
                Registrar contato
              </Button>
            </div>
            {item.followUps[0] ? (
              <p className="text-[11px] text-muted-foreground">
                Último contato:{" "}
                {format(parseISO(item.followUps[0].criadoEm), "dd/MM HH:mm")}
                {item.followUps[0].nota ? ` — ${item.followUps[0].nota}` : ""}
              </p>
            ) : null}
          </article>
        ))
      )}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
