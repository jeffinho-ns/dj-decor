"use client";

import Link from "next/link";
import {
  CalendarDays,
  ClipboardCheck,
  Package,
  Users,
  Wallet,
  Hammer,
  ShoppingBag,
  UserPlus,
  PhoneForwarded,
} from "lucide-react";

import type { Role } from "@/types/auth";
import { cn } from "@/lib/utils";

interface Atalho {
  href: string;
  label: string;
  description: string;
  icon: typeof CalendarDays;
  tone: string;
}

function atalhosParaRole(role: Role): Atalho[] {
  const agenda: Atalho = {
    href: "/dashboard",
    label: "Agenda",
    description: "Calendário do mês",
    icon: CalendarDays,
    tone: "text-balloon-sky",
  };

  if (role === "MONTADOR") {
    return [
      {
        href: "/montagem",
        label: "Montagem",
        description: "Suas festas atribuídas",
        icon: Hammer,
        tone: "text-balloon-pink",
      },
      agenda,
    ];
  }

  if (role === "VENDEDOR") {
    return [
      {
        href: "/vendas/nova",
        label: "Nova venda",
        description: "Abrir orçamento",
        icon: ShoppingBag,
        tone: "text-balloon-pink",
      },
      {
        href: "/vendas",
        label: "Vendas",
        description: "Pipeline e festas",
        icon: ClipboardCheck,
        tone: "text-balloon-sun",
      },
      agenda,
    ];
  }

  const baseGerencia: Atalho[] = [
    {
      href: "/equipe",
      label: "Equipe",
      description: "Atribuir montadores",
      icon: Users,
      tone: "text-balloon-pink",
    },
    {
      href: "/estoque",
      label: "Estoque",
      description: "Materiais e reservas",
      icon: Package,
      tone: "text-balloon-sky",
    },
    {
      href: "/aprovacoes",
      label: "Aprovações",
      description: "Descontos pendentes",
      icon: ClipboardCheck,
      tone: "text-balloon-sun",
    },
    {
      href: "/follow-ups",
      label: "Follow-ups",
      description: "Contatos em aberto",
      icon: PhoneForwarded,
      tone: "text-balloon-lilac",
    },
  ];

  if (role === "GERENTE") {
    return [...baseGerencia, agenda];
  }

  return [
    ...baseGerencia,
    {
      href: "/usuarios",
      label: "Usuários",
      description: "Acessos da equipe",
      icon: UserPlus,
      tone: "text-balloon-mint",
    },
    {
      href: "/financeiro",
      label: "Financeiro",
      description: "Comissões e caixa",
      icon: Wallet,
      tone: "text-balloon-sun",
    },
    agenda,
  ];
}

interface PerfilAtalhosProps {
  role: Role;
}

export function PerfilAtalhos({ role }: PerfilAtalhosProps) {
  const itens = atalhosParaRole(role);

  return (
    <section className="rounded-2xl p-5 sm:p-6 neo-sm">
      <div className="flex items-center gap-2">
        <span className="balloon-dot bg-balloon-pink" />
        <span className="balloon-dot bg-balloon-sky" />
        <span className="balloon-dot bg-balloon-sun" />
      </div>
      <p className="mt-3 text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
        Meu dia
      </p>
      <h2 className="mt-1 font-display text-xl text-foreground">
        Atalhos do seu cargo
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Abra direto o que você mais usa.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {itens.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col gap-2 rounded-2xl p-3 text-left transition-all neo-press neo-inset hover:ring-1 hover:ring-balloon-pink/40"
            >
              <Icon className={cn("size-5", item.tone)} />
              <span>
                <span className="block text-sm font-medium text-foreground">
                  {item.label}
                </span>
                <span className="mt-0.5 block text-[11px] text-muted-foreground">
                  {item.description}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
