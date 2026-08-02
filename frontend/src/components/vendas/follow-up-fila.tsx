"use client";

import { useEffect, useState, useTransition } from "react";
import { format, isBefore, isToday, parseISO, startOfDay } from "date-fns";
import { Loader2, MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listFollowUps, registrarFollowUp } from "@/lib/api";
import { toLocalDateValue } from "@/lib/date";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

interface FollowUpItem {
  id: string;
  tema: string;
  status: string;
  valor: number | string;
  criadoEm: string;
  proximoContatoEm: string | null;
  cliente: { nome: string; telefone: string };
  vendedor: { nome: string };
  risco: { score: number; nivel: string; fatores: string[] };
  followUps: Array<{
    id: string;
    criadoEm: string;
    nota: string | null;
    proximoContatoEm: string | null;
  }>;
}

interface FollowUpFilaProps {
  token: string;
}

function badgeProximoContato(proximo: string | null): "atrasado" | "hoje" | null {
  if (!proximo) return null;
  const date = parseISO(proximo);
  if (isBefore(startOfDay(date), startOfDay(new Date()))) return "atrasado";
  if (isToday(date)) return "hoje";
  return null;
}

export function FollowUpFila({ token }: FollowUpFilaProps) {
  const [items, setItems] = useState<FollowUpItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [somenteMeus, setSomenteMeus] = useState(false);
  const [proximasDatas, setProximasDatas] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function reload(minhas = somenteMeus) {
    return listFollowUps(token, { minhas }).then((data) =>
      setItems(data as FollowUpItem[])
    );
  }

  useEffect(() => {
    reload(somenteMeus).catch((err) =>
      setError(err instanceof Error ? err.message : "Falha ao carregar")
    );
  }, [token, somenteMeus]);

  function registrar(
    festaId: string,
    payload: { canal: string; nota: string }
  ) {
    const proximoContatoEm = proximasDatas[festaId]?.trim() || null;
    startTransition(async () => {
      await registrarFollowUp(
        festaId,
        {
          ...payload,
          proximoContatoEm: proximoContatoEm || undefined,
        },
        token
      );
      setProximasDatas((prev) => {
        const next = { ...prev };
        delete next[festaId];
        return next;
      });
      await reload();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl neo-sm px-4 py-3">
        <p className="text-sm text-muted-foreground">
          Prioridade para contatos atrasados e de hoje.
        </p>
        <button
          type="button"
          role="switch"
          aria-checked={somenteMeus}
          onClick={() => setSomenteMeus((v) => !v)}
          className={cn(
            "min-h-10 rounded-2xl px-4 text-sm font-medium transition-all neo-press",
            somenteMeus
              ? "neo-pink text-white"
              : "neo-inset text-muted-foreground"
          )}
        >
          Só meus
        </button>
      </div>

      {items.length === 0 ? (
        <p className="rounded-2xl neo-inset px-4 py-10 text-center text-sm text-muted-foreground">
          {somenteMeus
            ? "Nenhum orçamento seu na fila de follow-up."
            : "Nenhum orçamento na fila de follow-up."}
        </p>
      ) : (
        items.map((item) => {
          const badge = badgeProximoContato(item.proximoContatoEm);

          return (
            <article key={item.id} className="space-y-2 rounded-2xl neo-sm p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{item.cliente.nome}</p>
                  <p className="text-sm text-balloon-pink">{item.tema}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.cliente.telefone} · {item.vendedor.nome} ·{" "}
                    {formatCurrency(item.valor)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {badge === "atrasado" ? (
                    <span className="rounded-lg bg-destructive/15 px-2 py-0.5 text-[11px] font-semibold text-destructive">
                      Atrasado
                    </span>
                  ) : null}
                  {badge === "hoje" ? (
                    <span className="rounded-lg bg-balloon-sky/15 px-2 py-0.5 text-[11px] font-semibold text-balloon-sky">
                      Hoje
                    </span>
                  ) : null}
                  <span className="rounded-lg bg-balloon-sun/15 px-2 py-0.5 text-[11px] font-medium text-balloon-sun">
                    Risco {item.risco.nivel} ({item.risco.score})
                  </span>
                </div>
              </div>

              {item.proximoContatoEm && !badge ? (
                <p className="text-xs text-muted-foreground">
                  Próximo contato:{" "}
                  {format(parseISO(item.proximoContatoEm), "dd/MM/yyyy")}
                </p>
              ) : null}

              {item.risco.fatores?.length ? (
                <ul className="list-disc pl-4 text-xs text-muted-foreground">
                  {item.risco.fatores.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              ) : null}

              <div className="space-y-1.5">
                <Label htmlFor={`proximo-${item.id}`}>Próximo contato</Label>
                <Input
                  id={`proximo-${item.id}`}
                  type="date"
                  min={toLocalDateValue(new Date())}
                  value={proximasDatas[item.id] ?? ""}
                  onChange={(e) =>
                    setProximasDatas((prev) => ({
                      ...prev,
                      [item.id]: e.target.value,
                    }))
                  }
                  disabled={pending}
                />
              </div>

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
                    registrar(item.id, {
                      canal: "WHATSAPP",
                      nota: "Contato via WhatsApp",
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
                  onClick={() =>
                    registrar(item.id, {
                      canal: "LIGACAO",
                      nota: "Ligação registrada",
                    })
                  }
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
          );
        })
      )}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
