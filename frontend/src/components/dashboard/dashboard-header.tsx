import { roleLabel } from "@/lib/auth";
import type { Role } from "@/types/auth";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

interface DashboardHeaderProps {
  nome: string;
  role: Role;
}

export function DashboardHeader({ nome, role }: DashboardHeaderProps) {
  const firstName = nome.split(" ")[0];

  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
        {roleLabel(role)}
      </p>
      <h2 className="mt-1 text-balance font-display text-3xl text-foreground sm:text-4xl">
        {greeting()}, <span className="text-champagne">{firstName}</span>
      </h2>
    </div>
  );
}
