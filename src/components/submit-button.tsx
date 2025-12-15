"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export function SubmitButton({
  label,
  pendingLabel,
  icon,
  pendingIcon,
  disabled,
  ...props
}: {
  label: React.ReactNode;
  pendingLabel?: React.ReactNode;
  icon?: React.ReactNode;
  pendingIcon?: React.ReactNode;
} & Omit<React.ComponentProps<typeof Button>, "children">) {
  const { pending } = useFormStatus();

  return (
    <Button {...props} disabled={disabled || pending}>
      {pending ? (
        <>
          {pendingIcon ?? <Loader2 className="h-4 w-4 animate-spin" />}
          {pendingLabel ?? label}
        </>
      ) : (
        <>
          {icon}
          {label}
        </>
      )}
    </Button>
  );
}

