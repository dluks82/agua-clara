import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/submit-button";
import { listMemberships, requireUserId } from "@/lib/tenancy";
import { createTenant, selectTenant } from "./actions";
import { AutoSelectTenant } from "./select-tenant-client";
import { Building2, LogIn } from "lucide-react";

export default async function SelectTenantPage({
  searchParams,
}: {
  searchParams: Promise<{ force?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const force = resolvedSearchParams.force === "1";

  const userId = await requireUserId();
  const memberships = await listMemberships(userId);

  if (!force && memberships.length === 1) {
    return <AutoSelectTenant tenantId={memberships[0].tenantId} selectTenantAction={selectTenant} />;
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-6">
      {memberships.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Criar sua primeira organização
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Uma organização (tenant) separa os dados e permissões. Você será <code>owner</code> dessa organização e
              poderá convidar outras pessoas depois.
            </div>
            <form action={createTenant} className="flex flex-col gap-2 sm:flex-row">
              <Input name="name" placeholder="Nome da organização" required />
              <SubmitButton type="submit" label="Criar" pendingLabel="Criando..." />
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Escolha uma organização</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {memberships.length === 0 ? (
            <div className="text-sm text-muted-foreground">Nenhuma organização disponível.</div>
          ) : null}

          {memberships.map((m) => (
            <form key={m.tenantId} action={selectTenant} className="flex items-center justify-between gap-3">
              <input type="hidden" name="tenantId" value={m.tenantId} />
              <div>
                <div className="font-medium">{m.tenantName}</div>
                <div className="text-xs text-muted-foreground">
                  <code>{m.tenantSlug}</code> · <code>{m.role}</code>
                </div>
              </div>
              <SubmitButton
                type="submit"
                variant="outline"
                icon={<LogIn className="h-4 w-4" />}
                label="Entrar"
                pendingLabel="Entrando..."
              />
            </form>
          ))}
        </CardContent>
      </Card>

      {memberships.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Criar organização</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createTenant} className="flex flex-col gap-2 sm:flex-row">
              <Input name="name" placeholder="Nome da organização" required />
              <SubmitButton type="submit" label="Criar" pendingLabel="Criando..." />
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
