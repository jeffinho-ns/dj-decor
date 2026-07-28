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
import type { AgendaOs, Montador } from "@/types/equipe";

function toLocalDateValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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
      className="flex h-11 w-full rounded-lg border border-input bg-background px-3 text-base font-medium sm:h-9 sm:text-sm"
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
  onAssign,
}: {
  item: AgendaOs;
  montadorOptions: { id: string; nome: string }[];
  assigning: boolean;
  onAssign: (montadorId: string) => void;
}) {
  return (
    <article className="rounded-xl border border-border/60 bg-card/40 p-4">
      <div className="space-y-1">
        <p className="font-medium text-foreground">{item.festa.tema}</p>
        <p className="text-sm text-muted-foreground">{item.festa.cliente.nome}</p>
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

      <div className="mt-4 space-y-2">
        <Label htmlFor={`montador-${item.id}`} className="text-sm">
          Montador
        </Label>
        <MontadorSelect
          id={`montador-${item.id}`}
          value={item.montadorId ?? ""}
          options={montadorOptions}
          disabled={assigning}
          onChange={onAssign}
        />
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

  function atribuirMontador(osId: string, montadorId: string) {
    setError(null);
    setAssigningId(osId);
    startTransition(async () => {
      try {
        const token = getClientToken();
        if (!token) {
          throw new Error("Sessão expirada. Faça login novamente.");
        }
        if (!montadorId) {
          throw new Error("Selecione um montador");
        }
        const updated = await assignMontadorOs(osId, { montadorId }, token);
        setAgenda((prev) =>
          prev.map((item) =>
            item.id === osId
              ? {
                  ...item,
                  montadorId: updated.montadorId,
                  montador: updated.montador
                    ? { id: updated.montador.id, nome: updated.montador.nome }
                    : null,
                }
              : item
          )
        );
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Falha ao atribuir montador"
        );
      } finally {
        setAssigningId(null);
      }
    });
  }

  const emptyMessage = (
    <p className="py-10 text-center text-sm text-muted-foreground">
      Nenhuma OS no período selecionado.
    </p>
  );

  return (
    <div className="min-w-0 space-y-6">
      <div className="grid grid-cols-1 gap-4 rounded-xl border border-border/60 bg-card/40 p-4 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="equipe-inicio">Início</Label>
          <input
            id="equipe-inicio"
            type="date"
            value={inicio}
            onChange={(e) => setInicio(e.target.value)}
            className="flex h-11 w-full rounded-lg border border-input bg-background px-3 text-base sm:h-9 sm:text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="equipe-fim">Fim</Label>
          <input
            id="equipe-fim"
            type="date"
            value={fim}
            onChange={(e) => setFim(e.target.value)}
            className="flex h-11 w-full rounded-lg border border-input bg-background px-3 text-base sm:h-9 sm:text-sm"
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
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="md:hidden">
        {agenda.length === 0 ? (
          emptyMessage
        ) : (
          <div className="space-y-3">
            {agenda.map((item) => (
              <AgendaCard
                key={item.id}
                item={item}
                montadorOptions={montadorOptions}
                assigning={pending && assigningId === item.id}
                onAssign={(montadorId) => atribuirMontador(item.id, montadorId)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="hidden overflow-hidden rounded-xl border border-border/60 md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Montagem</TableHead>
              <TableHead>Evento</TableHead>
              <TableHead>Tema</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Endereço</TableHead>
              <TableHead className="min-w-[12rem]">Montador</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agenda.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-muted-foreground"
                >
                  Nenhuma OS no período selecionado.
                </TableCell>
              </TableRow>
            ) : (
              agenda.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="whitespace-nowrap text-sm">
                    {formatDateTime(item.festa.horarioMontagem)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    {formatDateTime(item.festa.dataEvento)}
                  </TableCell>
                  <TableCell>{item.festa.tema}</TableCell>
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
                        atribuirMontador(item.id, montadorId)
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

export { toLocalDateValue };
