"use client";

import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, Loader2, PartyPopper } from "lucide-react";

import { getPortalStatus } from "@/lib/api";

const STATUS_LABEL: Record<string, string> = {
  ORCAMENTO: "Orçamento",
  AGUARDANDO_PAGAMENTO: "Aguardando pagamento",
  PAGO: "Pago",
  FECHADO: "Fechado",
  EM_MONTAGEM: "Em montagem",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
};

interface PortalPageProps {
  festaId: string | null;
}

export function PortalClientView({ festaId }: PortalPageProps) {
  const [loading, setLoading] = useState(Boolean(festaId));
  const [erro, setErro] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [tema, setTema] = useState<string | null>(null);
  const [dataEvento, setDataEvento] = useState<string | null>(null);

  useEffect(() => {
    if (!festaId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setErro(null);
    getPortalStatus(festaId)
      .then((data) => {
        setStatus(data.status);
        setTema(data.tema);
        setDataEvento(data.dataEvento);
      })
      .catch((err) => {
        setErro(
          err instanceof Error ? err.message : "Não foi possível carregar"
        );
      })
      .finally(() => setLoading(false));
  }, [festaId]);

  if (!festaId) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <PartyPopper className="mx-auto size-10 text-champagne" />
        <h1 className="mt-4 font-display text-2xl text-foreground">
          Portal do cliente
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Informe o ID da festa na URL:{" "}
          <code className="text-foreground">/portal?id=...</code>
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-champagne" />
      </div>
    );
  }

  if (erro) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-sm text-destructive">{erro}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-6 px-4 py-10">
      <header className="text-center">
        <PartyPopper className="mx-auto size-10 text-champagne" />
        <h1 className="mt-3 font-display text-2xl text-foreground">
          Sua festa
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Acompanhe o status da decoração
        </p>
      </header>

      <article className="rounded-2xl border border-border/70 bg-card/40 p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Tema
        </p>
        <p className="mt-1 font-medium text-foreground">{tema ?? "—"}</p>

        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays className="size-4 text-champagne" />
          {dataEvento
            ? format(parseISO(dataEvento), "d 'de' MMMM 'de' yyyy", {
                locale: ptBR,
              })
            : "—"}
        </div>

        <div className="mt-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Status
          </p>
          <p className="mt-1 inline-flex rounded-md bg-champagne/12 px-2.5 py-1 text-sm font-medium text-champagne">
            {status ? (STATUS_LABEL[status] ?? status) : "—"}
          </p>
        </div>
      </article>

      <p className="text-center text-xs text-muted-foreground">
        Portal demo — dados limitados por privacidade.
      </p>
    </div>
  );
}
