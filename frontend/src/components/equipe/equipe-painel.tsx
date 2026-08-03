"use client";

import { useMemo, useState, useTransition } from "react";
import { CalendarDays } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { assignMontadorOs, listEquipeAgenda } from "@/lib/api";
import { getClientToken } from "@/lib/auth";
import { cn } from "@/lib/utils";
import type { AgendaOs, Montador } from "@/types/equipe";

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const CARD_ACCENTS = [
  { tema: "text-balloon-pink", badge: "bg-balloon-pink/12 text-balloon-pink" },
  { tema: "text-balloon-sky", badge: "bg-balloon-sky/12 text-balloon-sky" },
  { tema: "text-balloon-sun", badge: "bg-balloon-sun/12 text-balloon-sun" },
  { tema: "text-balloon-mint", badge: "bg-balloon-mint/12 text-balloon-mint" },
  { tema: "text-balloon-lilac", badge: "bg-balloon-lilac/12 text-balloon-lilac" },
];

const FESTA_STATUS_LABEL: Record<string, string> = {
  PAGO: "Pago",
  FECHADO: "Fechado",
  EM_MONTAGEM: "Em montagem",
  CONCLUIDO: "Concluído",
};

const FESTA_STATUS_CLASS: Record<string, string> = {
  PAGO: "bg-balloon-mint/12 text-balloon-mint",
  FECHADO: "bg-balloon-sky/12 text-balloon-sky",
  EM_MONTAGEM: "bg-balloon-lilac/12 text-balloon-lilac",
  CONCLUIDO: "bg-balloon-mint/12 text-balloon-mint",
};

interface EquipePainelProps {
  initialAgenda: AgendaOs[];
  montadores: Montador[];
  defaultInicio: string;
  defaultFim: string;
}

function MontadorSelect({
  value,
  options,
  disabled,
  onChange,
  id,
}: {
  value: string;
  options: { id: string; nome: string }[];
  disabled?: boolean;
  onChange: (montadorId: string) => void;
  id?: string;
}) {
  return (
    <select
      id={id}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className="flex h-11 w-full rounded-2xl border-0 bg-[var(--neo-bg)] px-3 text-base font-medium shadow-[var(--shadow-neo-inset)] outline-none focus-visible:ring-3 focus-visible:ring-balloon-sky/30 sm:h-9 sm:text-sm"
    >
      {options.map((m) => (
        <option key={m.id || "none"} value={m.id}>
          {m.nome}
        </option>
      ))}
    </select>
  );
}

function AgendaCard({
  item,
  montadorOptions,
  assigning,
  onAssignMontador,
  onAssignDesmontador,
  accentIndex,
}: {
  item: AgendaOs;
  montadorOptions: { id: string; nome: string }[];
  assigning: boolean;
  onAssignMontador: (montadorId: string) => void;
  onAssignDesmontador: (desmontadorId: string) => void;
  accentIndex: number;
}) {
  const accent = CARD_ACCENTS[accentIndex % CARD_ACCENTS.length];

  return (
    <article className="rounded-2xl p-4 neo-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <p className={cn("font-medium", accent.tema)}>{item.festa.tema}</p>
          <p className="text-sm text-muted-foreground">{item.festa.cliente.nome}</p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-lg px-2 py-0.5 text-[11px] font-medium",
            FESTA_STATUS_CLASS[item.festa.status] ?? accent.badge
          )}
        >
          {FESTA_STATUS_LABEL[item.festa.status] ?? item.festa.status}
        </span>
      </div>

      <dl className="mt-3 space-y-2 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Montagem</dt>
          <dd className="text-right font-medium tabular-nums text-foreground">
            {formatDateTime(item.festa.horarioMontagem)}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Evento</dt>
          <dd className="text-right font-medium tabular-nums text-foreground">
            {formatDateTime(item.festa.dataEvento)}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Endereço</dt>
          <dd className="mt-0.5 text-foreground">{item.festa.endereco}</dd>
        </div>
      </dl>

      <div className="mt-4 space-y-3">
        <div className="space-y-2">
          <Label htmlFor={`montador-${item.id}`} className="text-sm">
            Montador (R$ 100/diária)
          </Label>
          <MontadorSelect
            id={`montador-${item.id}`}
            value={item.montadorId ?? ""}
            options={montadorOptions}
            disabled={assigning}
            onChange={onAssignMontador}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`desmontador-${item.id}`} className="text-sm">
            Desmontador (R$ 70/diária)
          </Label>
          <MontadorSelect
            id={`desmontador-${item.id}`}
            value={item.desmontadorId ?? ""}
            options={montadorOptions.map((o) =>
              o.id === "" ? { id: "", nome: "— Sem desmontador —" } : o
            )}
            disabled={assigning}
            onChange={onAssignDesmontador}
          />
        </div>
      </div>
    </article>
  );
}

export function EquipePainel({
  initialAgenda,
  montadores,
  defaultInicio,
  defaultFim,
}: EquipePainelProps) {
  const [agenda, setAgenda] = useState(initialAgenda);
  const [inicio, setInicio] = useState(defaultInicio);
  const [fim, setFim] = useState(defaultFim);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [assigningId, setAssigningId] = useState<string | null>(null);

  const montadorOptions = useMemo(
    () => [{ id: "", nome: "— Sem montador —" }, ...montadores],
    [montadores]
  );

  function carregar() {
    setError(null);
    startTransition(async () => {
      try {
        const token = getClientToken();
        if (!token) {
          throw new Error("Sessão expirada. Faça login novamente.");
        }
        const data = await listEquipeAgenda(
          {
            inicio: new Date(inicio).toISOString(),
            fim: new Date(fim + "T23:59:59").toISOString(),
          },
          token
        );
        setAgenda(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Falha ao carregar agenda"
        );
      }
    });
  }

  function atribuirEquipe(
    osId: string,
    payload: { montadorId?: string | null; desmontadorId?: string | null }
  ) {
    setError(null);
    setAssigningId(osId);
    startTransition(async () => {
      try {
        const token = getClientToken();
        if (!token) {
          throw new Error("Sessão expirada. Faça login novamente.");
        }
        const updated = await assignMontadorOs(osId, payload, token);
        setAgenda((prev) =>
          prev.map((item) =>
            item.id === osId
              ? {
                  ...item,
                  montadorId: updated.montadorId,
                  desmontadorId: updated.desmontadorId ?? null,
                  montador: updated.montador
                    ? { id: updated.montador.id, nome: updated.montador.nome }
                    : null,
                  desmontador: updated.desmontador
                    ? {
                        id: updated.desmontador.id,
                        nome: updated.desmontador.nome,
                      }
                    : null,
                }
              : item
          )
        );
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Falha ao atribuir equipe"
        );
      } finally {
        setAssigningId(null);
      }
    });
  }

  const emptyMessage = (
    <div className="rounded-2xl neo-inset px-4 py-10 text-center text-sm text-muted-foreground">
      <p className="font-medium text-foreground">Nenhuma montagem neste período</p>
      <p className="mt-2">
        Aparecem aqui festas <span className="text-foreground">Pagas</span>,{" "}
        <span className="text-foreground">Fechadas</span> ou em montagem.
        Confira as datas ou avance o status em Vendas.
      </p>
    </div>
  );

  return (
    <div className="min-w-0 space-y-6">
      <div className="grid grid-cols-1 gap-4 rounded-2xl p-4 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-end neo-sm">
        <div className="space-y-1.5">
          <Label htmlFor="equipe-inicio">Início</Label>
          <input
            id="equipe-inicio"
            type="date"
            value={inicio}
            onChange={(e) => setInicio(e.target.value)}
            className="flex h-11 w-full rounded-2xl border-0 bg-[var(--neo-bg)] px-3 text-base shadow-[var(--shadow-neo-inset)] outline-none focus-visible:ring-3 focus-visible:ring-balloon-sky/30 sm:h-9 sm:text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="equipe-fim">Fim</Label>
          <input
            id="equipe-fim"
            type="date"
            value={fim}
            onChange={(e) => setFim(e.target.value)}
            className="flex h-11 w-full rounded-2xl border-0 bg-[var(--neo-bg)] px-3 text-base shadow-[var(--shadow-neo-inset)] outline-none focus-visible:ring-3 focus-visible:ring-balloon-sky/30 sm:h-9 sm:text-sm"
          />
        </div>
        <Button
          type="button"
          className="h-11 w-full sm:h-9 lg:w-auto"
          onClick={carregar}
          disabled={pending}
        >
          <CalendarDays className="mr-2 size-4" />
          {pending ? "Carregando…" : "Atualizar"}
        </Button>
      </div>

      {error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive neo-sm">
          {error}
        </div>
      ) : null}

      <div className="md:hidden">
        {agenda.length === 0 ? (
          emptyMessage
        ) : (
          <div className="space-y-3">
            {agenda.map((item, index) => (
              <AgendaCard
                key={item.id}
                item={item}
                montadorOptions={montadorOptions}
                assigning={pending && assigningId === item.id}
                onAssignMontador={(montadorId) =>
                  atribuirEquipe(item.id, {
                    montadorId: montadorId || null,
                  })
                }
                onAssignDesmontador={(desmontadorId) =>
                  atribuirEquipe(item.id, {
                    desmontadorId: desmontadorId || null,
                  })
                }
                accentIndex={index}
              />
            ))}
          </div>
        )}
      </div>

      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Montagem</TableHead>
              <TableHead>Evento</TableHead>
              <TableHead>Tema</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Endereço</TableHead>
              <TableHead className="min-w-[10rem]">Montador</TableHead>
              <TableHead className="min-w-[10rem]">Desmontador</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agenda.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="py-10 text-center text-muted-foreground"
                >
                  Nenhuma montagem neste período. Festas Pagas/Fechadas aparecem
                  aqui — confira as datas ou o status em Vendas.
                </TableCell>
              </TableRow>
            ) : (
              agenda.map((item, index) => (
                <TableRow key={item.id}>
                  <TableCell className="text-sm whitespace-nowrap">
                    {formatDateTime(item.festa.horarioMontagem)}
                  </TableCell>
                  <TableCell className="text-sm whitespace-nowrap">
                    {formatDateTime(item.festa.dataEvento)}
                  </TableCell>
                  <TableCell className={CARD_ACCENTS[index % CARD_ACCENTS.length].tema}>
                    {item.festa.tema}
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "rounded-lg px-2 py-0.5 text-[11px] font-medium",
                        FESTA_STATUS_CLASS[item.festa.status] ??
                          "bg-muted text-muted-foreground"
                      )}
                    >
                      {FESTA_STATUS_LABEL[item.festa.status] ??
                        item.festa.status}
                    </span>
                  </TableCell>
                  <TableCell>{item.festa.cliente.nome}</TableCell>
                  <TableCell className="max-w-[14rem] truncate text-sm">
                    {item.festa.endereco}
                  </TableCell>
                  <TableCell>
                    <MontadorSelect
                      value={item.montadorId ?? ""}
                      options={montadorOptions}
                      disabled={pending && assigningId === item.id}
                      onChange={(montadorId) =>
                        atribuirEquipe(item.id, {
                          montadorId: montadorId || null,
                        })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <MontadorSelect
                      value={item.desmontadorId ?? ""}
                      options={montadorOptions.map((o) =>
                        o.id === ""
                          ? { id: "", nome: "— Sem desmontador —" }
                          : o
                      )}
                      disabled={pending && assigningId === item.id}
                      onChange={(desmontadorId) =>
                        atribuirEquipe(item.id, {
                          desmontadorId: desmontadorId || null,
                        })
                      }
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
