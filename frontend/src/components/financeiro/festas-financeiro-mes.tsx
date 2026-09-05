"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Loader2, PartyPopper } from "lucide-react";

import { EquipeFestaFields } from "@/components/equipe/equipe-festa-fields";
import { Button } from "@/components/ui/button";
import {
  listFestasFinanceiroMes,
  listMontadores,
  updateFesta,
} from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { EquipeFestaValue, Montador } from "@/types/equipe";
import type {
  FestaFinanceiroMesItem,
  FestasFinanceiroMes as FestasMesData,
} from "@/types/financeiro";

const STATUS_LABEL: Record<string, string> = {
  PAGO: "Pago",
  FECHADO: "Fechado",
  EM_MONTAGEM: "Em montagem",
  CONCLUIDO: "Concluído",
};

type FiltroStatus = "todos" | "FECHADO" | "PAGO" | "EM_MONTAGEM" | "CONCLUIDO";
type FiltroLocal = "todos" | "fora" | "paracambi";
type FiltroEquipe = "todos" | "sem_montador" | "sem_desmontador";

function formatPct(pct: number | null | undefined): string {
  if (pct == null) return "";
  return `${pct % 1 === 0 ? pct : pct.toFixed(1)}%`;
}

interface FestasFinanceiroMesProps {
  token: string;
  mes: string;
}

export function FestasFinanceiroMes({ token, mes }: FestasFinanceiroMesProps) {
  const [data, setData] = useState<FestasMesData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pessoas, setPessoas] = useState<Montador[]>([]);
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>("todos");
  const [filtroLocal, setFiltroLocal] = useState<FiltroLocal>("todos");
  const [filtroEquipe, setFiltroEquipe] = useState<FiltroEquipe>("todos");
  const [q, setQ] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function reload() {
    return listFestasFinanceiroMes(token, mes).then(setData);
  }

  useEffect(() => {
    setError(null);
    setData(null);
    setMsg(null);
    reload().catch((err) =>
      setError(
        err instanceof Error ? err.message : "Não foi possível carregar as festas"
      )
    );
  }, [token, mes]);

  useEffect(() => {
    listMontadores(token)
      .then(setPessoas)
      .catch(() => setPessoas([]));
  }, [token]);

  const filtradas = useMemo(() => {
    if (!data) return [];
    const termo = q.trim().toLowerCase();
    return data.itens.filter((f) => {
      if (filtroStatus !== "todos" && f.status !== filtroStatus) return false;
      if (filtroLocal === "fora" && !f.foraParacambi) return false;
      if (filtroLocal === "paracambi" && f.foraParacambi) return false;
      if (filtroEquipe === "sem_montador" && f.montador) return false;
      if (filtroEquipe === "sem_desmontador" && f.desmontador) return false;
      if (!termo) return true;
      return (
        f.tema.toLowerCase().includes(termo) ||
        f.clienteNome.toLowerCase().includes(termo) ||
        f.vendedor.nome.toLowerCase().includes(termo) ||
        (f.montador?.nome.toLowerCase().includes(termo) ?? false) ||
        (f.desmontador?.nome.toLowerCase().includes(termo) ?? false)
      );
    });
  }, [data, filtroStatus, filtroLocal, filtroEquipe, q]);

  function salvarEquipe(festa: FestaFinanceiroMesItem, equipe: EquipeFestaValue) {
    setMsg(null);
    startTransition(async () => {
      try {
        await updateFesta(
          festa.id,
          {
            montadorEquipeId: equipe.montadorEquipeId,
            desmontadorEquipeId: equipe.desmontadorEquipeId,
            montadorCarroProprio: equipe.montadorCarroProprio,
            desmontadorCarroProprio: equipe.desmontadorCarroProprio,
          },
          token
        );
        await reload();
        setEditId(null);
        setMsg("Equipe atualizada — split/diárias recalculados.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao salvar equipe");
      }
    });
  }

  function toggleFora(festa: FestaFinanceiroMesItem) {
    setMsg(null);
    startTransition(async () => {
      try {
        await updateFesta(
          festa.id,
          { foraParacambi: !festa.foraParacambi },
          token
        );
        await reload();
        setMsg(
          !festa.foraParacambi
            ? "Marcada fora de Paracambi."
            : "Marcada em Paracambi."
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao atualizar local");
      }
    });
  }

  const chip = (active: boolean) =>
    cn(
      "rounded-xl px-2.5 py-1.5 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-balloon-sky/30",
      active ? "neo-inset text-foreground" : "neo-sm text-muted-foreground"
    );

  return (
    <section className="space-y-3 rounded-2xl neo-sm p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-lg">
            <PartyPopper className="size-4 text-balloon-lilac" />
            Festas
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Filtros, equipe e fora de Paracambi — split atualiza ao salvar
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar tema, cliente, vendedor…"
          className="flex h-10 w-full rounded-xl neo-inset px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-balloon-sky/30"
        />
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["todos", "Todos status"],
              ["FECHADO", "Fechado"],
              ["PAGO", "Pago"],
              ["EM_MONTAGEM", "Montagem"],
              ["CONCLUIDO", "Concluído"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={chip(filtroStatus === id)}
              onClick={() => setFiltroStatus(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["todos", "Local: todos"],
              ["fora", "Fora"],
              ["paracambi", "Paracambi"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={chip(filtroLocal === id)}
              onClick={() => setFiltroLocal(id)}
            >
              {label}
            </button>
          ))}
          {(
            [
              ["todos", "Equipe: todos"],
              ["sem_montador", "Sem montador"],
              ["sem_desmontador", "Sem desmontador"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={chip(filtroEquipe === id)}
              onClick={() => setFiltroEquipe(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {data ? (
        <div className="rounded-xl neo-inset px-3 py-2 text-sm">
          <span className="text-muted-foreground">{data.label} · </span>
          <span className="font-medium tabular-nums">
            {formatCurrency(data.totalValor)}
          </span>
          <span className="text-muted-foreground">
            {" "}
            · {filtradas.length}/{data.quantidade} festa(s)
          </span>
        </div>
      ) : null}

      {msg ? <p className="text-sm text-balloon-mint">{msg}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {!data && !error ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          Carregando festas…
        </p>
      ) : null}

      {data && filtradas.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma festa com esses filtros.
        </p>
      ) : null}

      {filtradas.length > 0 ? (
        <ul className="space-y-3">
          {filtradas.map((festa) => {
            const splitParts: string[] = [];
            if (festa.split?.vendedor) {
              const pct = formatPct(festa.split.vendedor.percentual);
              splitParts.push(
                `Vend. ${pct ? `${pct} ` : ""}${formatCurrency(festa.split.vendedor.valor)}`
              );
            }
            if (festa.split?.suellemFora) {
              const pct = formatPct(festa.split.suellemFora.percentual);
              splitParts.push(
                `Suellem fora ${pct ? `${pct} ` : ""}${formatCurrency(festa.split.suellemFora.valor)}`
              );
            }
            if (festa.split?.debora) {
              splitParts.push(
                `Debora ${formatCurrency(festa.split.debora.valor)}`
              );
            }
            if (festa.split && festa.split.diarias.total > 0) {
              splitParts.push(
                `Diárias ${formatCurrency(festa.split.diarias.total)}`
              );
            }

            const editing = editId === festa.id;
            const equipeValue: EquipeFestaValue = {
              montadorEquipeId: festa.montador?.id ?? null,
              desmontadorEquipeId: festa.desmontador?.id ?? null,
              montadorCarroProprio: true,
              desmontadorCarroProprio: true,
            };

            return (
              <li key={festa.id} className="rounded-2xl neo-inset p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/vendas?festa=${festa.id}`}
                        className="font-medium text-foreground hover:underline"
                      >
                        {festa.tema}
                      </Link>
                      {festa.foraParacambi ? (
                        <span className="rounded-md bg-balloon-sun/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-balloon-sun">
                          Fora Paracambi
                        </span>
                      ) : null}
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {STATUS_LABEL[festa.status] ?? festa.status}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {new Date(festa.dataEvento).toLocaleDateString("pt-BR", {
                        timeZone: "America/Sao_Paulo",
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                      {" · "}
                      {festa.clienteNome}
                    </p>
                  </div>
                  <p className="shrink-0 tabular-nums text-sm font-semibold">
                    {formatCurrency(festa.valor)}
                  </p>
                </div>

                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <Link
                    href={`/financeiro/colaboradores/${festa.vendedor.id}`}
                    className="hover:text-foreground hover:underline"
                  >
                    Vend. {festa.vendedor.nome}
                  </Link>
                  {festa.montador ? (
                    <span>Mont. {festa.montador.nome}</span>
                  ) : (
                    <span className="opacity-60">Mont. —</span>
                  )}
                  {festa.desmontador ? (
                    <span>Desm. {festa.desmontador.nome}</span>
                  ) : (
                    <span className="opacity-60">Desm. —</span>
                  )}
                </div>

                {splitParts.length > 0 ? (
                  <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                    {splitParts.join(" · ")}
                  </p>
                ) : null}

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="xs"
                    variant="secondary"
                    disabled={pending}
                    onClick={() => setEditId(editing ? null : festa.id)}
                  >
                    {editing ? "Fechar equipe" : "Editar equipe"}
                  </Button>
                  <Button
                    type="button"
                    size="xs"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => toggleFora(festa)}
                  >
                    {festa.foraParacambi
                      ? "Marcar Paracambi"
                      : "Marcar fora Paracambi"}
                  </Button>
                </div>

                {editing ? (
                  <div className="mt-3 space-y-3 rounded-xl neo-sm p-3">
                    <EquipeEditor
                      pessoas={pessoas}
                      initial={equipeValue}
                      disabled={pending}
                      onSave={(v) => salvarEquipe(festa, v)}
                    />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}

function EquipeEditor({
  pessoas,
  initial,
  disabled,
  onSave,
}: {
  pessoas: Montador[];
  initial: EquipeFestaValue;
  disabled?: boolean;
  onSave: (value: EquipeFestaValue) => void;
}) {
  const [value, setValue] = useState(initial);
  useEffect(() => {
    setValue(initial);
  }, [initial]);

  return (
    <>
      <EquipeFestaFields
        pessoas={pessoas}
        value={value}
        onChange={setValue}
        disabled={disabled}
        compact
      />
      <Button
        type="button"
        size="sm"
        disabled={disabled}
        onClick={() => onSave(value)}
      >
        {disabled ? <Loader2 className="size-3.5 animate-spin" /> : null}
        Salvar equipe
      </Button>
    </>
  );
}
