import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listMemberships, requireUserId } from "@/lib/tenancy";
import { createTenant, selectTenant } from "./actions";
import { AutoSelectTenant } from "./select-tenant-client";

export default async function SelectTenantPage() {
  const userId = await requireUserId();
  const memberships = await listMemberships(userId);

  if (memberships.length === 1) {
    return <AutoSelectTenant tenantId={memberships[0].tenantId} selectTenantAction={selectTenant} />;
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Escolha uma organização</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {memberships.length === 0 && (
            <div className="text-sm text-muted-foreground">
              Você ainda não pertence a nenhuma organização. Crie uma abaixo.
            </div>
          )}

          {memberships.map((m) => (
            <form key={m.tenantId} action={selectTenant} className="flex items-center justify-between gap-3">
              <input type="hidden" name="tenantId" value={m.tenantId} />
              <div>
                <div className="font-medium">{m.tenantName}</div>
                <div className="text-xs text-muted-foreground">
                  <code>{m.tenantSlug}</code> · <code>{m.role}</code>
                </div>
              </div>
              <Button type="submit">Entrar</Button>
            </form>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Criar organização</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createTenant} className="flex gap-2">
            <Input name="name" placeholder="Nome" />
            <Button type="submit">Criar</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
