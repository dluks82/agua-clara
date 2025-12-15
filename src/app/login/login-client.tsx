"use client";

import { SignInGoogleButton } from "@/components/sign-in-google-button";

export function LoginClient() {
  return <SignInGoogleButton className="w-full" label="Entrar com Google" callbackUrl="/select-tenant" />;
}
