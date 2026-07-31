"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarDays,
  Check,
  Clock,
  ImagePlus,
  Loader2,
  MapPin,
  PartyPopper,
  Share2,
  Sparkles,
  Star,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  assinarPortal,
  avaliarPortal,
  getPortalMidiaUrl,
  getPortalStatus,
  resolvePortalLegacyLink,
  uploadPortalMidia,
} from "@/lib/api";
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

const TIPO_LABEL: Record<string, string> = {
  REFERENCIA_FESTA: "Referência DJ Decor",
  CLIENTE_REFERENCIA: "Sua referência",
  MONTAGEM_FINAL: "Montagem final",
};

interface PortalPageProps {
  token: string | null;
  legacyId?: string | null;
}

function findCurrentStepIndex(timeline: PortalTimelineStep[]): number {
  const firstPending = timeline.findIndex((step) => !step.done);
  if (firstPending >= 0) return firstPending;
  return timeline.length - 1;
}

export function PortalClientView({ token, legacyId }: PortalPageProps) {
  const [resolvedToken, setResolvedToken] = useState<string | null>(token);
  const [loading, setLoading] = useState(Boolean(token || legacyId));
  const [erro, setErro] = useState<string | null>(null);
  const [data, setData] = useState<PortalFestaStatus | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();
  const [nota, setNota] = useState(5);
  const [comentario, setComentario] = useState("");
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      setErro(null);

      if (token) {
        setResolvedToken(token);
        setLoading(true);
        try {
          const status = await getPortalStatus(token);
          if (!cancelled) setData(status);
        } catch (err) {
          if (!cancelled) {
            setErro(
              err instanceof Error ? err.message : "Não foi possível carregar"
            );
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
        return;
      }

      if (legacyId) {
        setLoading(true);
        try {
          const link = await resolvePortalLegacyLink(legacyId);
          if (cancelled) return;
          setResolvedToken(link.token ?? null);
          if (typeof window !== "undefined" && link.token) {
            const next = `${window.location.pathname}?t=${encodeURIComponent(link.token)}`;
            window.history.replaceState(null, "", next);
          }
          const status = await getPortalStatus(link.token!);
          if (!cancelled) setData(status);
        } catch (err) {
          if (!cancelled) {
            setErro(
              err instanceof Error
                ? err.message
                : "Link inválido ou festa não encontrada"
            );
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
        return;
      }

      setLoading(false);
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, [token, legacyId]);

  const activeToken = resolvedToken;

  const currentStepIndex = useMemo(
    () => (data ? findCurrentStepIndex(data.timeline) : -1),
    [data]
  );

  async function handleShare() {
    if (!activeToken || typeof window === "undefined") return;
    const url = `${window.location.origin}/portal?t=${encodeURIComponent(activeToken)}`;
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
      /* cancelado */
    }
  }

  function onUploadCliente(file: File | undefined) {
    if (!activeToken || !file) return;
    setActionMsg(null);
    startTransition(async () => {
      try {
        await uploadPortalMidia(activeToken, file);
        const next = await getPortalStatus(activeToken);
        setData(next);
        setActionMsg("Foto enviada com sucesso!");
      } catch (err) {
        setActionMsg(
          err instanceof Error ? err.message : "Falha ao enviar foto"
        );
      }
    });
  }

  function onAssinar(file: File | undefined) {
    if (!activeToken || !file) return;
    setActionMsg(null);
    startTransition(async () => {
      try {
        const next = await assinarPortal(activeToken, file);
        setData(next);
        setActionMsg("Assinatura registrada!");
      } catch (err) {
        setActionMsg(
          err instanceof Error ? err.message : "Falha ao assinar"
        );
      }
    });
  }

  function onAvaliar() {
    if (!activeToken) return;
    setActionMsg(null);
    startTransition(async () => {
      try {
        const next = await avaliarPortal(activeToken, {
          nota,
          comentario: comentario.trim() || undefined,
        });
        setData(next);
        setActionMsg("Obrigado pela avaliação!");
      } catch (err) {
        setActionMsg(
          err instanceof Error ? err.message : "Falha ao avaliar"
        );
      }
    });
  }

  if (!activeToken && !loading && !erro) {
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

  if (erro || !data || !activeToken) {
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
    STATUS_BADGE[data.status] ?? "neo-sm bg-muted/60 text-muted-foreground";
  const galeria = data.galeria ?? [];

  return (
    <div className="relative mx-auto min-h-screen max-w-lg px-4 pb-12 pt-8 sm:px-6">
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
            className="neo-sm inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground"
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
          <p className="mt-1 text-lg font-medium text-foreground">{data.tema}</p>
          {data.itensExtras?.length ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Itens:{" "}
              <span className="break-words">{data.itensExtras.join(", ")}</span>
            </p>
          ) : null}
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
            <p className="mt-1 text-xs text-muted-foreground">{data.endereco}</p>
          </div>
        </div>
      </article>

      <section className="relative mt-8">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-medium text-foreground">Galeria</h2>
          <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-balloon-sky">
            <ImagePlus className="size-3.5" />
            Enviar foto
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={pending}
              onChange={(e) => onUploadCliente(e.target.files?.[0])}
            />
          </label>
        </div>
        {galeria.length === 0 ? (
          <p className="rounded-2xl neo-inset px-4 py-6 text-center text-sm text-muted-foreground">
            Ainda sem fotos. Envie uma referência da decoração que deseja.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {galeria.map((item) => (
              <figure key={item.id} className="overflow-hidden rounded-xl neo-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getPortalMidiaUrl(activeToken, item.id)}
                  alt={TIPO_LABEL[item.tipo] ?? "Foto"}
                  className="aspect-square w-full object-cover"
                />
                <figcaption className="px-2 py-1.5 text-[10px] text-muted-foreground">
                  {TIPO_LABEL[item.tipo] ?? item.tipo}
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </section>

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
                    "relative z-10 mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border-2",
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
                  <p className="text-sm font-medium text-foreground">
                    {step.label}
                  </p>
                  {step.at ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {format(parseISO(step.at), "d MMM · HH:mm", {
                        locale: ptBR,
                      })}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {data.podeAssinar ? (
        <section className="mt-8 rounded-2xl neo p-4">
          <h2 className="text-sm font-medium">Assinar contrato</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Envie uma foto da sua assinatura (ou print assinado).
          </p>
          <Input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="mt-3"
            disabled={pending}
            onChange={(e) => onAssinar(e.target.files?.[0])}
          />
        </section>
      ) : data.assinaturaClienteEm ? (
        <p className="mt-6 text-center text-xs text-balloon-mint">
          Contrato assinado em{" "}
          {format(parseISO(data.assinaturaClienteEm), "dd/MM/yyyy HH:mm")}
        </p>
      ) : null}

      {data.status === "CONCLUIDO" && data.avaliacaoNota == null ? (
        <section className="mt-8 space-y-3 rounded-2xl neo p-4">
          <h2 className="flex items-center gap-1.5 text-sm font-medium">
            <Star className="size-4 text-balloon-sun" />
            Avalie sua festa
          </h2>
          <div className="flex flex-wrap gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setNota(n)}
                aria-label={`${n} estrela${n > 1 ? "s" : ""}`}
                className={cn(
                  "flex size-11 items-center justify-center rounded-xl",
                  n <= nota ? "text-balloon-sun" : "text-muted-foreground/40"
                )}
              >
                <Star className="size-6 fill-current" />
              </button>
            ))}
          </div>
          <div className="space-y-1">
            <Label htmlFor="comentario">Comentário (opcional)</Label>
            <Input
              id="comentario"
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="Como foi a experiência?"
            />
          </div>
          <Button
            type="button"
            size="sm"
            className="w-full"
            disabled={pending}
            onClick={onAvaliar}
          >
            Enviar avaliação
          </Button>
        </section>
      ) : null}

      {actionMsg ? (
        <p className="mt-4 text-center text-xs text-balloon-mint">{actionMsg}</p>
      ) : null}

      <p className="mt-8 text-center text-[11px] text-muted-foreground/80">
        Dúvidas? Fale com sua consultora DJ Decor.
      </p>
    </div>
  );
}
