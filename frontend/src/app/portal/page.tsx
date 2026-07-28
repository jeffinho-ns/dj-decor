import type { Metadata } from "next";

import { PortalClientView } from "@/components/portal/portal-client-view";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Portal do cliente — DJ Decor",
  description: "Acompanhe o status da decoração da sua festa.",
  openGraph: {
    title: "Portal do cliente — DJ Decor",
    description: "Acompanhe o status da decoração da sua festa.",
    type: "website",
  },
};

interface PortalPageProps {
  searchParams: Promise<{ id?: string }>;
}

export default async function PortalPage({ searchParams }: PortalPageProps) {
  const params = await searchParams;
  const festaId = params.id?.trim() || null;

  return (
    <main className="relative z-10 min-h-screen bg-transparent">
      <PortalClientView festaId={festaId} />
    </main>
  );
}
