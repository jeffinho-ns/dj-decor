"use client";

import { useCallback, useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Download,
  FileText,
  Link2,
  Loader2,
  MessageCircle,
  RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  downloadContratoPdf,
  gerarContrato,
  getContrato,
  listMensagensWhatsApp,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Contrato, MensagemWhatsApp, StatusMensagemWhatsApp } from "@/types/contrato";

const templateLabel: Record<string, string> = {
  pagamento_confirmado: "Pagamento confirmado",
  equipe_a_caminho: "Equipe a caminho",
  lembrete_evento: "Lembrete do evento",
};

const statusLabel: Record<StatusMensagemWhatsApp, string> = {
  PENDENTE: "Pendente",
  ENVIADA: "Enviada",
  FALHA: "Falha",
};

const statusBadge: Record<StatusMensagemWhatsApp, string> = {
  PENDENTE: "bg-balloon-sun/12 text-balloon-sun shadow-[var(--shadow-neo-sm)]",
  ENVIADA: "bg-balloon-mint/12 text-balloon-mint shadow-[var(--shadow-neo-sm)]",
  FALHA: "bg-destructive/12 text-destructive shadow-[var(--shadow-neo-sm)]",
};

interface FestaContratoPanelProps {
  festaId: string;
  token: string;
  clienteNome?: string;
}

export function FestaContratoPanel({
  festaId,
  token,
  clienteNome,
}: FestaContratoPanelProps) {
  const [contrato, setContrato] = useState<Contrato | null>(null);
  const [mensagens, setMensagens] = useState<MensagemWhatsApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [gerando, setGerando] = useState(false);
  const [baixando, setBaixando] = useState(false);
  const [copiandoLink, setCopiandoLink] = useState(false);
  const [linkCopiado, setLinkCopiado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [contratoResult, msgs] = await Promise.all([
        getContrato(festaId, token),
        listMensagensWhatsApp(festaId, token),
      ]);
      setContrato(contratoResult);
      setMensagens(msgs);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Falha ao carregar contrato/WhatsApp"
      );
    } finally {
      setLoading(false);
    }
  }, [festaId, token]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function handleGerarContrato() {
    setError(null);
    setGerando(true);
    try {
      const criado = await gerarContrato(festaId, token);
      setContrato(criado);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Falha ao gerar contrato"
      );
    } finally {
      setGerando(false);
    }
  }

  async function handleBaixarPdf() {
    if (!contrato) return;
    setError(null);
    setBaixando(true);
    try {
      const slug = clienteNome
        ? clienteNome.replace(/\s+/g, "-").slice(0, 40)
        : festaId.slice(0, 8);
      await downloadContratoPdf(
        contrato.id,
        token,
        `contrato-${slug}.pdf`
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Falha ao baixar PDF"
      );
    } finally {
      setBaixando(false);
    }
  }

  async function handleCopiarLinkCliente() {
    setError(null);
    setCopiandoLink(true);
    try {
      const url =
        typeof window !== "undefined"
          ? `${window.location.origin}/portal?id=${festaId}`
          : "";
      if (!url) return;
      await navigator.clipboard.writeText(url);
      setLinkCopiado(true);
      window.setTimeout(() => setLinkCopiado(false), 2500);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Falha ao copiar link do portal"
      );
    } finally {
      setCopiandoLink(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="space-y-3">
        <h4 className="flex items-center gap-1.5 text-sm font-medium text-foreground md:text-xs">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-xl neo-sky md:size-6">
            <Link2 className="size-4 md:size-3.5" />
          </span>
          Portal do cliente
        </h4>
        <p className="text-xs text-muted-foreground">
          Link público para o cliente acompanhar tema, endereço e andamento —
          sem login.
        </p>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-full md:min-h-7"
          disabled={copiandoLink}
          onClick={() => void handleCopiarLinkCliente()}
        >
          {copiandoLink ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Link2 className="size-4 md:size-3" />
          )}
          {linkCopiado ? "Link copiado!" : "Copiar link do cliente"}
        </Button>
      </section>

      <section className="space-y-3 border-t border-border/50 pt-4">
        <div className="flex items-center justify-between gap-2">
          <h4 className="flex items-center gap-1.5 text-sm font-medium text-foreground md:text-xs">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-balloon-lilac/12 text-balloon-lilac shadow-[var(--shadow-neo-sm)] md:size-6">
              <FileText className="size-4 md:size-3.5" />
            </span>
            Contrato
          </h4>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="min-h-10 min-w-10 text-muted-foreground md:min-h-7 md:min-w-7"
            disabled={loading}
            onClick={() => void carregar()}
            aria-label="Atualizar contrato e WhatsApp"
          >
            <RefreshCw className={cn("size-4 md:size-3", loading && "animate-spin")} />
          </Button>
        </div>

        {loading ? (
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground md:text-xs">
            <Loader2 className="size-4 animate-spin md:size-3" />
            Carregando…
          </p>
        ) : (
          <>
            {contrato ? (
              <p className="text-xs text-muted-foreground">
                Gerado em{" "}
                {format(parseISO(contrato.geradoEm), "dd/MM/yyyy HH:mm", {
                  locale: ptBR,
                })}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Nenhum contrato gerado ainda.
              </p>
            )}

            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="secondary"
                className="min-h-11 w-full md:min-h-7"
                disabled={gerando}
                onClick={() => void handleGerarContrato()}
              >
                {gerando ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <FileText className="size-4 md:size-3" />
                )}
                {contrato ? "Regenerar contrato" : "Gerar contrato"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="min-h-11 w-full md:min-h-7"
                disabled={!contrato || baixando}
                onClick={() => void handleBaixarPdf()}
              >
                {baixando ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Download className="size-4 md:size-3" />
                )}
                Baixar PDF
              </Button>
            </div>

            {contrato && contrato.pdfDisponivel === false ? (
              <p className="text-xs text-muted-foreground/80">
                PDF ainda não renderizado no servidor — o download pode falhar
                até a Fase 3 concluir a geração.
              </p>
            ) : null}
          </>
        )}
      </section>

      <section className="space-y-3 border-t border-border/50 pt-4">
        <h4 className="flex items-center gap-1.5 text-sm font-medium text-foreground md:text-xs">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-xl neo-mint md:size-6">
            <MessageCircle className="size-4 md:size-3.5" />
          </span>
          WhatsApp
          {!loading ? (
            <span className="rounded-md bg-muted/60 px-1.5 py-0.5 text-[10px] font-normal tabular-nums text-muted-foreground">
              {mensagens.length}
            </span>
          ) : null}
        </h4>

        {loading ? (
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground md:text-xs">
            <Loader2 className="size-4 animate-spin md:size-3" />
            Carregando mensagens…
          </p>
        ) : mensagens.length === 0 ? (
          <p className="text-xs text-muted-foreground/80">
            Nenhuma mensagem registrada. Disparos automáticos ocorrem na
            confirmação de pagamento e quando a equipe está a caminho.
          </p>
        ) : (
          <ul className="max-h-56 space-y-2 overflow-y-auto pr-0.5 md:max-h-48">
            {mensagens.map((msg) => (
              <li
                key={msg.id}
                className="rounded-xl neo-sm px-3 py-2.5 md:px-2.5 md:py-2"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-sm font-medium text-foreground md:text-xs">
                    {templateLabel[msg.template] ?? msg.template}
                  </p>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold md:text-[10px]",
                      statusBadge[msg.status]
                    )}
                  >
                    {statusLabel[msg.status]}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground md:text-[10px]">
                  <span>
                    Criada{" "}
                    {format(parseISO(msg.criadoEm), "dd/MM HH:mm", {
                      locale: ptBR,
                    })}
                  </span>
                  {msg.enviadoEm ? (
                    <span>
                      Enviada{" "}
                      {format(parseISO(msg.enviadoEm), "dd/MM HH:mm", {
                        locale: ptBR,
                      })}
                    </span>
                  ) : null}
                </div>
                {msg.erro ? (
                  <p className="mt-1 text-xs text-destructive/90 md:text-[10px]">
                    {msg.erro}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {error ? (
        <p className="rounded-2xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive md:text-[11px]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
