import { ConteudoPrincipal } from "@/components/layout/conteudo-principal";
import { LogoutButton } from "@/components/layout/logout-button";
import { MobileNav } from "@/components/layout/mobile-nav";
import { NavegacaoProgresso } from "@/components/layout/navegacao-progresso";
import { Sidebar } from "@/components/layout/sidebar";
import { TituloAnimado } from "@/components/layout/titulo-animado";
import type { User } from "@/types/auth";

interface DashboardShellProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  user: User;
}

export function DashboardShell({
  children,
  title,
  description,
  actions,
  user,
}: DashboardShellProps) {
  return (
    <div className="relative z-10 flex min-h-dvh">
      <NavegacaoProgresso />

      <div className="sticky top-0 hidden h-dvh md:block">
        <Sidebar user={user} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className="sticky top-0 z-30 mx-3 mt-3 rounded-2xl neo-sm md:mx-6 md:mt-4"
          style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top, 0px))" }}
        >
          <div className="flex items-start justify-between gap-2 px-4 py-3 md:gap-3 md:px-5 md:py-4">
            <TituloAnimado title={title} description={description} />
            <div className="flex max-w-[55%] shrink-0 flex-wrap items-center justify-end gap-1.5 sm:max-w-none sm:gap-2">
              {actions}
              <LogoutButton />
            </div>
          </div>
        </header>

        <ConteudoPrincipal>{children}</ConteudoPrincipal>

        <MobileNav user={user} />
      </div>
    </div>
  );
}
