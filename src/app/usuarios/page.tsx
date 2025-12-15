import { eq } from "drizzle-orm";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { db } from "@/db";
import { memberships, users } from "@/db/schema";
import { assertTenant } from "@/lib/tenancy";

import { inviteMember, removeMember, updateMemberRole } from "./actions";

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { tenantId, role: currentRole } = await assertTenant("admin");
  const { ok, error } = await searchParams;

  const members = await db
    .select({
      userId: users.id,
      email: users.email,
      name: users.name,
      role: memberships.role,
    })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.user_id))
    .where(eq(memberships.tenant_id, tenantId))
    .orderBy(users.email);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Usuários</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {ok && <div className="text-sm text-green-700">{ok}</div>}
          {error && <div className="text-sm text-destructive">{error}</div>}

          <form action={inviteMember} className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="text-sm font-medium">Email</label>
              <input
                name="email"
                type="email"
                placeholder="usuario@exemplo.com"
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Papel</label>
              <select
                name="role"
                defaultValue="viewer"
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              >
                <option value="viewer">viewer</option>
                <option value="operator">operator</option>
                <option value="admin">admin</option>
                <option value="owner">owner</option>
              </select>
            </div>
            <Button type="submit">Adicionar</Button>
          </form>

          <div className="space-y-2 sm:hidden">
            {members.map((m) => (
              <div key={m.userId} className="rounded-md border p-3">
                <div className="text-sm font-medium">{m.email}</div>
                <div className="mt-1 text-xs text-muted-foreground">{m.name ?? "—"}</div>

                <div className="mt-3 space-y-2">
                  <form action={updateMemberRole} className="flex items-center gap-2">
                    <input type="hidden" name="userId" value={m.userId} />
                    <select
                      name="role"
                      defaultValue={m.role}
                      className="flex-1 rounded-md border px-2 py-2 text-sm"
                      disabled={m.role === "owner" && currentRole !== "owner"}
                    >
                      <option value="viewer">viewer</option>
                      <option value="operator">operator</option>
                      <option value="admin">admin</option>
                      <option value="owner">owner</option>
                    </select>
                    <Button type="submit" size="sm" variant="outline">
                      Salvar
                    </Button>
                  </form>

                  <form action={removeMember}>
                    <input type="hidden" name="userId" value={m.userId} />
                    <Button
                      type="submit"
                      size="sm"
                      variant="destructive"
                      className="w-full"
                      disabled={m.role === "owner" && currentRole !== "owner"}
                    >
                      Remover
                    </Button>
                  </form>
                </div>
              </div>
            ))}
            {members.length === 0 && (
              <div className="py-6 text-center text-sm text-muted-foreground">Nenhum membro encontrado.</div>
            )}
          </div>

          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2">Email</th>
                  <th className="py-2">Nome</th>
                  <th className="py-2">Papel</th>
                  <th className="py-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.userId} className="border-b">
                    <td className="py-2">{m.email}</td>
                    <td className="py-2">{m.name ?? "—"}</td>
                    <td className="py-2">
                      <form action={updateMemberRole} className="flex items-center gap-2">
                        <input type="hidden" name="userId" value={m.userId} />
                        <select
                          name="role"
                          defaultValue={m.role}
                          className="rounded-md border px-2 py-1 text-sm"
                          disabled={m.role === "owner" && currentRole !== "owner"}
                        >
                          <option value="viewer">viewer</option>
                          <option value="operator">operator</option>
                          <option value="admin">admin</option>
                          <option value="owner">owner</option>
                        </select>
                        <Button type="submit" size="sm" variant="outline">
                          Salvar
                        </Button>
                      </form>
                    </td>
                    <td className="py-2 text-right">
                      <form action={removeMember}>
                        <input type="hidden" name="userId" value={m.userId} />
                        <Button
                          type="submit"
                          size="sm"
                          variant="destructive"
                          disabled={m.role === "owner" && currentRole !== "owner"}
                        >
                          Remover
                        </Button>
                      </form>
                    </td>
                  </tr>
                ))}
                {members.length === 0 && (
                  <tr>
                    <td className="py-6 text-muted-foreground" colSpan={4}>
                      Nenhum membro encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
