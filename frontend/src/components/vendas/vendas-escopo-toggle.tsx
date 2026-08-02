"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VendasEscopoToggleProps {
  minhas: boolean;
  className?: string;
}

export function VendasEscopoToggle({ minhas, className }: VendasEscopoToggleProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setEscopo(nextMinhas: boolean) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextMinhas) {
      params.set("minhas", "1");
    } else {
      params.set("minhas", "0");
    }
    const qs = params.toString();
    router.replace(qs ? `/vendas?${qs}` : "/vendas");
  }

  return (
    <div className={cn("flex w-full gap-1 rounded-2xl neo-inset p-0.5 sm:w-auto", className)}>
      <Button
        type="button"
        size="xs"
        variant={minhas ? "secondary" : "ghost"}
        onClick={() => setEscopo(true)}
        className="min-h-10 flex-1 px-3 sm:flex-none md:min-h-6 md:px-2"
      >
        Minhas
      </Button>
      <Button
        type="button"
        size="xs"
        variant={!minhas ? "secondary" : "ghost"}
        onClick={() => setEscopo(false)}
        className="min-h-10 flex-1 px-3 sm:flex-none md:min-h-6 md:px-2"
      >
        Todas
      </Button>
    </div>
  );
}
