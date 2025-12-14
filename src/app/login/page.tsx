import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginClient } from "./login-client";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user?.id) redirect("/select-tenant");

  return (
    <div className="mx-auto w-full max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Entrar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Use sua conta Google para acessar.
          </div>
          <LoginClient />
        </CardContent>
      </Card>
    </div>
  );
}

