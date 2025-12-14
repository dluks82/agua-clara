"use server";

import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { memberships, tenants } from "@/db/schema";
import { slugify } from "@/lib/slug";
import { ACTIVE_TENANT_COOKIE, requireUserId } from "@/lib/tenancy";

export async function selectTenant(formData: FormData) {
  const tenantId = String(formData.get("tenantId") ?? "");
  const userId = await requireUserId();

  const membership = await db.query.memberships.findFirst({
    where: and(eq(memberships.user_id, userId), eq(memberships.tenant_id, tenantId)),
  });
  if (!membership) redirect("/select-tenant");

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_TENANT_COOKIE, tenantId, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
  });

  redirect("/dashboard");
}

export async function createTenant(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect("/select-tenant");

  const userId = await requireUserId();

  const baseSlug = slugify(name);
  const slug = baseSlug.length > 0 ? baseSlug : `tenant-${crypto.randomUUID().slice(0, 8)}`;

  const tenantId = crypto.randomUUID();
  await db.insert(tenants).values({
    id: tenantId,
    name,
    slug,
  });

  await db.insert(memberships).values({
    user_id: userId,
    tenant_id: tenantId,
    role: "owner",
  });

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_TENANT_COOKIE, tenantId, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
  });

  redirect("/dashboard");
}
