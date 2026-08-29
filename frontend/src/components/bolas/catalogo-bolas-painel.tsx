"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setCatalogoBolaAtivo, upsertCatalogoBola } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import type { CatalogoBola } from "@/types/bolas";

interface CatalogoBolasPainelProps {
  token: string;
  itens: CatalogoBola[];
  markupPercentual: number;
}

export function CatalogoBolasPainel({
  token,
  itens: initial,
  markupPercentual,
}: CatalogoBolasPainelProps) {
  const router = useRouter();
  const [itens, setItens] = useState(initial);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [valorTabela, setValorTabela] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function salvar(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const created = await upsertCatalogoBola(
        {
          nome,
          descricao: descricao || null,
          valorTabela: Number(valorTabela.replace(",", ".")),
          ativo: true,
        },
        token
      );
      setItens((prev) => [...prev, created].sort((a, b) => a.ordem - b.ordem));
      setNome("");
      setDescricao("");
      setValorTabela("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar");
    } finally {
      setBusy(false);
    }
  }

  async function toggleAtivo(item: CatalogoBola) {
    try {
      const updated = await setCatalogoBolaAtivo(item.id, !item.ativo, token);
      setItens((prev) =>
        prev.map((i) => (i.id === item.id ? updated : i))
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao atualizar");
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="rounded-2xl border border-border/70 bg-card/40 p-6">
        <p className="text-xs text-muted-foreground">
          Valores da sua tabela. O cliente paga +{markupPercentual}% (taxa DJ
          Decor). Montagem/desmontagem sem diária.
        </p>
        <ul className="mt-4 space-y-2">
          {itens.map((item) => {
            const cliente =
              Math.round(
                Number(item.valorTabela) * (1 + markupPercentual / 100) * 100
              ) / 100;
            return (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border/60 px-3 py-2.5 text-sm"
              >
                <div>
                  <p className={item.ativo ? "font-medium" : "text-muted-foreground line-through"}>
                    {item.nome}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Tabela {formatCurrency(item.valorTabela)} · cliente{" "}
                    {formatCurrency(cliente)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => toggleAtivo(item)}
                >
                  {item.ativo ? "Desativar" : "Ativar"}
                </Button>
              </li>
            );
          })}
        </ul>
      </div>

      <form
        onSubmit={salvar}
        className="rounded-2xl border border-border/70 bg-card/40 p-6 space-y-4"
      >
        <p className="text-xs font-medium uppercase tracking-wider text-champagne/80">
          Novo item
        </p>
        <div className="space-y-2">
          <Label htmlFor="nome">Nome</Label>
          <Input
            id="nome"
            required
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="desc">Descrição</Label>
          <Input
            id="desc"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
          />
        </div>
        <div className="space-y-2 sm:max-w-xs">
          <Label htmlFor="valor">Valor tabela (R$)</Label>
          <Input
            id="valor"
            required
            type="number"
            step="0.01"
            min="0"
            value={valorTabela}
            onChange={(e) => setValorTabela(e.target.value)}
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" disabled={busy}>
          {busy ? "Salvando..." : "Adicionar"}
        </Button>
      </form>
    </div>
  );
}
