import "server-only";

import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { db } from "@/db";
import { memberships, tenants } from "@/db/schema";
import type { Role } from "@/lib/rbac";
import { hasRole } from "@/lib/rbac";

export const ACTIVE_TENANT_COOKIE = "ac_tenant";

export type TenantMembership = {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  role: Role;
};

export async function requireUserId(): Promise<string> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");
  return userId;
}

export async function listMemberships(userId: string): Promise<TenantMembership[]> {
  const rows = await db
    .select({
      tenantId: memberships.tenant_id,
      role: memberships.role,
      tenantName: tenants.name,
      tenantSlug: tenants.slug,
    })
    .from(memberships)
    .innerJoin(tenants, eq(tenants.id, memberships.tenant_id))
    .where(eq(memberships.user_id, userId))
    .orderBy(tenants.name);

  return rows.map((row) => ({
    tenantId: row.tenantId,
    tenantName: row.tenantName,
    tenantSlug: row.tenantSlug,
    role: row.role as Role,
  }));
}

export async function requireTenant(requiredRole: Role = "viewer") {
  const userId = await requireUserId();
  const cookieStore = await cookies();
  const activeTenantId = cookieStore.get(ACTIVE_TENANT_COOKIE)?.value;
  if (!activeTenantId) redirect("/select-tenant");

  const membership = await db.query.memberships.findFirst({
    where: and(eq(memberships.user_id, userId), eq(memberships.tenant_id, activeTenantId)),
  });

  if (!membership) redirect("/select-tenant");
  const role = membership.role as Role;
  if (!hasRole(role, requiredRole)) redirect("/dashboard");

  return { userId, tenantId: activeTenantId, role };
}

export async function assertTenant(requiredRole: Role = "viewer") {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Não autenticado");

  const cookieStore = await cookies();
  const activeTenantId = cookieStore.get(ACTIVE_TENANT_COOKIE)?.value;
  if (!activeTenantId) throw new Error("Tenant não selecionado");

  const membership = await db.query.memberships.findFirst({
    where: and(eq(memberships.user_id, userId), eq(memberships.tenant_id, activeTenantId)),
  });
  if (!membership) throw new Error("Acesso ao tenant negado");

  const role = membership.role as Role;
  if (!hasRole(role, requiredRole)) throw new Error("Permissão insuficiente");

  return { userId, tenantId: activeTenantId, role };
}
