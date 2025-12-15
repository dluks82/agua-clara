"use server";

import crypto from "node:crypto";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/db";
import { memberships, users } from "@/db/schema";
import { assertTenant } from "@/lib/tenancy";

const roleSchema = z.enum(["viewer", "operator", "admin", "owner"]);
const inviteSchema = z.object({
  email: z.string().email(),
  role: roleSchema,
});

function redirectUsuarios(params: { ok?: string; error?: string }) {
  const search = new URLSearchParams();
  if (params.ok) search.set("ok", params.ok);
  if (params.error) search.set("error", params.error);
  const suffix = search.toString();
  redirect(suffix ? `/usuarios?${suffix}` : "/usuarios");
}

async function ensureUserByEmail(email: string) {
  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  if (existing) return existing.id;

  const id = crypto.randomUUID();
  await db.insert(users).values({
    id,
    email,
  });
  return id;
}

export async function inviteMember(formData: FormData) {
  const { tenantId } = await assertTenant("admin");
  const parsed = inviteSchema.safeParse({
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    role: String(formData.get("role") ?? ""),
  });

  if (!parsed.success) redirectUsuarios({ error: "Dados inválidos" });
  const { email, role } = parsed.data;

  const userId = await ensureUserByEmail(email);

  const existing = await db.query.memberships.findFirst({
    where: and(eq(memberships.user_id, userId), eq(memberships.tenant_id, tenantId)),
  });

  if (existing) {
    await db
      .update(memberships)
      .set({ role })
      .where(and(eq(memberships.user_id, userId), eq(memberships.tenant_id, tenantId)));
  } else {
    await db.insert(memberships).values({
      user_id: userId,
      tenant_id: tenantId,
      role,
    });
  }

  revalidatePath("/usuarios");
  redirectUsuarios({ ok: "Membro adicionado/atualizado" });
}

export async function updateMemberRole(formData: FormData) {
  const { tenantId, userId: currentUserId, role: currentRole } = await assertTenant("admin");
  const userId = String(formData.get("userId") ?? "");
  const parsedRole = roleSchema.safeParse(String(formData.get("role") ?? ""));

  if (!userId || !parsedRole.success) redirectUsuarios({ error: "Dados inválidos" });
  if (userId === currentUserId) redirectUsuarios({ error: "Você não pode alterar seu próprio papel" });

  const targetMembership = await db.query.memberships.findFirst({
    where: and(eq(memberships.user_id, userId), eq(memberships.tenant_id, tenantId)),
  });
  if (!targetMembership) redirectUsuarios({ error: "Membro não encontrado" });

  if (targetMembership.role === "owner" && currentRole !== "owner") {
    redirectUsuarios({ error: "Apenas o owner pode alterar outro owner" });
  }

  await db
    .update(memberships)
    .set({ role: parsedRole.data })
    .where(and(eq(memberships.user_id, userId), eq(memberships.tenant_id, tenantId)));

  revalidatePath("/usuarios");
  redirectUsuarios({ ok: "Papel atualizado" });
}

export async function removeMember(formData: FormData) {
  const { tenantId, userId: currentUserId, role: currentRole } = await assertTenant("admin");
  const userId = String(formData.get("userId") ?? "");
  if (!userId) redirectUsuarios({ error: "Dados inválidos" });
  if (userId === currentUserId) redirectUsuarios({ error: "Você não pode remover a si mesmo" });

  const targetMembership = await db.query.memberships.findFirst({
    where: and(eq(memberships.user_id, userId), eq(memberships.tenant_id, tenantId)),
  });
  if (!targetMembership) redirectUsuarios({ error: "Membro não encontrado" });

  if (targetMembership.role === "owner" && currentRole !== "owner") {
    redirectUsuarios({ error: "Apenas o owner pode remover outro owner" });
  }

  await db
    .delete(memberships)
    .where(and(eq(memberships.user_id, userId), eq(memberships.tenant_id, tenantId)));

  revalidatePath("/usuarios");
  redirectUsuarios({ ok: "Membro removido" });
}
