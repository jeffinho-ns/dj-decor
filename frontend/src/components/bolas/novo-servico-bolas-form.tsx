"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createPedidoBolas } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CatalogoBola } from "@/types/bolas";

function combineDateAndTime(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString();
}

interface NovoServicoBolasFormProps {
  token: string;
  catalogo: CatalogoBola[];
  markupPercentual: number;
}

export function NovoServicoBolasForm({
  token,
  catalogo,
  markupPercentual,
}: NovoServicoBolasFormProps) {
  const router = useRouter();
  const [clienteNome, setClienteNome] = useState("");
  const [clienteTelefone, setClienteTelefone] = useState("");
  const [tema, setTema] = useState("");
  const [endereco, setEndereco] = useState("");
  const [dataEvento, setDataEvento] = useState("");
  const [horaEvento, setHoraEvento] = useState("15:00");
  const [horaMontagem, setHoraMontagem] = useState("11:00");
  const [horaDesmontagem, setHoraDesmontagem] = useState("");
  const [cores, setCores] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const totais = useMemo(() => {
    let tabela = 0;
    for (const item of catalogo) {
      const qty = selected[item.id] ?? 0;
      if (qty > 0) tabela += Number(item.valorTabela) * qty;
    }
    const cliente = Math.round(tabela * (1 + markupPercentual / 100) * 100) / 100;
    return { tabela, cliente };
  }, [catalogo, selected, markupPercentual]);

  function toggleItem(id: string) {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = 1;
      return next;
    });
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const itens = catalogo
      .filter((c) => (selected[c.id] ?? 0) > 0)
      .map((c) => ({
        catalogoBolaId: c.id,
        quantidade: selected[c.id],
      }));
    if (itens.length === 0) {
      setError("Selecione ao menos um item do catálogo");
      return;
    }
    setBusy(true);
    try {
      const pedido = await createPedidoBolas(
        {
          clienteNome,
          clienteTelefone,
          tema,
          endereco,
          dataEvento: combineDateAndTime(dataEvento, horaEvento),
          horarioMontagem: combineDateAndTime(dataEvento, horaMontagem),
          horarioDesmontagem: horaDesmontagem
            ? combineDateAndTime(dataEvento, horaDesmontagem)
            : null,
          cores: cores || null,
          observacoes: observacoes || null,
          itens,
        },
        token
      );
      router.push(`/bolas/${pedido.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-2xl space-y-6">
      <div className="rounded-2xl border border-border/70 bg-card/40 p-6 space-y-4">
        <p className="text-xs font-medium uppercase tracking-wider text-champagne/80">
          Serviço externo
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="clienteNome">Cliente</Label>
            <Input
              id="clienteNome"
              required
              value={clienteNome}
              onChange={(e) => setClienteNome(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="telefone">Telefone</Label>
            <Input
              id="telefone"
              required
              value={clienteTelefone}
              onChange={(e) => setClienteTelefone(e.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="tema">Tema</Label>
            <Input
              id="tema"
              required
              value={tema}
              onChange={(e) => setTema(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="data">Data</Label>
            <Input
              id="data"
              type="date"
              required
              value={dataEvento}
              onChange={(e) => setDataEvento(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hora">Horário festa</Label>
            <Input
              id="hora"
              type="time"
              required
              value={horaEvento}
              onChange={(e) => setHoraEvento(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="montagem">Montagem</Label>
            <Input
              id="montagem"
              type="time"
              required
              value={horaMontagem}
              onChange={(e) => setHoraMontagem(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="desmontagem">Desmontagem</Label>
            <Input
              id="desmontagem"
              type="time"
              value={horaDesmontagem}
              onChange={(e) => setHoraDesmontagem(e.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="endereco">Endereço</Label>
            <Input
              id="endereco"
              required
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="cores">Cores / estilo</Label>
            <Input
              id="cores"
              value={cores}
              onChange={(e) => setCores(e.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="obs">Observações</Label>
            <textarea
              id="obs"
              rows={3}
              className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border/70 bg-card/40 p-6 space-y-3">
        <p className="text-xs font-medium uppercase tracking-wider text-champagne/80">
          Itens (sua tabela)
        </p>
        {catalogo.map((item) => {
          const qty = selected[item.id] ?? 0;
          const clienteUnit =
            Math.round(
              Number(item.valorTabela) * (1 + markupPercentual / 100) * 100
            ) / 100;
          return (
            <label
              key={item.id}
              className={cn(
                "flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-sm",
                qty > 0
                  ? "border-champagne/50 bg-champagne/8"
                  : "border-border/60"
              )}
            >
              <span className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={qty > 0}
                  onChange={() => toggleItem(item.id)}
                />
                <span>
                  {item.nome}
                  <span className="block text-xs text-muted-foreground">
                    Tabela {formatCurrency(item.valorTabela)} · cliente{" "}
                    {formatCurrency(clienteUnit)}
                  </span>
                </span>
              </span>
              {qty > 0 ? (
                <Input
                  type="number"
                  min={1}
                  className="h-8 w-16"
                  value={qty}
                  onChange={(e) =>
                    setSelected((prev) => ({
                      ...prev,
                      [item.id]: Math.max(1, Number(e.target.value) || 1),
                    }))
                  }
                  onClick={(e) => e.stopPropagation()}
                />
              ) : null}
            </label>
          );
        })}
        <p className="pt-2 text-sm">
          Seu total:{" "}
          <span className="font-medium tabular-nums">
            {formatCurrency(totais.tabela)}
          </span>
          <span className="text-muted-foreground">
            {" "}
            · cliente {formatCurrency(totais.cliente)}
          </span>
        </p>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/bolas")}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? "Salvando..." : "Salvar serviço"}
        </Button>
      </div>
    </form>
  );
}
