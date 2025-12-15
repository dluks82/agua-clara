"use client";

import { signOut } from "next-auth/react";
import { Building2, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
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
        <SubmitButton
          type="submit"
          variant="outline"
          size={size}
          icon={<Building2 className="h-4 w-4" />}
          label="Trocar organização"
          pendingLabel="Trocando..."
        />
      </form>
      <Button
        variant="outline"
        size={size}
        onClick={() => {
          void signOut({ callbackUrl: "/login" });
        }}
      >
        <LogOut className="h-4 w-4" />
        Sair
      </Button>
    </div>
  );
}
