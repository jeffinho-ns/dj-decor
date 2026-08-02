"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ContactRound, Loader2, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { listClientes } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { ClienteListItem } from "@/types/cliente";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

interface ClientesPainelProps {
  token: string;
  initialClientes: ClienteListItem[];
}

export function ClientesPainel({
  token,
  initialClientes,
}: ClientesPainelProps) {
  const [query, setQuery] = useState("");
  const [clientes, setClientes] = useState(initialClientes);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length === 0) {
      setClientes(initialClientes);
      setError(null);
      return;
    }

    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const list = await listClientes(token, trimmed);
        setClientes(list);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Falha ao buscar clientes"
        );
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [query, token, initialClientes]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por nome ou telefone..."
          className="h-11 pl-9 text-base md:h-9 md:text-sm"
          aria-label="Buscar clientes"
        />
        {loading ? (
          <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : null}
      </div>

      {error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive neo-sm">
          {error}
        </div>
      ) : null}

      {clientes.length === 0 ? (
        <div className="rounded-2xl neo-inset px-6 py-10 text-center">
          <ContactRound className="mx-auto size-10 text-balloon-sky/70" />
          <p className="mt-3 font-medium text-foreground">
            {query.trim() ? "Nenhum cliente encontrado" : "Nenhum cliente ainda"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {query.trim()
              ? "Tente outro nome ou telefone."
              : "Clientes aparecem aqui ao registrar vendas."}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {clientes.map((cliente) => (
            <li key={cliente.id}>
              <Link
                href={`/clientes/${cliente.id}`}
                className="flex flex-col gap-2 rounded-2xl p-4 transition-all neo-sm neo-press hover:ring-1 hover:ring-balloon-pink/30 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">
                    {cliente.nome}
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {cliente.telefone}
                  </p>
                  {cliente.origem ? (
                    <span className="mt-2 inline-flex rounded-full bg-balloon-sky/15 px-2 py-0.5 text-[11px] font-medium text-balloon-sky">
                      {cliente.origem}
                    </span>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2 text-xs text-muted-foreground sm:flex-col sm:items-end sm:text-right">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 font-medium",
                      cliente.totalFestas > 0
                        ? "neo-sun text-foreground"
                        : "neo-inset"
                    )}
                  >
                    {cliente.totalFestas}{" "}
                    {cliente.totalFestas === 1 ? "festa" : "festas"}
                  </span>
                  {cliente.ultimaFesta ? (
                    <span>Última: {formatDate(cliente.ultimaFesta)}</span>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
