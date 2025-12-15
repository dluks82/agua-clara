"use client";

import { signOut } from "next-auth/react";

import { Button } from "@/components/ui/button";

export function AccountActions({ clearTenantAction }: { clearTenantAction: () => Promise<void> }) {
  return (
    <div className="flex items-center gap-2">
      <form action={clearTenantAction}>
        <Button type="submit" variant="outline" size="sm">
          Trocar organização
        </Button>
      </form>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          void signOut({ callbackUrl: "/login" });
        }}
      >
        Sair
      </Button>
    </div>
  );
}

