"use client";

import { useEffect, useState } from "react";
import { Loader2, StickyNote } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const textareaClassName =
  "flex min-h-[5.5rem] w-full rounded-xl neo-inset px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-balloon-sun/30";

interface NotasInternasEditorProps {
  value: string | null | undefined;
  onSave: (value: string | null) => Promise<void>;
  pending?: boolean;
  readOnly?: boolean;
  hint?: string;
  className?: string;
}

export function NotasInternasEditor({
  value,
  onSave,
  pending = false,
  readOnly = false,
  hint,
  className,
}: NotasInternasEditorProps) {
  const [texto, setTexto] = useState(value ?? "");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (dirty) return;
    setTexto(value ?? "");
  }, [value, dirty]);

  const saved = (value ?? "").trim();
  const current = texto.trim();
  const canSave = dirty && saved !== current && !pending;

  async function handleSave() {
    await onSave(current || null);
    setDirty(false);
  }

  if (readOnly) {
    if (!saved) return null;
    return (
      <div
        className={cn(
          "rounded-xl border border-balloon-sun/30 bg-balloon-sun/10 px-3 py-2",
          className
        )}
      >
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-balloon-sun">
          <StickyNote className="size-3.5" />
          Alterações da montagem
        </p>
        <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
          {saved}
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor="notas-internas" className="flex items-center gap-1.5">
        <StickyNote className="size-3.5 text-balloon-sun" />
        Notas internas da montagem
      </Label>
      <textarea
        id="notas-internas"
        rows={4}
        value={texto}
        disabled={pending}
        placeholder="Ex.: trocar mesa quadrada pela redonda; cilindros de madeira por acrílico"
        className={textareaClassName}
        onChange={(e) => {
          setTexto(e.target.value);
          setDirty(true);
        }}
      />
      {hint ? (
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      ) : null}
      <div className="flex items-center justify-end gap-2">
        {dirty ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => {
              setTexto(value ?? "");
              setDirty(false);
            }}
          >
            Cancelar
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          disabled={!canSave}
          onClick={() => void handleSave()}
        >
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
          Salvar notas
        </Button>
      </div>
    </div>
  );
}
