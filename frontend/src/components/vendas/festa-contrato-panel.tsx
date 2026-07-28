"use client";

import { useCallback, useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Download,
  FileText,
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
  PENDENTE: "bg-amber-400/15 text-amber-300 ring-amber-400/25",
  ENVIADA: "bg-emerald-400/15 text-emerald-300 ring-emerald-400/25",
  FALHA: "bg-destructive/15 text-destructive ring-destructive/25",
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

  return (
    <div className="space-y-4">
      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h4 className="flex items-center gap-1.5 text-xs font-medium text-foreground">
            <FileText className="size-3.5 text-champagne" />
            Contrato
          </h4>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="text-muted-foreground"
            disabled={loading}
            onClick={() => void carregar()}
            aria-label="Atualizar contrato e WhatsApp"
          >
            <RefreshCw className={cn("size-3", loading && "animate-spin")} />
          </Button>
        </div>

        {loading ? (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="size-3 animate-spin" />
            Carregando…
          </p>
        ) : (
          <>
            {contrato ? (
              <p className="text-[11px] text-muted-foreground">
                Gerado em{" "}
                {format(parseISO(contrato.geradoEm), "dd/MM/yyyy HH:mm", {
                  locale: ptBR,
                })}
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                Nenhum contrato gerado ainda.
              </p>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                size="xs"
                variant="secondary"
                className="w-full sm:flex-1"
                disabled={gerando}
                onClick={() => void handleGerarContrato()}
              >
                {gerando ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <FileText className="size-3" />
                )}
                {contrato ? "Regenerar contrato" : "Gerar contrato"}
              </Button>
              <Button
                type="button"
                size="xs"
                variant="outline"
                className="w-full sm:flex-1"
                disabled={!contrato || baixando}
                onClick={() => void handleBaixarPdf()}
              >
                {baixando ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <Download className="size-3" />
                )}
                Baixar PDF
              </Button>
            </div>

            {contrato && contrato.pdfDisponivel === false ? (
              <p className="text-[10px] text-muted-foreground/80">
                PDF ainda não renderizado no servidor — o download pode falhar
                até a Fase 3 concluir a geração.
              </p>
            ) : null}
          </>
        )}
      </section>

      <section className="space-y-2 border-t border-border/50 pt-3">
        <h4 className="flex items-center gap-1.5 text-xs font-medium text-foreground">
          <MessageCircle className="size-3.5 text-emerald-400/90" />
          WhatsApp
          {!loading ? (
            <span className="rounded-md bg-muted/60 px-1.5 py-0.5 text-[10px] font-normal tabular-nums text-muted-foreground">
              {mensagens.length}
            </span>
          ) : null}
        </h4>

        {loading ? (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="size-3 animate-spin" />
            Carregando mensagens…
          </p>
        ) : mensagens.length === 0 ? (
          <p className="text-[11px] text-muted-foreground/80">
            Nenhuma mensagem registrada. Disparos automáticos ocorrem na
            confirmação de pagamento e quando a equipe está a caminho.
          </p>
        ) : (
          <ul className="max-h-48 space-y-2 overflow-y-auto pr-0.5">
            {mensagens.map((msg) => (
              <li
                key={msg.id}
                className="rounded-md border border-border/50 bg-muted/20 px-2.5 py-2"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-xs font-medium text-foreground">
                    {templateLabel[msg.template] ?? msg.template}
                  </p>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset",
                      statusBadge[msg.status]
                    )}
                  >
                    {statusLabel[msg.status]}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
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
                  <p className="mt-1 text-[10px] text-destructive/90">
                    {msg.erro}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1.5 text-[11px] text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
