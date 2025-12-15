import { eq } from "drizzle-orm";
import { Save, Trash2, UserPlus } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SubmitButton } from "@/components/submit-button";
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
            <SubmitButton
              type="submit"
              icon={<UserPlus className="h-4 w-4" />}
              label="Adicionar"
              pendingLabel="Adicionando..."
            />
          </form>

          <div className="space-y-2 sm:hidden">
            {members.map((m) => (
              <div key={m.userId} className="rounded-md border p-3">
                <div className="text-sm font-medium">{m.email}</div>
                <div className="mt-1 text-xs text-muted-foreground">{m.name ?? "—"}</div>

                <div className="mt-3 grid grid-cols-[1fr_auto_auto] items-stretch gap-2">
                  <form action={updateMemberRole} className="col-span-2 flex items-stretch gap-2">
                    <input type="hidden" name="userId" value={m.userId} />
                    <select
                      name="role"
                      defaultValue={m.role}
                      className="h-9 flex-1 rounded-md border px-2 text-sm"
                      disabled={m.role === "owner" && currentRole !== "owner"}
                    >
                      <option value="viewer">viewer</option>
                      <option value="operator">operator</option>
                      <option value="admin">admin</option>
                      <option value="owner">owner</option>
                    </select>
                    <SubmitButton
                      type="submit"
                      variant="default"
                      size="icon"
                      aria-label="Salvar"
                      title="Salvar"
                      icon={<Save className="h-4 w-4" />}
                      label={<span className="sr-only">Salvar</span>}
                      pendingLabel={<span className="sr-only">Salvando...</span>}
                    />
                  </form>

                  <form action={removeMember} className="flex">
                    <input type="hidden" name="userId" value={m.userId} />
                    <SubmitButton
                      type="submit"
                      variant="destructive"
                      size="icon"
                      aria-label="Remover"
                      title="Remover"
                      disabled={m.role === "owner" && currentRole !== "owner"}
                      icon={<Trash2 className="h-4 w-4" />}
                      label={<span className="sr-only">Remover</span>}
                      pendingLabel={<span className="sr-only">Removendo...</span>}
                    />
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
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.userId} className="border-b">
                    <td className="py-2">{m.email}</td>
                    <td className="py-2">{m.name ?? "—"}</td>
                    <td className="py-2">
                      <div className="flex items-center justify-end gap-2">
                        <form action={updateMemberRole} className="flex items-center gap-2">
                          <input type="hidden" name="userId" value={m.userId} />
                          <select
                            name="role"
                            defaultValue={m.role}
                            className="h-8 w-40 rounded-md border px-2 text-sm"
                            disabled={m.role === "owner" && currentRole !== "owner"}
                          >
                            <option value="viewer">viewer</option>
                            <option value="operator">operator</option>
                            <option value="admin">admin</option>
                            <option value="owner">owner</option>
                          </select>
                          <SubmitButton
                            type="submit"
                            variant="default"
                            size="icon-sm"
                            aria-label="Salvar"
                            title="Salvar"
                            icon={<Save className="h-4 w-4" />}
                            label={<span className="sr-only">Salvar</span>}
                            pendingLabel={<span className="sr-only">Salvando...</span>}
                          />
                        </form>

                        <form action={removeMember}>
                          <input type="hidden" name="userId" value={m.userId} />
                          <SubmitButton
                            type="submit"
                            variant="destructive"
                            size="icon-sm"
                            aria-label="Remover"
                            title="Remover"
                            disabled={m.role === "owner" && currentRole !== "owner"}
                            icon={<Trash2 className="h-4 w-4" />}
                            label={<span className="sr-only">Remover</span>}
                            pendingLabel={<span className="sr-only">Removendo...</span>}
                          />
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
                {members.length === 0 && (
                  <tr>
                    <td className="py-6 text-muted-foreground" colSpan={3}>
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
