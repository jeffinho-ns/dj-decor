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
  ORCAMENTO: "neo-sm bg-balloon-sun/15 text-balloon-sun",
  AGUARDANDO_PAGAMENTO: "neo-sm bg-balloon-sun/15 text-balloon-sun",
  PAGO: "neo-sm bg-balloon-mint/15 text-balloon-mint",
  FECHADO: "neo-sm bg-balloon-sky/15 text-balloon-sky",
  EM_MONTAGEM: "neo-sm bg-balloon-pink/15 text-balloon-pink",
  CONCLUIDO: "neo-sm bg-balloon-mint/15 text-balloon-mint",
  CANCELADO: "neo-sm bg-destructive/12 text-destructive",
};

const TIMELINE_COLORS = [
  {
    done: "border-balloon-pink bg-balloon-pink text-white",
    current:
      "border-balloon-pink bg-balloon-pink/15 text-balloon-pink shadow-[0_0_14px_rgba(255,92,138,0.35)]",
    line: "bg-balloon-pink/45",
    active: "text-balloon-pink",
  },
  {
    done: "border-balloon-sky bg-balloon-sky text-white",
    current:
      "border-balloon-sky bg-balloon-sky/15 text-balloon-sky shadow-[0_0_14px_rgba(61,185,245,0.35)]",
    line: "bg-balloon-sky/45",
    active: "text-balloon-sky",
  },
  {
    done: "border-balloon-sun bg-balloon-sun text-accent-foreground",
    current:
      "border-balloon-sun bg-balloon-sun/15 text-balloon-sun shadow-[0_0_14px_rgba(255,201,60,0.4)]",
    line: "bg-balloon-sun/45",
    active: "text-balloon-sun",
  },
  {
    done: "border-balloon-mint bg-balloon-mint text-white",
    current:
      "border-balloon-mint bg-balloon-mint/15 text-balloon-mint shadow-[0_0_14px_rgba(45,212,168,0.35)]",
    line: "bg-balloon-mint/45",
    active: "text-balloon-mint",
  },
];

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
        <div className="neo-sm rounded-full p-5">
          <PartyPopper className="size-10 text-balloon-pink" />
        </div>
        <h1 className="mt-5 font-display text-2xl text-foreground">
          Portal do cliente
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Use o link enviado pela equipe DJ Decor para acompanhar sua festa.
        </p>
        <span
          aria-hidden
          className="mt-4 inline-flex items-center gap-1.5"
        >
          <span className="balloon-dot bg-balloon-pink" />
          <span className="balloon-dot bg-balloon-sky" />
          <span className="balloon-dot bg-balloon-sun" />
          <span className="balloon-dot bg-balloon-mint" />
        </span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Loader2 className="size-9 animate-spin text-balloon-pink" />
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
    "neo-sm bg-muted/60 text-muted-foreground";

  return (
    <div className="relative mx-auto min-h-screen max-w-lg px-4 pb-12 pt-8 sm:px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-balloon-pink/12 via-balloon-sky/8 to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 top-12 size-28 rounded-full bg-balloon-sun/20 blur-2xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-6 top-24 size-24 rounded-full bg-balloon-mint/15 blur-2xl"
      />

      <header className="relative text-center">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-balloon-sky">
          DJ Decor
        </p>
        <h1 className="mt-2 font-display text-2xl leading-tight text-foreground sm:text-3xl">
          Olá,{" "}
          <span className="text-balloon-pink">{data.clienteNomePrimeiro}</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Acompanhe sua decoração
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium",
              statusBadge
            )}
          >
            <Sparkles className="size-3.5" />
            {statusLabel}
          </span>
          <button
            type="button"
            onClick={() => void handleShare()}
            className="neo-sm inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:-translate-y-0.5 hover:text-balloon-sky"
          >
            <Share2 className="size-3.5" />
            {copied ? "Link copiado!" : "Compartilhar"}
          </button>
        </div>
      </header>

      <article className="neo relative mt-8 space-y-4 rounded-2xl p-5">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Tema
          </p>
          <p className="mt-1 text-lg font-medium leading-snug text-foreground">
            {data.tema}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="neo-sm flex items-start gap-2.5 rounded-xl px-3 py-2.5">
            <CalendarDays className="mt-0.5 size-4 shrink-0 text-balloon-pink" />
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

          <div className="neo-sm flex items-start gap-2.5 rounded-xl px-3 py-2.5">
            <Clock className="mt-0.5 size-4 shrink-0 text-balloon-sky" />
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

        <div className="neo-inset flex items-start gap-2.5 rounded-xl px-3 py-3">
          <MapPin className="mt-0.5 size-4 shrink-0 text-balloon-mint" />
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
        <h2 className="mb-4 text-sm font-medium text-foreground">Andamento</h2>

        <ol className="space-y-0">
          {data.timeline.map((step, index) => {
            const isCurrent = index === currentStepIndex && !step.done;
            const isLast = index === data.timeline.length - 1;
            const colors = TIMELINE_COLORS[index % TIMELINE_COLORS.length];

            return (
              <li key={`${step.key}-${index}`} className="relative flex gap-3">
                {!isLast ? (
                  <span
                    aria-hidden
                    className={cn(
                      "absolute left-[11px] top-7 h-[calc(100%-0.25rem)] w-0.5 rounded-full",
                      step.done ? colors.line : "bg-muted-foreground/20"
                    )}
                  />
                ) : null}

                <span
                  className={cn(
                    "relative z-10 mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                    step.done
                      ? colors.done
                      : isCurrent
                        ? colors.current
                        : "border-muted-foreground/25 bg-muted/50 text-muted-foreground"
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
                    <p className={cn("mt-0.5 text-xs font-medium", colors.active)}>
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
