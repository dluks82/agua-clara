"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AccountActions({
  size = "sm",
  className,
}: {
  size?: "sm" | "default";
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button
        variant="outline"
        size={size}
        onClick={() => {
          void signOut({ callbackUrl: "/" });
        }}
      >
        <LogOut className="h-4 w-4" />
        Sair
      </Button>
    </div>
  );
}
