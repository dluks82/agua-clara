import { NextRequest, NextResponse } from "next/server";
import { addDays } from "date-fns";
import crypto from "node:crypto";

import { db } from "@/db";
import { publicDashboardLinks } from "@/db/schema";
import { requireTenantRole } from "@/lib/api-rbac";
import { encryptPublicToken, generatePublicToken, hashPublicToken } from "@/lib/public-dashboard";

export async function POST(request: NextRequest) {
  const ctx = await requireTenantRole(request, "admin");
  if (ctx instanceof NextResponse) return ctx;

  const token = generatePublicToken();
  const tokenHash = hashPublicToken(token);
  const id = cryptoRandomId();

  const expiresAt = addDays(new Date(), 30);

  await db.insert(publicDashboardLinks).values({
    id,
    tenant_id: ctx.tenantId,
    token_hash: tokenHash,
    token_enc: encryptPublicToken(token),
    expires_at: expiresAt,
  });

  const baseUrl = request.nextUrl.origin;
  const url = new URL("/public/dashboard", baseUrl);
  url.searchParams.set("token", token);

  return NextResponse.json({
    id,
    expires_at: expiresAt,
    url: url.toString(),
  });
}

function cryptoRandomId() {
  return crypto.randomUUID();
}
