"use client";

import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";

export function LoginClient() {
  return (
    <Button
      className="w-full"
      onClick={() => {
        void signIn("google", { callbackUrl: "/select-tenant" });
      }}
    >
      Entrar com Google
    </Button>
  );
}

