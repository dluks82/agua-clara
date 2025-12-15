import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { publicDashboardLinks } from "@/db/schema";
import { requireTenantRole } from "@/lib/api-rbac";

export async function POST(request: NextRequest) {
  const ctx = await requireTenantRole(request, "admin");
  if (ctx instanceof NextResponse) return ctx;

  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : null;
  if (!id) return NextResponse.json({ error: "id inválido" }, { status: 400 });

  await db
    .update(publicDashboardLinks)
    .set({ revoked_at: new Date() })
    .where(and(eq(publicDashboardLinks.id, id), eq(publicDashboardLinks.tenant_id, ctx.tenantId)));

  return NextResponse.json({ ok: true });
}

