import { PortalClientView } from "@/components/portal/portal-client-view";

export const dynamic = "force-dynamic";

interface PortalPageProps {
  searchParams: Promise<{ id?: string }>;
}

export default async function PortalPage({ searchParams }: PortalPageProps) {
  const params = await searchParams;
  const festaId = params.id?.trim() || null;

  return (
    <main className="min-h-screen bg-background">
      <PortalClientView festaId={festaId} />
    </main>
  );
}
