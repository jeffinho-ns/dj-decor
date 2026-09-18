"use client";

import { useEffect, useState, useTransition } from "react";
import { format, parseISO, subHours } from "date-fns";
import { Loader2, Pencil, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateFesta } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Festa } from "@/types/festa";

interface FestaDataEditorProps {
  festa: Festa;
  token: string;
  onUpdated: (festa: Festa) => void;
}

function toDateInput(iso: string): string {
  return format(parseISO(iso), "yyyy-MM-dd");
}

function toTimeInput(iso: string): string {
  return format(parseISO(iso), "HH:mm");
}

function combineDateAndTime(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString();
}

export function FestaDataEditor({
  festa,
  token,
  onUpdated,
}: FestaDataEditorProps) {
  const [editing, setEditing] = useState(false);
  const [data, setData] = useState(() => toDateInput(festa.dataEvento));
  const [horaEvento, setHoraEvento] = useState(() =>
    toTimeInput(festa.dataEvento)
  );
  const [horaMontagem, setHoraMontagem] = useState(() =>
    toTimeInput(festa.horarioMontagem)
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const labelEvento = festa.pegueEMonte ? "Retirada" : "Festa";
  const labelMontagem = festa.pegueEMonte ? "Horário retirada" : "Montagem";

  useEffect(() => {
    if (editing) return;
    setData(toDateInput(festa.dataEvento));
    setHoraEvento(toTimeInput(festa.dataEvento));
    setHoraMontagem(toTimeInput(festa.horarioMontagem));
  }, [
    festa.id,
    festa.dataEvento,
    festa.horarioMontagem,
    editing,
  ]);

  function syncMontagemFromEvento(nextData: string, nextHoraEvento: string) {
    if (festa.pegueEMonte) {
      setHoraMontagem(nextHoraEvento);
      return;
    }
    const evento = new Date(`${nextData}T${nextHoraEvento}:00`);
    if (Number.isNaN(evento.getTime())) return;
    setHoraMontagem(format(subHours(evento, 4), "HH:mm"));
  }

  function cancelar() {
    setEditing(false);
    setError(null);
    setData(toDateInput(festa.dataEvento));
    setHoraEvento(toTimeInput(festa.dataEvento));
    setHoraMontagem(toTimeInput(festa.horarioMontagem));
  }

  function salvar() {
    setError(null);
    if (!data || !horaEvento || !horaMontagem) {
      setError("Informe data e horários.");
      return;
    }

    const dataEvento = combineDateAndTime(data, horaEvento);
    const horarioMontagem = festa.pegueEMonte
      ? combineDateAndTime(data, horaEvento)
      : combineDateAndTime(data, horaMontagem);

    const eventoMs = new Date(dataEvento).getTime();
    const montagemMs = new Date(horarioMontagem).getTime();
    if (Number.isNaN(eventoMs) || Number.isNaN(montagemMs)) {
      setError("Data ou horário inválido.");
      return;
    }
    if (!festa.pegueEMonte && montagemMs > eventoMs) {
      setError("A montagem precisa ser antes da festa.");
      return;
    }

    startTransition(async () => {
      try {
        const updated = await updateFesta(
          festa.id,
          { dataEvento, horarioMontagem },
          token
        );
        onUpdated(updated);
        setEditing(false);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Não foi possível salvar a data."
        );
      }
    });
  }

  if (!editing) {
    return (
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0">
          {labelMontagem}{" "}
          <span className="font-medium text-foreground">
            {format(parseISO(festa.horarioMontagem), "dd/MM HH:mm")}
          </span>
          <span className="text-muted-foreground/60"> · </span>
          {labelEvento}{" "}
          <span className="font-medium text-foreground">
            {format(parseISO(festa.dataEvento), "dd/MM HH:mm")}
          </span>
        </span>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 shrink-0 gap-1 px-2 text-xs"
          onClick={() => setEditing(true)}
        >
          <Pencil className="size-3.5" />
          Alterar data
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3 rounded-xl neo-inset px-3 py-3">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Alterar data da festa
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor={`festa-data-${festa.id}`}>Data</Label>
          <Input
            id={`festa-data-${festa.id}`}
            type="date"
            value={data}
            disabled={pending}
            onChange={(e) => {
              const next = e.target.value;
              setData(next);
              syncMontagemFromEvento(next, horaEvento);
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`festa-hora-evento-${festa.id}`}>
            {festa.pegueEMonte ? "Horário da retirada" : "Horário da festa"}
          </Label>
          <Input
            id={`festa-hora-evento-${festa.id}`}
            type="time"
            value={horaEvento}
            disabled={pending}
            onChange={(e) => {
              const next = e.target.value;
              setHoraEvento(next);
              syncMontagemFromEvento(data, next);
            }}
          />
        </div>
        {!festa.pegueEMonte ? (
          <div className="space-y-1.5">
            <Label htmlFor={`festa-hora-montagem-${festa.id}`}>
              Horário da montagem
            </Label>
            <Input
              id={`festa-hora-montagem-${festa.id}`}
              type="time"
              value={horaMontagem}
              disabled={pending}
              onChange={(e) => setHoraMontagem(e.target.value)}
            />
          </div>
        ) : null}
      </div>
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          {festa.pegueEMonte
            ? "No pegue e monte a data da retirada passa a valer para estoque e agenda."
            : "A montagem padrão sugere 4h antes; você pode ajustar."}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={pending}
          className={cn("gap-1.5")}
          onClick={salvar}
        >
          {pending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Save className="size-3.5" />
          )}
          Salvar data
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={cancelar}
        >
          Cancelar
        </Button>
      </div>
    </div>
  );
}
