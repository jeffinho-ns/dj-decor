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
    <div className="flex min-h-screen">
      <div className="sticky top-0 hidden h-screen md:block">
        <Sidebar user={user} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 border-b border-border/70 bg-background/85 px-4 py-4 backdrop-blur-md md:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-display text-sm text-champagne md:hidden">
                DJ Decor
              </p>
              <h1 className="font-display text-xl tracking-tight text-foreground sm:text-2xl">
                {title}
              </h1>
              {description ? (
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {description}
                </p>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              {actions}
              <LogoutButton />
            </div>
          </div>
          <MobileNav />
        </header>

        <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
