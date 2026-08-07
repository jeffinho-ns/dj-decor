import { LogoutButton } from "@/components/layout/logout-button";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Sidebar } from "@/components/layout/sidebar";
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
      <div className="sticky top-0 hidden h-dvh md:block">
        <Sidebar user={user} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className="sticky top-0 z-30 mx-3 mt-3 rounded-2xl neo-sm md:mx-6 md:mt-4"
          style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top, 0px))" }}
        >
          <div className="flex items-start justify-between gap-2 px-4 py-3 md:gap-3 md:px-5 md:py-4">
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-1.5 md:hidden">
                <span className="balloon-dot bg-balloon-pink" />
                <span className="balloon-dot bg-balloon-sky" />
                <span className="balloon-dot bg-balloon-sun" />
                <p className="ml-1 font-display text-xs font-semibold text-balloon-pink">
                  DJ festas
                </p>
              </div>
              <h1 className="truncate font-display text-xl tracking-tight text-foreground sm:text-2xl">
                {title}
              </h1>
              {description ? (
                <p className="mt-0.5 line-clamp-2 hidden text-sm text-muted-foreground sm:block">
                  {description}
                </p>
              ) : null}
            </div>
            <div className="flex max-w-[55%] shrink-0 flex-wrap items-center justify-end gap-1.5 sm:max-w-none sm:gap-2">
              {actions}
              <LogoutButton />
            </div>
          </div>
        </header>

        <main className="relative z-10 min-w-0 flex-1 overflow-x-hidden px-3 py-4 pb-nav sm:px-4 md:px-8 md:py-6 md:pb-6">
          {children}
        </main>

        <MobileNav user={user} />
      </div>
    </div>
  );
}
