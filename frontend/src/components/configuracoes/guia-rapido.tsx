"use client";

import { useState } from "react";
import { ChevronDown, Lightbulb } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Role } from "@/types/auth";

interface GuiaItem {
  title: string;
  steps: string[];
}

function guiaParaRole(role: Role): GuiaItem[] {
  if (role === "MONTADOR") {
    return [
      {
        title: "Fluxo de montagem",
        steps: [
          "Abra Montagem e toque na festa atribuída.",
          "1 Separar no estoque → 2 Check-in no local → 3 Montar → 4 Foto → 5 Finalizar saída.",
          "Sem sinal? Os toques do checklist ficam na fila offline e sobem depois.",
        ],
      },
      {
        title: "Dicas no campo",
        steps: [
          "Use a Agenda para ver o mês e confirmar horários.",
          "Em Configurações, veja o WhatsApp da base se precisar de apoio.",
          "Troque a senha temporária no Perfil assim que puder.",
        ],
      },
    ];
  }

  if (role === "VENDEDOR") {
    return [
      {
        title: "Do orçamento ao pagamento",
        steps: [
          "Nova venda → preencha cliente, tema e kit.",
          "Acompanhe status em Vendas (orçamento → pago → fechado).",
          "Após pagamento, compartilhe o portal do cliente quando disponível.",
        ],
      },
      {
        title: "Rotina útil",
        steps: [
          "Use a Agenda para não marcar conflito de data.",
          "Lixeira guarda festas canceladas sem poluir o kanban.",
          "Cadastre seu WhatsApp no Perfil para a equipe te achar.",
        ],
      },
    ];
  }

  return [
    {
      title: "Operação do dia",
      steps: [
        "Equipe: atribua montador nas festas pagas/fechadas.",
        "Estoque: confira faltantes antes do fechamento.",
        "Aprovações e Follow-ups: destravam vendas e pós-venda.",
      ],
    },
    {
      title: "Configurações que importam",
      steps: [
        "Atualize contatos da base para o time no campo.",
        "Ajuste comissão, meta e cláusulas do contrato.",
        "Kits e add-ons: ative/desative e alinhe valores com a venda.",
      ],
    },
  ];
}

interface GuiaRapidoProps {
  role: Role;
}

export function GuiaRapido({ role }: GuiaRapidoProps) {
  const itens = guiaParaRole(role);
  const [open, setOpen] = useState<string | null>(itens[0]?.title ?? null);

  return (
    <section className="rounded-2xl p-5 sm:p-6 neo-sm">
      <div className="flex items-center gap-2">
        <Lightbulb className="size-5 text-balloon-sun" />
        <h2 className="font-display text-xl text-foreground">Guia rápido</h2>
      </div>
      <p className="mt-1.5 text-sm text-muted-foreground">
        O essencial do seu cargo neste app.
      </p>

      <div className="mt-4 space-y-2">
        {itens.map((item) => {
          const isOpen = open === item.title;
          return (
            <div key={item.title} className="rounded-2xl neo-inset">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : item.title)}
              >
                <span className="text-sm font-medium text-foreground">
                  {item.title}
                </span>
                <ChevronDown
                  className={cn(
                    "size-4 shrink-0 text-muted-foreground transition-transform",
                    isOpen && "rotate-180"
                  )}
                />
              </button>
              {isOpen ? (
                <ol className="space-y-2 border-t border-[var(--neo-dark)]/20 px-4 py-3 text-sm text-muted-foreground">
                  {item.steps.map((step) => (
                    <li key={step} className="list-decimal list-inside">
                      {step}
                    </li>
                  ))}
                </ol>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
