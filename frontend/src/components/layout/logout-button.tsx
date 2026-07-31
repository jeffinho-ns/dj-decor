"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { logout } from "@/lib/api";
import { clearClientToken, getClientToken } from "@/lib/auth";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    const token = getClientToken();
    try {
      await logout(token);
    } finally {
      clearClientToken();
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleLogout}
      disabled={loading}
      className="min-h-[var(--touch-min,44px)] min-w-[var(--touch-min,44px)] gap-1.5 text-muted-foreground hover:text-foreground md:min-h-0 md:min-w-0"
    >
      <LogOut className="size-4" />
      <span className="hidden sm:inline">Sair</span>
    </Button>
  );
}
