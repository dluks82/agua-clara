"use client";

import { useEffect, useRef } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AutoSelectTenant({
  tenantId,
  selectTenantAction,
}: {
  tenantId: string;
  selectTenantAction: (formData: FormData) => Promise<void>;
}) {
  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    formRef.current?.requestSubmit();
  }, []);

  return (
    <div className="mx-auto w-full max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Entrando…</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <form ref={formRef} action={selectTenantAction}>
            <input type="hidden" name="tenantId" value={tenantId} />
          </form>
          Selecionando sua organização automaticamente.
        </CardContent>
      </Card>
    </div>
  );
}

