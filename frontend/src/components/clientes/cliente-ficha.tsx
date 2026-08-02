"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Loader2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateCliente } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ClienteDetalhe } from "@/types/cliente";
import { ORIGENS_CLIENTE } from "@/types/cliente";
import type { StatusFesta } from "@/types/festa";

const selectClassName =
  "flex h-11 w-full rounded-xl neo-inset px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-balloon-sky/30 md:h-9 md:text-sm";

const statusLabel: Record<StatusFesta, string> = {
  ORCAMENTO: "Orçamento",
  AGUARDANDO_PAGAMENTO: "Aguardando pagamento",
  PAGO: "Pago",
  FECHADO: "Fechado",
  EM_MONTAGEM: "Em montagem",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
};

const statusTone: Record<StatusFesta, string> = {
  ORCAMENTO: "bg-balloon-sun/12 text-balloon-sun",
  AGUARDANDO_PAGAMENTO: "bg-balloon-lilac/12 text-balloon-lilac",
  PAGO: "bg-balloon-mint/12 text-balloon-mint",
  FECHADO: "bg-balloon-sky/12 text-balloon-sky",
  EM_MONTAGEM: "bg-balloon-pink/12 text-balloon-pink",
  CONCLUIDO: "bg-balloon-mint/15 text-balloon-mint",
  CANCELADO: "bg-muted text-muted-foreground",
};

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

interface ClienteFichaProps {
  token: string;
  cliente: ClienteDetalhe;
}

export function ClienteFicha({ token, cliente: initial }: ClienteFichaProps) {
  const router = useRouter();
  const [nome, setNome] = useState(initial.nome);
  const [telefone, setTelefone] = useState(initial.telefone);
  const [origem, setOrigem] = useState(initial.origem ?? "");
  const [observacoes, setObservacoes] = useState(initial.observacoes ?? "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      await updateCliente(
        initial.id,
        {
          nome: nome.trim(),
          telefone: telefone.trim(),
          origem: origem.trim() || null,
          observacoes: observacoes.trim() || null,
        },
        token
      );
      setSaved(true);
      router.refresh();
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Não foi possível salvar"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/clientes"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Voltar para clientes
      </Link>

      <div className="rounded-2xl neo-sm p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Ficha do cliente
            </p>
            <h2 className="mt-1 font-display text-2xl text-foreground">
              {initial.nome}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {initial.totalFestas}{" "}
              {initial.totalFestas === 1 ? "festa registrada" : "festas registradas"}
            </p>
          </div>
          <Link
            href={`/vendas/nova?clienteId=${initial.id}`}
            className="rounded-2xl px-4 py-2 text-sm font-medium neo-pink text-white transition-all neo-press"
          >
            Nova venda
          </Link>
        </div>

        <form onSubmit={handleSave} className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(event) => setNome(event.target.value)}
                className="h-11 text-base md:h-9 md:text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                value={telefone}
                onChange={(event) => setTelefone(event.target.value)}
                className="h-11 text-base md:h-9 md:text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="origem">Origem</Label>
            <select
              id="origem"
              value={origem}
              onChange={(event) => setOrigem(event.target.value)}
              className={selectClassName}
            >
              <option value="">Não informada</option>
              {ORIGENS_CLIENTE.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <textarea
              id="observacoes"
              value={observacoes}
              onChange={(event) => setObservacoes(event.target.value)}
              rows={3}
              className="w-full rounded-xl neo-inset px-3 py-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-balloon-sky/30 md:text-sm"
              placeholder="Preferências, restrições, histórico..."
            />
          </div>

          {saveError ? (
            <p className="text-sm text-destructive">{saveError}</p>
          ) : null}
          {saved ? (
            <p className="text-sm text-balloon-mint">Alterações salvas.</p>
          ) : null}

          <Button type="submit" disabled={saving} className="gap-2">
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Salvar alterações
          </Button>
        </form>
      </div>

      <section className="rounded-2xl neo-sm p-4 sm:p-6">
        <div className="flex items-center gap-2">
          <span className="balloon-dot bg-balloon-pink" />
          <span className="balloon-dot bg-balloon-sky" />
          <span className="balloon-dot bg-balloon-sun" />
        </div>
        <h3 className="mt-3 font-display text-xl text-foreground">
          Histórico de festas
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Todas as festas vinculadas a este cliente.
        </p>

        {initial.festas.length === 0 ? (
          <p className="mt-4 rounded-2xl neo-inset px-4 py-6 text-center text-sm text-muted-foreground">
            Nenhuma festa registrada ainda.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {initial.festas.map((festa) => (
              <li key={festa.id}>
                <Link
                  href={`/vendas?festa=${festa.id}`}
                  className="flex flex-col gap-2 rounded-2xl p-4 transition-all neo-inset neo-press hover:ring-1 hover:ring-balloon-sky/30 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">
                      {festa.tema}
                    </p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {formatDateTime(festa.dataEvento)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-xs font-medium",
                        statusTone[festa.status]
                      )}
                    >
                      {statusLabel[festa.status]}
                    </span>
                    <span className="text-sm font-semibold text-foreground">
                      {formatCurrency(festa.valor)}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
