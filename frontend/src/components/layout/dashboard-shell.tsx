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
    <div className="flex min-h-dvh">
      <div className="sticky top-0 hidden h-dvh md:block">
        <Sidebar user={user} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-md md:px-8"
          style={{ paddingTop: "max(0.625rem, env(safe-area-inset-top, 0px))" }}
        >
          <div className="flex items-start justify-between gap-3 px-4 pb-2.5 md:px-0 md:pb-4 md:pt-4">
            <div className="min-w-0 flex-1">
              <p className="font-display text-xs text-champagne md:hidden">DJ Decor</p>
              <h1 className="truncate font-display text-lg tracking-tight text-foreground sm:text-2xl">
                {title}
              </h1>
              {description ? (
                <p className="mt-0.5 hidden text-sm text-muted-foreground sm:block">
                  {description}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {actions}
              <LogoutButton />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden px-4 py-4 pb-nav md:px-8 md:py-6 md:pb-6">
          {children}
        </main>

        <MobileNav user={user} />
      </div>
    </div>
  );
}
