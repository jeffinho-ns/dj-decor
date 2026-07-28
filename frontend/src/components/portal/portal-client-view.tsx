"use client";

import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarDays,
  Check,
  Clock,
  Loader2,
  MapPin,
  PartyPopper,
  Share2,
  Sparkles,
} from "lucide-react";

import { getPortalStatus } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { PortalFestaStatus, PortalTimelineStep } from "@/types/os";

const STATUS_LABEL: Record<string, string> = {
  ORCAMENTO: "Orçamento",
  AGUARDANDO_PAGAMENTO: "Aguardando pagamento",
  PAGO: "Pago",
  FECHADO: "Fechado",
  EM_MONTAGEM: "Em montagem",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
};

const STATUS_BADGE: Record<string, string> = {
  ORCAMENTO: "border-champagne/40 bg-champagne/12 text-champagne",
  AGUARDANDO_PAGAMENTO: "border-amber-400/40 bg-amber-400/12 text-amber-200",
  PAGO: "border-emerald-400/40 bg-emerald-400/12 text-emerald-200",
  FECHADO: "border-status-closed/40 bg-status-closed/12 text-status-closed",
  EM_MONTAGEM: "border-sky-400/40 bg-sky-400/12 text-sky-200",
  CONCLUIDO: "border-status-done/40 bg-status-done/12 text-status-done",
  CANCELADO: "border-destructive/40 bg-destructive/12 text-destructive",
};

interface PortalPageProps {
  festaId: string | null;
}

function findCurrentStepIndex(timeline: PortalTimelineStep[]): number {
  const firstPending = timeline.findIndex((step) => !step.done);
  if (firstPending >= 0) return firstPending;
  return timeline.length - 1;
}

export function PortalClientView({ festaId }: PortalPageProps) {
  const [loading, setLoading] = useState(Boolean(festaId));
  const [erro, setErro] = useState<string | null>(null);
  const [data, setData] = useState<PortalFestaStatus | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!festaId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setErro(null);
    getPortalStatus(festaId)
      .then(setData)
      .catch((err) => {
        setErro(
          err instanceof Error ? err.message : "Não foi possível carregar"
        );
      })
      .finally(() => setLoading(false));
  }, [festaId]);

  const currentStepIndex = useMemo(
    () => (data ? findCurrentStepIndex(data.timeline) : -1),
    [data]
  );

  async function handleShare() {
    if (!festaId || typeof window === "undefined") return;
    const url = `${window.location.origin}/portal?id=${festaId}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: data?.tema ?? "Sua festa — DJ Decor",
          text: "Acompanhe a decoração da sua festa",
          url,
        });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* usuário cancelou ou clipboard indisponível */
    }
  }

  if (!festaId) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-5 py-16 text-center">
        <div className="rounded-full bg-champagne/10 p-4 ring-1 ring-champagne/20">
          <PartyPopper className="size-10 text-champagne" />
        </div>
        <h1 className="mt-5 font-display text-2xl text-foreground">
          Portal do cliente
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Use o link enviado pela equipe DJ Decor para acompanhar sua festa.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Loader2 className="size-9 animate-spin text-champagne" />
      </div>
    );
  }

  if (erro || !data) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-5 py-16 text-center">
        <p className="text-sm text-destructive">
          {erro ?? "Festa não encontrada"}
        </p>
      </div>
    );
  }

  const statusLabel = STATUS_LABEL[data.status] ?? data.status;
  const statusBadge =
    STATUS_BADGE[data.status] ??
    "border-border/60 bg-muted/40 text-muted-foreground";

  return (
    <div className="relative mx-auto min-h-screen max-w-lg px-4 pb-12 pt-8 sm:px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-champagne/8 to-transparent"
      />

      <header className="relative text-center">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-champagne/80">
          DJ Decor
        </p>
        <h1 className="mt-2 font-display text-2xl leading-tight text-foreground sm:text-3xl">
          Olá, {data.clienteNomePrimeiro}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Acompanhe sua decoração
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
              statusBadge
            )}
          >
            <Sparkles className="size-3.5" />
            {statusLabel}
          </span>
          <button
            type="button"
            onClick={() => void handleShare()}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-border/60 bg-card/50 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-champagne/40 hover:text-foreground"
          >
            <Share2 className="size-3.5" />
            {copied ? "Link copiado!" : "Compartilhar"}
          </button>
        </div>
      </header>

      <article className="relative mt-8 space-y-4 rounded-2xl border border-border/60 bg-card/50 p-5 shadow-lg shadow-black/20 backdrop-blur-sm">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Tema
          </p>
          <p className="mt-1 text-lg font-medium leading-snug text-foreground">
            {data.tema}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-start gap-2.5 rounded-xl bg-muted/30 px-3 py-2.5">
            <CalendarDays className="mt-0.5 size-4 shrink-0 text-champagne" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Data do evento
              </p>
              <p className="text-sm font-medium text-foreground">
                {format(parseISO(data.dataEvento), "d 'de' MMMM 'de' yyyy", {
                  locale: ptBR,
                })}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 rounded-xl bg-muted/30 px-3 py-2.5">
            <Clock className="mt-0.5 size-4 shrink-0 text-champagne" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Montagem
              </p>
              <p className="text-sm font-medium text-foreground">
                {format(parseISO(data.horarioMontagem), "HH:mm", {
                  locale: ptBR,
                })}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2.5 rounded-xl border border-border/40 bg-background/30 px-3 py-3">
          <MapPin className="mt-0.5 size-4 shrink-0 text-champagne" />
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Endereço
            </p>
            <p className="mt-0.5 text-sm font-medium text-foreground">
              {data.enderecoResumo}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {data.endereco}
            </p>
          </div>
        </div>
      </article>

      <section className="relative mt-8">
        <h2 className="mb-4 text-sm font-medium text-foreground">
          Andamento
        </h2>

        <ol className="space-y-0">
          {data.timeline.map((step, index) => {
            const isCurrent = index === currentStepIndex && !step.done;
            const isLast = index === data.timeline.length - 1;

            return (
              <li key={`${step.key}-${index}`} className="relative flex gap-3">
                {!isLast ? (
                  <span
                    aria-hidden
                    className={cn(
                      "absolute left-[11px] top-7 h-[calc(100%-0.25rem)] w-px",
                      step.done ? "bg-champagne/50" : "bg-border/70"
                    )}
                  />
                ) : null}

                <span
                  className={cn(
                    "relative z-10 mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                    step.done
                      ? "border-champagne bg-champagne text-primary-foreground"
                      : isCurrent
                        ? "border-champagne bg-champagne/15 text-champagne shadow-[0_0_12px_rgba(228,197,138,0.35)]"
                        : "border-border/70 bg-muted/40 text-muted-foreground"
                  )}
                >
                  {step.done ? (
                    <Check className="size-3.5 stroke-[2.5]" />
                  ) : (
                    <span className="size-2 rounded-full bg-current opacity-60" />
                  )}
                </span>

                <div className={cn("min-w-0 flex-1 pb-6", isLast && "pb-0")}>
                  <p
                    className={cn(
                      "text-sm font-medium",
                      step.done || isCurrent
                        ? "text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </p>
                  {step.at ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {format(parseISO(step.at), "d MMM · HH:mm", {
                        locale: ptBR,
                      })}
                    </p>
                  ) : isCurrent ? (
                    <p className="mt-0.5 text-xs text-champagne/90">
                      Em andamento
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <p className="mt-8 text-center text-[11px] text-muted-foreground/80">
        Dúvidas? Fale com sua consultora DJ Decor.
      </p>
    </div>
  );
}
