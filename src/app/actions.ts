"use server";

import { db } from "@/db";
import { settings } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { assertTenant } from "@/lib/tenancy";

export async function updateBillingCycleDay(day: number) {
  const { tenantId } = await assertTenant("admin");
  if (day < 1 || day > 31) {
    throw new Error("Dia inválido");
  }

  const existing = await db.query.settings.findFirst({
    where: and(eq(settings.tenant_id, tenantId), eq(settings.key, "billing_cycle_day")),
  });

  if (existing) {
    await db
      .update(settings)
      .set({ value: day.toString() })
      .where(and(eq(settings.tenant_id, tenantId), eq(settings.key, "billing_cycle_day")));
  } else {
    await db.insert(settings).values({
      tenant_id: tenantId,
      key: "billing_cycle_day",
      value: day.toString(),
    });
  }

  revalidatePath("/dashboard");
}

export async function getBillingCycleDay(): Promise<number> {
  const { tenantId } = await assertTenant("viewer");
  const setting = await db.query.settings.findFirst({
    where: and(eq(settings.tenant_id, tenantId), eq(settings.key, "billing_cycle_day")),
  });

  return setting ? parseInt(setting.value) : 1; // Default to day 1
}
