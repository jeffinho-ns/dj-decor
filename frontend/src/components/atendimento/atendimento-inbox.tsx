"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Bot,
  Camera,
  Headphones,
  Loader2,
  MessageCircle,
  Phone,
  RefreshCw,
  Send,
  StickyNote,
  UserRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NotasInternasEditor } from "@/components/atendimento/notas-internas-editor";
import {
  atribuirConversa,
  createConversaManual,
  devolverConversaIa,
  fecharConversa,
  getAtendimentoMetricas,
  getConversa,
  listAtendimentoVendedores,
  listConversas,
  replyConversa,
  simularInboundAtendimento,
  takeoverConversa,
  updateConversaNotas,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import type {
  AtendimentoMetricas,
  AtendimentoVendedor,
  CanalAtendimento,
  ConversaDetalhe,
  ConversaListItem,
  StatusConversa,
} from "@/types/atendimento";

const selectClassName =
  "flex h-10 w-full rounded-xl neo-inset px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-balloon-sky/30";

function canalIcon(canal: CanalAtendimento) {
  if (canal === "INSTAGRAM") return Camera;
  if (canal === "WHATSAPP") return Phone;
  return MessageCircle;
}

function modoLabel(modo: string) {
  if (modo === "AI") return "IA";
  if (modo === "HUMANO") return "Humano";
  return "Híbrido";
}

interface AtendimentoInboxProps {
  token: string;
  viewerId: string;
}

export function AtendimentoInbox({ token, viewerId }: AtendimentoInboxProps) {
  const [conversas, setConversas] = useState<ConversaListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detalhe, setDetalhe] = useState<ConversaDetalhe | null>(null);
  const [metricas, setMetricas] = useState<AtendimentoMetricas | null>(null);
  const [vendedores, setVendedores] = useState<AtendimentoVendedor[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusConversa | "">("ABERTA");
  const [q, setQ] = useState("");
  const [texto, setTexto] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingDetalhe, setLoadingDetalhe] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [simTelefone, setSimTelefone] = useState("");
  const [simNome, setSimNome] = useState("");
  const [simTexto, setSimTexto] = useState("Oi! Quero orçamento de festa");
  const [simCanal, setSimCanal] = useState<CanalAtendimento>("WHATSAPP");

  const [novaTel, setNovaTel] = useState("");
  const [novaNome, setNovaNome] = useState("");
  const [savingNotas, setSavingNotas] = useState(false);

  const carregarLista = useCallback(async () => {
    setError(null);
    try {
      const [lista, mets, vends] = await Promise.all([
        listConversas(token, {
          status: statusFilter || undefined,
          q: q.trim() || undefined,
        }),
        getAtendimentoMetricas(token),
        listAtendimentoVendedores(token),
      ]);
      setConversas(lista);
      setMetricas(mets);
      setVendedores(vends);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar inbox");
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter, q]);

  const carregarDetalhe = useCallback(
    async (id: string) => {
      setLoadingDetalhe(true);
      setError(null);
      try {
        const data = await getConversa(id, token);
        setDetalhe(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Falha ao abrir conversa"
        );
      } finally {
        setLoadingDetalhe(false);
      }
    },
    [token]
  );

  useEffect(() => {
    void carregarLista();
    const timer = window.setInterval(() => void carregarLista(), 15000);
    return () => window.clearInterval(timer);
  }, [carregarLista]);

  useEffect(() => {
    if (!selectedId) {
      setDetalhe(null);
      return;
    }
    void carregarDetalhe(selectedId);
    const timer = window.setInterval(() => void carregarDetalhe(selectedId), 8000);
    return () => window.clearInterval(timer);
  }, [selectedId, carregarDetalhe]);

  const tituloContato = useMemo(() => {
    if (!detalhe) return "";
    return (
      detalhe.contatoNome ||
      detalhe.cliente?.nome ||
      detalhe.contatoExterno ||
      detalhe.externalThreadId
    );
  }, [detalhe]);

  async function handleEnviar() {
    if (!selectedId || !texto.trim()) return;
    setPending(true);
    setError(null);
    try {
      const updated = await replyConversa(selectedId, texto.trim(), token);
      setDetalhe(updated);
      setTexto("");
      await carregarLista();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao enviar");
    } finally {
      setPending(false);
    }
  }

  async function runAction(
    action: () => Promise<ConversaDetalhe>
  ) {
    setPending(true);
    setError(null);
    try {
      const updated = await action();
      setDetalhe(updated);
      setSelectedId(updated.id);
      await carregarLista();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha na ação");
    } finally {
      setPending(false);
    }
  }

  async function handleSimular() {
    if (!simTelefone.trim() || !simTexto.trim()) return;
    setPending(true);
    setError(null);
    try {
      const result = await simularInboundAtendimento(
        {
          telefone: simTelefone.trim(),
          texto: simTexto.trim(),
          nome: simNome.trim() || undefined,
          canal: simCanal,
        },
        token
      );
      setSelectedId(result.conversa.id);
      setDetalhe(result.conversa);
      await carregarLista();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao simular");
    } finally {
      setPending(false);
    }
  }

  async function handleNovaConversa() {
    if (!novaTel.trim()) return;
    setPending(true);
    setError(null);
    try {
      const created = await createConversaManual(
        {
          contatoExterno: novaTel.trim(),
          contatoNome: novaNome.trim() || undefined,
          canal: "MANUAL",
        },
        token
      );
      setSelectedId(created.id);
      setDetalhe(created);
      setNovaTel("");
      setNovaNome("");
      await carregarLista();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar conversa");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      {metricas ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <MetricCard label="Abertas" value={metricas.abertas} />
          <MetricCard label="Com IA" value={metricas.ai} accent="mint" />
          <MetricCard label="Humanas" value={metricas.humanas} accent="sky" />
          <MetricCard
            label={metricas.agentEnabled ? "IA ligada" : "IA off"}
            value={metricas.fechadasHoje}
            hint={
              metricas.agentEnabled
                ? metricas.agentProvider === "groq"
                  ? "Groq · fechadas hoje"
                  : metricas.agentProvider === "openai"
                    ? "OpenAI · fechadas hoje"
                    : "fechadas hoje"
                : "fechadas hoje"
            }
          />
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-3 rounded-2xl neo-sm p-3 sm:p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-1.5 text-sm font-medium">
              <Headphones className="size-4 text-balloon-sky" />
              Conversas
            </h3>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => void carregarLista()}
              aria-label="Atualizar"
            >
              <RefreshCw className={cn("size-4", loading && "animate-spin")} />
            </Button>
          </div>

          <div className="grid gap-2">
            <select
              className={selectClassName}
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter((e.target.value || "") as StatusConversa | "")
              }
            >
              <option value="">Todos os status</option>
              <option value="ABERTA">Abertas</option>
              <option value="AGUARDANDO">Aguardando</option>
              <option value="FECHADA">Fechadas</option>
            </select>
            <Input
              placeholder="Buscar nome ou telefone"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="h-10"
            />
          </div>

          <ul className="max-h-[50vh] space-y-1.5 overflow-y-auto pr-0.5 lg:max-h-[60vh]">
            {loading ? (
              <li className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Carregando…
              </li>
            ) : conversas.length === 0 ? (
              <li className="p-3 text-xs text-muted-foreground">
                Nenhuma conversa ainda. Simule um inbound abaixo ou crie
                manualmente.
              </li>
            ) : (
              conversas.map((c) => {
                const Icon = canalIcon(c.canal);
                const active = c.id === selectedId;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(c.id)}
                      className={cn(
                        "flex w-full flex-col gap-1 rounded-xl px-3 py-2.5 text-left transition-all",
                        active ? "neo-sky text-white" : "neo-inset hover:brightness-[1.03]"
                      )}
                    >
                      <span className="flex items-center gap-1.5 text-sm font-medium">
                        <Icon className="size-3.5 shrink-0 opacity-80" />
                        <span className="truncate">
                          {c.contatoNome ||
                            c.cliente?.nome ||
                            c.contatoExterno ||
                            c.externalThreadId}
                        </span>
                        {c.notasInternas ? (
                          <StickyNote
                            className={cn(
                              "ml-auto size-3 shrink-0",
                              active ? "text-white/80" : "text-balloon-sun"
                            )}
                          />
                        ) : null}
                      </span>
                      <span
                        className={cn(
                          "flex flex-wrap gap-x-2 text-[10px]",
                          active ? "text-white/80" : "text-muted-foreground"
                        )}
                      >
                        <span>{modoLabel(c.modo)}</span>
                        <span>{c.status}</span>
                        {c.ultimaMensagemEm ? (
                          <span>
                            {format(parseISO(c.ultimaMensagemEm), "dd/MM HH:mm", {
                              locale: ptBR,
                            })}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>

          <div className="space-y-2 border-t border-border/40 pt-3">
            <p className="text-xs font-medium text-muted-foreground">
              Nova conversa manual
            </p>
            <Input
              placeholder="Telefone"
              value={novaTel}
              onChange={(e) => setNovaTel(e.target.value)}
              className="h-9"
            />
            <Input
              placeholder="Nome (opcional)"
              value={novaNome}
              onChange={(e) => setNovaNome(e.target.value)}
              className="h-9"
            />
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={pending || !novaTel.trim()}
              onClick={() => void handleNovaConversa()}
            >
              Abrir conversa
            </Button>
          </div>
        </aside>

        <section className="flex min-h-[520px] flex-col rounded-2xl neo-sm p-3 sm:p-4">
          {!selectedId ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
              <MessageCircle className="size-8 opacity-40" />
              Selecione uma conversa ou simule um cliente chegando.
            </div>
          ) : loadingDetalhe && !detalhe ? (
            <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Abrindo…
            </div>
          ) : detalhe ? (
            <>
              <header className="flex flex-col gap-3 border-b border-border/40 pb-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h3 className="truncate font-display text-xl">{tituloContato}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {detalhe.canal} · {modoLabel(detalhe.modo)} · {detalhe.status}
                    {detalhe.vendedor ? ` · ${detalhe.vendedor.nome}` : ""}
                  </p>
                  {detalhe.festa ? (
                    <Link
                      href="/vendas"
                      className="mt-1 inline-block text-xs text-balloon-sky hover:underline"
                    >
                      Festa: {detalhe.festa.tema} ({detalhe.festa.status})
                    </Link>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {detalhe.modo === "AI" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={pending}
                      onClick={() =>
                        void runAction(() => takeoverConversa(detalhe.id, token))
                      }
                    >
                      <UserRound className="size-3.5" />
                      Assumir
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={pending}
                      onClick={() =>
                        void runAction(() => devolverConversaIa(detalhe.id, token))
                      }
                    >
                      <Bot className="size-3.5" />
                      Devolver à IA
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() =>
                      void runAction(() =>
                        atribuirConversa(detalhe.id, viewerId, token)
                      )
                    }
                  >
                    Para mim
                  </Button>
                  <select
                    className={cn(selectClassName, "h-9 w-auto max-w-[160px]")}
                    value={detalhe.vendedorId ?? ""}
                    disabled={pending}
                    onChange={(e) => {
                      const value = e.target.value || null;
                      void runAction(() =>
                        atribuirConversa(detalhe.id, value, token)
                      );
                    }}
                  >
                    <option value="">Sem vendedor</option>
                    {vendedores.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.nome}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={pending || detalhe.status === "FECHADA"}
                    onClick={() =>
                      void runAction(() => fecharConversa(detalhe.id, token))
                    }
                  >
                    Fechar
                  </Button>
                </div>
              </header>

              <div className="border-b border-border/40 py-3">
                <NotasInternasEditor
                  key={detalhe.id}
                  value={detalhe.festa?.notasInternas ?? detalhe.notasInternas}
                  pending={savingNotas}
                  hint={
                    detalhe.festa
                      ? "A equipe de montagem vê isto na agenda da festa."
                      : "Fica só nesta conversa até vincular uma festa."
                  }
                  onSave={async (notasInternas) => {
                    setSavingNotas(true);
                    setError(null);
                    try {
                      const updated = await updateConversaNotas(
                        detalhe.id,
                        notasInternas,
                        token
                      );
                      setDetalhe(updated);
                      await carregarLista();
                    } catch (err) {
                      setError(
                        err instanceof Error
                          ? err.message
                          : "Falha ao salvar notas"
                      );
                      throw err;
                    } finally {
                      setSavingNotas(false);
                    }
                  }}
                />
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto py-3">
                {detalhe.mensagens.map((m) => {
                  const mine = m.direcao === "OUT";
                  return (
                    <div
                      key={m.id}
                      className={cn(
                        "flex",
                        mine ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                          mine
                            ? "neo-pink text-white"
                            : "neo-inset text-foreground"
                        )}
                      >
                        <p className="whitespace-pre-wrap break-words">
                          {m.texto || "[mídia]"}
                        </p>
                        <p
                          className={cn(
                            "mt-1 text-[10px]",
                            mine ? "text-white/70" : "text-muted-foreground"
                          )}
                        >
                          {m.autorTipo} ·{" "}
                          {format(parseISO(m.criadoEm), "dd/MM HH:mm", {
                            locale: ptBR,
                          })}
                          {m.statusEnvio ? ` · ${m.statusEnvio}` : ""}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-2 border-t border-border/40 pt-3">
                <Input
                  placeholder="Escreva a resposta…"
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  className="h-11"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void handleEnviar();
                    }
                  }}
                />
                <Button
                  type="button"
                  className="min-h-11 shrink-0"
                  disabled={pending || !texto.trim()}
                  onClick={() => void handleEnviar()}
                >
                  {pending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                  Enviar
                </Button>
              </div>
            </>
          ) : null}
        </section>
      </div>

      <div className="rounded-2xl neo-inset p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-balloon-mint">
          Simular cliente (dev / sem Meta)
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Injeta uma mensagem inbound e dispara a IA se estiver ligada e o
          modo for AI.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <Label className="text-xs">Canal</Label>
            <select
              className={selectClassName}
              value={simCanal}
              onChange={(e) =>
                setSimCanal(e.target.value as CanalAtendimento)
              }
            >
              <option value="WHATSAPP">WhatsApp</option>
              <option value="INSTAGRAM">Instagram</option>
              <option value="MANUAL">Manual</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Telefone / ID</Label>
            <Input
              value={simTelefone}
              onChange={(e) => setSimTelefone(e.target.value)}
              placeholder="21999999999"
              className="h-10"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Nome</Label>
            <Input
              value={simNome}
              onChange={(e) => setSimNome(e.target.value)}
              placeholder="Cliente"
              className="h-10"
            />
          </div>
          <div className="space-y-1 sm:col-span-2 lg:col-span-1">
            <Label className="text-xs">Mensagem</Label>
            <Input
              value={simTexto}
              onChange={(e) => setSimTexto(e.target.value)}
              className="h-10"
            />
          </div>
        </div>
        <Button
          type="button"
          className="mt-3"
          disabled={pending || !simTelefone.trim() || !simTexto.trim()}
          onClick={() => void handleSimular()}
        >
          Simular mensagem inbound
        </Button>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: number | string;
  hint?: string;
  accent?: "mint" | "sky";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl neo-sm px-3 py-2.5",
        accent === "mint" && "ring-1 ring-balloon-mint/30",
        accent === "sky" && "ring-1 ring-balloon-sky/30"
      )}
    >
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 font-display text-2xl tabular-nums">{value}</p>
      {hint ? (
        <p className="text-[10px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
