import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { readings, settings } from "@/db/schema";
import { getIntervalsSchema } from "@/lib/validations/intervals";
import { calculateIntervals, calculateKPIs } from "@/lib/calculations";
import { detectAlerts, calculateBaseline } from "@/lib/alerts";
import { desc, and, gte, lte, eq } from "drizzle-orm";
import { requireTenantRole } from "@/lib/api-rbac";

export async function GET(request: NextRequest) {
  const ctx = await requireTenantRole(request, "viewer");
  if (ctx instanceof NextResponse) return ctx;

  try {
    const { searchParams } = new URL(request.url);
    const validatedParams = getIntervalsSchema.parse({
      from: searchParams.get("from"),
      to: searchParams.get("to"),
    });
    
    const whereConditions = [eq(readings.tenant_id, ctx.tenantId)];
    
    if (validatedParams.from) {
      whereConditions.push(gte(readings.ts, new Date(validatedParams.from)));
    }
    
    if (validatedParams.to) {
      whereConditions.push(lte(readings.ts, new Date(validatedParams.to)));
    }
    
    const readingsData = await db
      .select()
      .from(readings)
      .where(and(...whereConditions))
      .orderBy(desc(readings.ts));
    
    // Buscar configurações
    const settingsData = await db
      .select()
      .from(settings)
      .where(eq(settings.tenant_id, ctx.tenantId));
    const settingsObject = settingsData.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {} as Record<string, string>);
    
    const intervals = calculateIntervals(readingsData);
    const kpis = calculateKPIs(intervals);
    const baselineAsOf = validatedParams.to ? new Date(validatedParams.to) : new Date();
    const baseline = calculateBaseline(intervals, 7, settingsObject, baselineAsOf);
    const alerts = detectAlerts(intervals, baseline || undefined, settingsObject);
    
    return NextResponse.json({
      intervals,
      kpis,
      alerts,
      baseline,
    });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
