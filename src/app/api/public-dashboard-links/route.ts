import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { publicDashboardLinks } from "@/db/schema";
import { requireTenantRole } from "@/lib/api-rbac";
import { decryptPublicToken } from "@/lib/public-dashboard";

export async function GET(request: NextRequest) {
  const ctx = await requireTenantRole(request, "admin");
  if (ctx instanceof NextResponse) return ctx;

  const now = new Date();
  const rows = await db
    .select()
    .from(publicDashboardLinks)
    .where(eq(publicDashboardLinks.tenant_id, ctx.tenantId))
    .orderBy(publicDashboardLinks.created_at);

  const baseUrl = request.nextUrl.origin;

  return NextResponse.json({
    items: rows.map((r) => ({
      id: r.id,
      created_at: r.created_at,
      expires_at: r.expires_at,
      revoked_at: r.revoked_at,
      url:
        !r.revoked_at && r.expires_at > now && r.token_enc
          ? (() => {
              const token = decryptPublicToken(r.token_enc);
              if (!token) return null;
              const url = new URL("/public/dashboard", baseUrl);
              url.searchParams.set("token", token);
              return url.toString();
            })()
          : null,
      status:
        r.revoked_at
          ? "revoked"
          : r.expires_at && r.expires_at <= now
            ? "expired"
            : "active",
    })),
  });
}
