"use client";

import { signOut } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AccountActions({
  clearTenantAction,
  size = "sm",
  className,
}: {
  clearTenantAction: () => Promise<void>;
  size?: "sm" | "default";
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <form action={clearTenantAction}>
        <Button type="submit" variant="outline" size={size}>
          Trocar organização
        </Button>
      </form>
      <Button
        variant="outline"
        size={size}
        onClick={() => {
          void signOut({ callbackUrl: "/login" });
        }}
      >
        Sair
      </Button>
    </div>
  );
}
