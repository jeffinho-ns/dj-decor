"use client";

import { Label } from "@/components/ui/label";
import { roleLabel } from "@/lib/auth";
import { cn } from "@/lib/utils";
import type { Role } from "@/types/auth";
import type { EquipeFestaValue, Montador } from "@/types/equipe";

export const DIARIA_PADRAO = {
  montagemProprio: 150,
  montagemEmpresa: 130,
  desmontagemProprio: 130,
  desmontagemEmpresa: 80,
} as const;

function pessoaLabel(pessoa: Montador): string {
  const cargo = pessoa.role ? roleLabel(pessoa.role as Role, pessoa.nome) : null;
  return cargo ? `${pessoa.nome} · ${cargo}` : pessoa.nome;
}

function CarroOpcoes({
  value,
  proprioLabel,
  empresaLabel,
  disabled,
  onChange,
}: {
  value: boolean;
  proprioLabel?: string;
  empresaLabel?: string;
  disabled?: boolean;
  onChange: (carroProprio: boolean) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(true)}
        className={cn(
          "rounded-xl px-2 py-2 text-left text-xs leading-snug outline-none focus-visible:ring-2 focus-visible:ring-balloon-sky/30",
          value ? "neo-inset text-foreground" : "neo-sm text-muted-foreground"
        )}
      >
        Carro próprio
        {proprioLabel ? (
          <span className="mt-0.5 block font-medium text-foreground">
            {proprioLabel}
          </span>
        ) : null}
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(false)}
        className={cn(
          "rounded-xl px-2 py-2 text-left text-xs leading-snug outline-none focus-visible:ring-2 focus-visible:ring-balloon-sky/30",
          !value ? "neo-inset text-foreground" : "neo-sm text-muted-foreground"
        )}
      >
        Carro da empresa
        {empresaLabel ? (
          <span className="mt-0.5 block font-medium text-foreground">
            {empresaLabel}
          </span>
        ) : null}
      </button>
    </div>
  );
}

interface EquipeFestaFieldsProps {
  pessoas: Montador[];
  value: EquipeFestaValue;
  onChange: (value: EquipeFestaValue) => void;
  disabled?: boolean;
  required?: boolean;
  compact?: boolean;
  valores?: Partial<typeof DIARIA_PADRAO>;
}

export function EquipeFestaFields({
  pessoas,
  value,
  onChange,
  disabled,
  required,
  compact,
  valores,
}: EquipeFestaFieldsProps) {
  const v = { ...DIARIA_PADRAO, ...valores };
  const options = [
    { id: "", nome: required ? "Selecione…" : "Ainda não definido" },
    ...pessoas,
  ];

  return (
    <div className={cn("space-y-4", compact && "space-y-3")}>
      <div className="space-y-2">
        <Label className="text-sm">Quem monta</Label>
        <select
          className="flex h-11 w-full rounded-xl neo-inset px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-balloon-sky/30 md:h-9"
          value={value.montadorEquipeId ?? ""}
          disabled={disabled}
          onChange={(e) =>
            onChange({
              ...value,
              montadorEquipeId: e.target.value || null,
            })
          }
        >
          {options.map((p) => (
            <option key={p.id || "none"} value={p.id}>
              {p.id ? pessoaLabel(p) : p.nome}
            </option>
          ))}
        </select>
        <CarroOpcoes
          value={value.montadorCarroProprio}
          disabled={disabled}
          onChange={(montadorCarroProprio) =>
            onChange({ ...value, montadorCarroProprio })
          }
        />
        <p className="text-[11px] text-muted-foreground">
          Valor de montagem incluso no plano — sem pagamento separado.
        </p>
      </div>

      <div className="space-y-2">
        <Label className="text-sm">Quem desmonta</Label>
        <select
          className="flex h-11 w-full rounded-xl neo-inset px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-balloon-sky/30 md:h-9"
          value={value.desmontadorEquipeId ?? ""}
          disabled={disabled}
          onChange={(e) =>
            onChange({
              ...value,
              desmontadorEquipeId: e.target.value || null,
            })
          }
        >
          {options.map((p) => (
            <option key={p.id || "none-d"} value={p.id}>
              {p.id ? pessoaLabel(p) : p.nome}
            </option>
          ))}
        </select>
        <CarroOpcoes
          value={value.desmontadorCarroProprio}
          proprioLabel={`R$ ${v.desmontagemProprio}/dia`}
          empresaLabel={`R$ ${v.desmontagemEmpresa}/dia`}
          disabled={disabled}
          onChange={(desmontadorCarroProprio) =>
            onChange({ ...value, desmontadorCarroProprio })
          }
        />
      </div>

      <p className="text-[11px] leading-snug text-muted-foreground">
        Desmontagem é paga por dia de trabalho. Qualquer pessoa da equipe pode
        montar ou desmontar.
      </p>
    </div>
  );
}
