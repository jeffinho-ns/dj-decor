"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createFesta, createPedidoBolas, uploadMidia } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CatalogoBola } from "@/types/bolas";

function combineDateAndTime(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString();
}

type TipoCadastro = "dj" | "externo";

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
  const [tipo, setTipo] = useState<TipoCadastro>("dj");
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
  const [bolasMidiaIds, setBolasMidiaIds] = useState<string[]>([]);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const totais = useMemo(() => {
    let tabela = 0;
    for (const item of catalogo) {
      const qty = selected[item.id] ?? 0;
      if (qty > 0) tabela += Number(item.valorTabela) * qty;
    }
    const cliente =
      Math.round(tabela * (1 + markupPercentual / 100) * 100) / 100;
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
      if (tipo === "dj") {
        const festa = await createFesta(
          {
            nomeCliente: clienteNome,
            telefone: clienteTelefone,
            tema,
            endereco,
            dataEvento: combineDateAndTime(dataEvento, horaEvento),
            horarioMontagem: combineDateAndTime(dataEvento, horaMontagem),
            tamanhoDecoracao: "P",
            itensExtras: [],
            kitCatalogo: "SO_BOLAS",
            pegueEMonte: false,
            observacoes: observacoes || null,
            valor: totais.cliente,
            bolasItens: itens,
            bolasCores: cores || null,
            bolasMidiaIds:
              bolasMidiaIds.length > 0 ? bolasMidiaIds : undefined,
          },
          token
        );
        const pedidoId = festa.pedidoBolas?.id;
        router.push(pedidoId ? `/bolas/${pedidoId}` : "/bolas");
      } else {
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
            midiaIds:
              bolasMidiaIds.length > 0 ? bolasMidiaIds : undefined,
          },
          token
        );
        router.push(`/bolas/${pedido.id}`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-2xl space-y-6">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setTipo("dj")}
          className={cn(
            "min-h-14 rounded-2xl px-3 py-2 text-left text-sm transition-all",
            tipo === "dj" ? "neo-pink" : "neo-sm"
          )}
        >
          <span className="font-medium">Venda DJ Decor</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            Cliente paga na empresa
          </span>
        </button>
        <button
          type="button"
          onClick={() => setTipo("externo")}
          className={cn(
            "min-h-14 rounded-2xl px-3 py-2 text-left text-sm transition-all",
            tipo === "externo" ? "neo-sky" : "neo-sm"
          )}
        >
          <span className="font-medium">Serviço externo</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            Fora da DJ Decor
          </span>
        </button>
      </div>

      <div className="rounded-2xl border border-border/70 bg-card/40 p-6 space-y-4">
        <p className="text-xs font-medium uppercase tracking-wider text-champagne/80">
          {tipo === "dj" ? "Nova venda de bolas" : "Serviço externo"}
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="clienteNome">Cliente</Label>
            <Input
              id="clienteNome"
              required
              className="min-h-11"
              value={clienteNome}
              onChange={(e) => setClienteNome(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="telefone">Telefone</Label>
            <Input
              id="telefone"
              required
              className="min-h-11"
              value={clienteTelefone}
              onChange={(e) => setClienteTelefone(e.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="tema">Tema</Label>
            <Input
              id="tema"
              required
              className="min-h-11"
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
              className="min-h-11"
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
              className="min-h-11"
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
              className="min-h-11"
              value={horaMontagem}
              onChange={(e) => setHoraMontagem(e.target.value)}
            />
          </div>
          {tipo === "externo" ? (
            <div className="space-y-2">
              <Label htmlFor="desmontagem">Desmontagem</Label>
              <Input
                id="desmontagem"
                type="time"
                className="min-h-11"
                value={horaDesmontagem}
                onChange={(e) => setHoraDesmontagem(e.target.value)}
              />
            </div>
          ) : null}
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="endereco">Endereço</Label>
            <Input
              id="endereco"
              required
              className="min-h-11"
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="cores">Cores / estilo</Label>
            <Input
              id="cores"
              className="min-h-11"
              value={cores}
              onChange={(e) => setCores(e.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="fotosBolas">Fotos de referência</Label>
            <Input
              id="fotosBolas"
              type="file"
              accept="image/*"
              multiple
              capture="environment"
              className="min-h-11"
              disabled={uploadBusy}
              onChange={async (event) => {
                const files = Array.from(event.target.files ?? []);
                if (!files.length) return;
                setUploadBusy(true);
                try {
                  for (const file of files) {
                    const midia = await uploadMidia(
                      { file, tipo: "REFERENCIA_BOLAS" },
                      token
                    );
                    setBolasMidiaIds((prev) => [...prev, midia.id]);
                  }
                } catch (err) {
                  setError(
                    err instanceof Error
                      ? err.message
                      : "Falha no upload das fotos"
                  );
                } finally {
                  setUploadBusy(false);
                  event.target.value = "";
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              {uploadBusy
                ? "Enviando..."
                : bolasMidiaIds.length > 0
                  ? `${bolasMidiaIds.length} foto(s)`
                  : "Tema / referência das bolas"}
            </p>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="obs">Observações</Label>
            <textarea
              id="obs"
              rows={3}
              className="flex min-h-[5rem] w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm"
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

      <div className="flex justify-end gap-2 pb-20 md:pb-0">
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          onClick={() => router.push("/bolas")}
        >
          Cancelar
        </Button>
        <Button type="submit" className="min-h-11" disabled={busy}>
          {busy
            ? "Salvando..."
            : tipo === "dj"
              ? "Salvar venda"
              : "Salvar serviço"}
        </Button>
      </div>
    </form>
  );
}
