import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { publicDashboardLinks } from "@/db/schema";
import { requireTenantRole } from "@/lib/api-rbac";

export async function GET(request: NextRequest) {
  const ctx = await requireTenantRole(request, "admin");
  if (ctx instanceof NextResponse) return ctx;

  const now = new Date();
  const rows = await db
    .select()
    .from(publicDashboardLinks)
    .where(eq(publicDashboardLinks.tenant_id, ctx.tenantId))
    .orderBy(publicDashboardLinks.created_at);

  return NextResponse.json({
    items: rows.map((r) => ({
      id: r.id,
      created_at: r.created_at,
      expires_at: r.expires_at,
      revoked_at: r.revoked_at,
      status:
        r.revoked_at
          ? "revoked"
          : r.expires_at && r.expires_at <= now
            ? "expired"
            : "active",
    })),
  });
}
