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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4 rounded-xl border border-border/60 bg-card/40 p-4">
        <div className="space-y-1.5">
          <Label htmlFor="equipe-inicio">Início</Label>
          <input
            id="equipe-inicio"
            type="date"
            value={inicio}
            onChange={(e) => setInicio(e.target.value)}
            className="flex h-9 w-full min-w-[10rem] rounded-md border border-input bg-background px-3 py-1 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="equipe-fim">Fim</Label>
          <input
            id="equipe-fim"
            type="date"
            value={fim}
            onChange={(e) => setFim(e.target.value)}
            className="flex h-9 w-full min-w-[10rem] rounded-md border border-input bg-background px-3 py-1 text-sm"
          />
        </div>
        <Button type="button" onClick={carregar} disabled={pending}>
          <CalendarDays className="mr-2 size-4" />
          {pending ? "Carregando…" : "Atualizar"}
        </Button>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-border/60">
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
                    <select
                      value={item.montadorId ?? ""}
                      disabled={pending && assigningId === item.id}
                      onChange={(e) => atribuirMontador(item.id, e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                    >
                      {montadorOptions.map((m) => (
                        <option key={m.id || "none"} value={m.id}>
                          {m.nome}
                        </option>
                      ))}
                    </select>
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
