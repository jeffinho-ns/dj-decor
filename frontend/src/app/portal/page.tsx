import type { Metadata } from "next";

import { PortalClientView } from "@/components/portal/portal-client-view";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Portal do cliente — DJ festas",
  description: "Acompanhe o status da decoração da sua festa.",
  openGraph: {
    title: "Portal do cliente — DJ festas",
    description: "Acompanhe o status da decoração da sua festa.",
    type: "website",
  },
};

interface PortalPageProps {
  searchParams: Promise<{ t?: string; id?: string }>;
}

export default async function PortalPage({ searchParams }: PortalPageProps) {
  const params = await searchParams;
  const token = params.t?.trim() || null;
  const legacyId = params.id?.trim() || null;

  return (
    <main className="relative z-10 min-h-screen bg-transparent">
      <PortalClientView token={token} legacyId={legacyId} />
    </main>
  );
}
