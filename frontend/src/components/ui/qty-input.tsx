"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type QtyInputProps = {
  value: number;
  draft?: string;
  onDraftChange: (draft: string) => void;
  /** null = desmarcar item (campo vazio ou inválido) */
  onCommit: (qty: number | null) => void;
  className?: string;
};

/** Quantidade efetiva durante digitação (draft vazio = 0 no total). */
export function resolveDraftQty(committed: number, draft?: string): number {
  if (draft !== undefined) {
    const trimmed = draft.trim();
    if (!trimmed) return 0;
    const parsed = Math.floor(Number(trimmed));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }
  return committed > 0 ? committed : 0;
}

export function QtyInput({
  value,
  draft,
  onDraftChange,
  onCommit,
  className,
}: QtyInputProps) {
  const display = draft ?? (value > 0 ? String(value) : "");

  return (
    <Input
      inputMode="numeric"
      pattern="[0-9]*"
      autoComplete="off"
      className={cn("h-8 w-16 tabular-nums", className)}
      value={display}
      onChange={(event) => onDraftChange(event.target.value.replace(/\D/g, ""))}
      onBlur={() => {
        const raw = (draft ?? String(value)).trim();
        if (!raw) {
          onCommit(null);
          return;
        }
        const parsed = Math.floor(Number(raw));
        if (!Number.isFinite(parsed) || parsed <= 0) {
          onCommit(null);
          return;
        }
        onCommit(Math.max(1, parsed));
      }}
      onClick={(event) => event.stopPropagation()}
    />
  );
}
