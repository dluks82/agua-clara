"use client";

import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/icons/google";

export function SignInGoogleButton({
  label = "Entrar com Google",
  callbackUrl = "/select-tenant",
  className,
  size,
  variant,
}: {
  label?: string;
  callbackUrl?: string;
  className?: string;
  size?: React.ComponentProps<typeof Button>["size"];
  variant?: React.ComponentProps<typeof Button>["variant"];
}) {
  return (
    <Button
      className={className}
      size={size}
      variant={variant}
      onClick={() => {
        void signIn("google", { callbackUrl });
      }}
    >
      <GoogleIcon className="size-4" />
      {label}
    </Button>
  );
}
