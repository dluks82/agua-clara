"use server";

import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function updateBillingCycleDay(day: number) {
  if (day < 1 || day > 31) {
    throw new Error("Dia inválido");
  }

  const existing = await db.query.settings.findFirst({
    where: eq(settings.key, "billing_cycle_day"),
  });

  if (existing) {
    await db
      .update(settings)
      .set({ value: day.toString() })
      .where(eq(settings.key, "billing_cycle_day"));
  } else {
    await db.insert(settings).values({
      key: "billing_cycle_day",
      value: day.toString(),
    });
  }

  revalidatePath("/dashboard");
}

export async function getBillingCycleDay(): Promise<number> {
  const setting = await db.query.settings.findFirst({
    where: eq(settings.key, "billing_cycle_day"),
  });

  return setting ? parseInt(setting.value) : 1; // Default to day 1
}
