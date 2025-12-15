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
const UNAVAILABLE_PATH = "/indisponivel";

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
  let rows: Array<{
    tenantId: string;
    role: string;
    tenantName: string;
    tenantSlug: string;
  }>;
  try {
    rows = await db
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
  } catch {
    redirect(UNAVAILABLE_PATH);
  }

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

  let membership: typeof memberships.$inferSelect | null = null;
  try {
    membership =
      (await db.query.memberships.findFirst({
        where: and(eq(memberships.user_id, userId), eq(memberships.tenant_id, activeTenantId)),
      })) ?? null;
  } catch {
    redirect(UNAVAILABLE_PATH);
  }

  if (!membership) redirect("/select-tenant");
  const role = membership.role as Role;
  if (!hasRole(role, requiredRole)) redirect("/dashboard");

  return { userId, tenantId: activeTenantId, role };
}

export async function assertTenant(requiredRole: Role = "viewer") {
  return requireTenant(requiredRole);
}
