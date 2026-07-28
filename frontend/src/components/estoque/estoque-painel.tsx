"use client";

import { useMemo, useState, useTransition } from "react";
import { AlertTriangle, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { disponibilidadeEstoque } from "@/lib/api";
import { getClientToken } from "@/lib/auth";
import { cn } from "@/lib/utils";
import type { AlertaQr, DisponibilidadeResult, Produto } from "@/types/estoque";

const STATUS_LABEL: Record<string, string> = {
  DISPONIVEL: "Disponível",
  RESERVADA: "Reservada",
  EM_USO: "Em uso",
  MANUTENCAO: "Manutenção",
};

const STATUS_CLASS: Record<string, string> = {
  DISPONIVEL: "bg-balloon-mint/12 text-balloon-mint",
  MANUTENCAO: "bg-balloon-sun/12 text-balloon-sun",
  RESERVADA: "bg-balloon-sky/12 text-balloon-sky",
  EM_USO: "bg-balloon-lilac/12 text-balloon-lilac",
};

interface EstoquePainelProps {
  produtos: Produto[];
  alertasQr?: AlertaQr[];
}

function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function SectionTitle({
  dot,
  children,
}: {
  dot: string;
  children: React.ReactNode;
}) {
  return (
    <h2 className="flex items-center gap-2 font-display text-xl text-foreground">
      <span className={cn("balloon-dot", dot)} />
      {children}
    </h2>
  );
}

function ProdutoCardMobile({ produto }: { produto: Produto }) {
  return (
    <article className="rounded-2xl p-4 neo-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-foreground">{produto.nome}</p>
          <p className="text-sm text-muted-foreground">{produto.categoria}</p>
        </div>
        <p className="shrink-0 text-sm tabular-nums text-balloon-pink">
          {Number(produto.valorAluguel).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })}
        </p>
      </div>

      <div className="mt-3 space-y-2">
        <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
          Unidades
        </p>
        <ul className="space-y-2">
          {produto.unidades.map((u) => (
            <li
              key={u.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm neo-inset"
            >
              <span className="font-medium text-foreground">
                {u.etiqueta || u.codigoQr}
              </span>
              <span
                className={cn(
                  "rounded-lg px-2 py-0.5 text-xs",
                  STATUS_CLASS[u.status] ??
                    "bg-balloon-sky/12 text-balloon-sky"
                )}
              >
                {STATUS_LABEL[u.status] ?? u.status}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        QR obrigatório:{" "}
        <span className="font-medium text-foreground">
          {produto.requerQr ? "Sim" : "Não"}
        </span>
      </p>
    </article>
  );
}

export function EstoquePainel({ produtos, alertasQr = [] }: EstoquePainelProps) {
  const defaultInicio = useMemo(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    return toLocalInputValue(d);
  }, []);
  const defaultFim = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setMinutes(0, 0, 0);
    return toLocalInputValue(d);
  }, []);

  const [produtoId, setProdutoId] = useState(produtos[0]?.id ?? "");
  const [inicio, setInicio] = useState(defaultInicio);
  const [fim, setFim] = useState(defaultFim);
  const [resultado, setResultado] = useState<DisponibilidadeResult | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function consultar() {
    setError(null);
    startTransition(async () => {
      try {
        const token = getClientToken();
        if (!token) {
          throw new Error("Sessão expirada. Faça login novamente.");
        }
        if (!produtoId) {
          throw new Error("Selecione um produto");
        }
        const data = await disponibilidadeEstoque(
          {
            produtoId,
            inicio: new Date(inicio).toISOString(),
            fim: new Date(fim).toISOString(),
          },
          token
        );
        setResultado(data);
      } catch (err) {
        setResultado(null);
        setError(
          err instanceof Error ? err.message : "Falha ao consultar disponibilidade"
        );
      }
    });
  }

  return (
    <div className="space-y-8">
      {alertasQr.length > 0 ? (
        <section className="rounded-2xl border border-balloon-sun/35 bg-balloon-sun/10 px-4 py-3 neo-sm">
          <div className="flex flex-wrap items-center gap-2">
            <AlertTriangle className="size-4 text-balloon-sun" />
            <p className="text-sm font-medium text-foreground">
              {alertasQr.length} alerta{alertasQr.length === 1 ? "" : "s"} QR
            </p>
            <span className="rounded-full bg-balloon-sun/20 px-2 py-0.5 text-xs tabular-nums text-balloon-sun">
              peças sem retorno
            </span>
          </div>
          <ul className="mt-3 space-y-2">
            {alertasQr.slice(0, 5).map((a) => (
              <li
                key={a.unidade.id}
                className="flex flex-wrap items-baseline justify-between gap-2 text-sm text-foreground/90"
              >
                <span>
                  <span className="font-medium">{a.produto.nome}</span>
                  {" · "}
                  <span className="font-mono text-xs">{a.codigoQr}</span>
                </span>
                <span className="text-xs text-muted-foreground">
                  saída{" "}
                  {new Date(a.saidaEm).toLocaleString("pt-BR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                  {a.festaTema ? ` · ${a.festaTema}` : ""}
                </span>
              </li>
            ))}
          </ul>
          {alertasQr.length > 5 ? (
            <p className="mt-2 text-xs text-muted-foreground">
              +{alertasQr.length - 5} outros alertas
            </p>
          ) : null}
        </section>
      ) : null}

      <section className="space-y-4">
        <div>
          <SectionTitle dot="bg-balloon-pink">Catálogo</SectionTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Produtos e unidades físicas com código QR.
          </p>
        </div>

        {produtos.length === 0 ? (
          <p className="rounded-2xl px-4 py-6 text-sm text-muted-foreground neo-sm">
            Nenhum produto cadastrado. Rode o seed da API ou cadastre via{" "}
            <code className="text-balloon-sky">POST /api/produtos</code>.
          </p>
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {produtos.map((p) => (
                <ProdutoCardMobile key={p.id} produto={p} />
              ))}
            </div>

            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Aluguel</TableHead>
                    <TableHead>Unidades</TableHead>
                    <TableHead>QR</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {produtos.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.nome}</TableCell>
                      <TableCell>{p.categoria}</TableCell>
                      <TableCell className="text-balloon-pink">
                        {Number(p.valorAluguel).toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </TableCell>
                      <TableCell>
                        <ul className="space-y-1 text-xs text-muted-foreground">
                          {p.unidades.map((u) => (
                            <li key={u.id} className="flex flex-wrap gap-2">
                              <span className="text-foreground">
                                {u.etiqueta || u.codigoQr}
                              </span>
                              <span
                                className={cn(
                                  "rounded-lg px-1.5 py-0.5",
                                  STATUS_CLASS[u.status] ??
                                    "bg-balloon-sky/12 text-balloon-sky"
                                )}
                              >
                                {STATUS_LABEL[u.status] ?? u.status}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {p.requerQr ? "Sim" : "Não"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </section>

      <section className="space-y-4 border-t border-[var(--neo-dark)]/25 pt-8">
        <div>
          <SectionTitle dot="bg-balloon-sky">Disponibilidade</SectionTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Consulta anti-overbooking por janela de datas (montagem → retorno + cura).
          </p>
        </div>

        <div className="flex flex-col gap-4 rounded-2xl p-4 md:grid md:grid-cols-2 lg:grid-cols-4 neo-sm">
          <div className="space-y-2 lg:col-span-1">
            <Label htmlFor="produto">Produto</Label>
            <select
              id="produto"
              value={produtoId}
              onChange={(e) => setProdutoId(e.target.value)}
              className="flex h-11 w-full rounded-2xl border-0 bg-[var(--neo-bg)] px-3 text-base shadow-[var(--shadow-neo-inset)] outline-none focus-visible:ring-3 focus-visible:ring-balloon-sky/30 md:h-9 md:text-sm"
            >
              {produtos.map((p) => (
                <option key={p.id} value={p.id} className="bg-background">
                  {p.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="inicio">Início</Label>
            <Input
              id="inicio"
              type="datetime-local"
              className="h-11 text-base md:h-9 md:text-sm"
              value={inicio}
              onChange={(e) => setInicio(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fim">Fim</Label>
            <Input
              id="fim"
              type="datetime-local"
              className="h-11 text-base md:h-9 md:text-sm"
              value={fim}
              onChange={(e) => setFim(e.target.value)}
            />
          </div>
          <div className="md:flex md:items-end">
            <Button
              type="button"
              onClick={consultar}
              disabled={pending || !produtoId}
              className="min-h-11 w-full gap-1.5 md:min-h-9"
            >
              <Search className="size-4" />
              {pending ? "Consultando…" : "Consultar"}
            </Button>
          </div>
        </div>

        {error ? (
          <p className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive neo-sm">
            {error}
          </p>
        ) : null}

        {resultado ? (
          <div className="rounded-2xl p-4 neo-sm">
            <p className="text-sm text-foreground">
              <span className="font-medium">{resultado.produto.nome}</span>
              {" — "}
              <span className="font-medium text-balloon-mint">
                {resultado.disponiveis}/{resultado.totalUnidades}
              </span>{" "}
              unidades livres no período
            </p>
            {resultado.unidades.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Nenhuma unidade disponível. Reserva seria bloqueada (409).
              </p>
            ) : (
              <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {resultado.unidades.map((u) => (
                  <li
                    key={u.id}
                    className="rounded-xl px-3 py-2.5 text-sm neo-inset md:py-2"
                  >
                    <span className="font-medium">
                      {u.etiqueta || u.codigoQr}
                    </span>
                    <span className="ml-2 font-mono text-xs text-muted-foreground">
                      {u.codigoQr}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}
