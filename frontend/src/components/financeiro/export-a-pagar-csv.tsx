"use client";

import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { APagarItem } from "@/types/financeiro";

function escapeCsvCell(value: string): string {
  if (/[;"\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatDataCsv(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      timeZone: "America/Sao_Paulo",
    });
  } catch {
    return iso;
  }
}

/** Gera e baixa CSV (nome;tipo;festa;data;valor) dos itens liberados. */
export function downloadAPagarCsv(itens: APagarItem[], mes?: string | null) {
  const header = "nome;tipo;festa;data;valor";
  const lines = itens.map((item) =>
    [
      escapeCsvCell(item.beneficiarioNome),
      escapeCsvCell(item.tipoLabel || item.tipo),
      escapeCsvCell(item.festaTema),
      escapeCsvCell(formatDataCsv(item.dataEvento)),
      String(item.valor).replace(".", ","),
    ].join(";")
  );
  const csv = [header, ...lines].join("\n");
  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = mes || new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `a-pagar-${stamp}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

interface ExportAPagarCsvProps {
  itens: APagarItem[];
  mes?: string | null;
  disabled?: boolean;
}

export function ExportAPagarCsv({
  itens,
  mes,
  disabled,
}: ExportAPagarCsvProps) {
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={disabled || itens.length === 0}
      onClick={() => downloadAPagarCsv(itens, mes)}
    >
      <Download className="size-3.5" />
      Exportar CSV
    </Button>
  );
}
