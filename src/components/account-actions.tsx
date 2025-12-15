"use client";

import { signOut } from "next-auth/react";
import { use } from "react";

import { Button } from "@/components/ui/button";

export function AccountActions({
  clearTenantAction,
  tenantNamePromise,
}: {
  clearTenantAction: () => Promise<void>;
  tenantNamePromise: Promise<string | null>;
}) {
  const tenantName = use(tenantNamePromise);
  return (
    <div className="flex items-center gap-2">
      {tenantName && (
        <div className="hidden text-sm text-muted-foreground sm:block">
          {tenantName}
        </div>
      )}
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
