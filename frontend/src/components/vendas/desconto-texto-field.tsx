"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { descreverDesconto } from "@/lib/desconto-texto";
import { formatCurrency } from "@/lib/format";

interface DescontoTextoFieldProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  valorVenda: number;
  disabled?: boolean;
  /** Quando false, o campo vazio não mostra erro. */
  obrigatorio?: boolean;
  ocultarRotulo?: boolean;
}

export function DescontoTextoField({
  id,
  value,
  onChange,
  valorVenda,
  disabled = false,
  obrigatorio = false,
  ocultarRotulo = false,
}: DescontoTextoFieldProps) {
  const texto = value.trim();
  const preview =
    texto.length > 0 ? descreverDesconto(valorVenda, texto) : null;

  return (
    <div
      className="space-y-1"
      onClick={(event) => event.stopPropagation()}
    >
      {ocultarRotulo ? null : (
        <Label htmlFor={id} className="text-xs text-muted-foreground">
          Desconto
        </Label>
      )}
      <Input
        id={id}
        type="text"
        className="h-11 md:h-9"
        placeholder="desconto de R$50 ou desconto de 100%"
        value={value}
        disabled={disabled}
        autoComplete="off"
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => onChange(event.target.value)}
      />
      {preview?.ok ? (
        <p className="text-[11px] text-muted-foreground">
          Abate{" "}
          <span className="font-medium text-foreground">
            {formatCurrency(preview.abatimento)}
          </span>{" "}
          ({preview.rotulo}). O valor fica em{" "}
          <span className="font-medium text-foreground">
            {formatCurrency(preview.valorFinal)}
          </span>
          .
        </p>
      ) : preview && !preview.ok ? (
        <p className="text-xs text-destructive">{preview.mensagem}</p>
      ) : (
        <p className="text-[11px] text-muted-foreground">
          {obrigatorio
            ? "Escreva o desconto em reais ou em porcentagem."
            : "Opcional. Escreva em reais ou em porcentagem."}{" "}
          Exemplos: desconto de R$50, desconto de 50 reais, desconto de 50% ou
          desconto de 100%.
        </p>
      )}
    </div>
  );
}
