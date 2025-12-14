import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { db } from "@/db";
import { memberships } from "@/db/schema";
import type { Role } from "@/lib/rbac";
import { hasRole } from "@/lib/rbac";

const ACTIVE_TENANT_COOKIE = "ac_tenant";

export async function requireTenantRole(request: NextRequest, requiredRole: Role) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const tenantId = request.cookies.get(ACTIVE_TENANT_COOKIE)?.value;
  if (!tenantId) {
    return NextResponse.json({ error: "Tenant não selecionado" }, { status: 400 });
  }

  const membership = await db.query.memberships.findFirst({
    where: and(eq(memberships.user_id, userId), eq(memberships.tenant_id, tenantId)),
  });
  if (!membership) {
    return NextResponse.json({ error: "Acesso ao tenant negado" }, { status: 403 });
  }

  const role = membership.role as Role;
  if (!hasRole(role, requiredRole)) {
    return NextResponse.json({ error: "Permissão insuficiente" }, { status: 403 });
  }

  return { userId, tenantId, role };
}

