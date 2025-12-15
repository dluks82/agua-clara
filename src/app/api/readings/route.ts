import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { readings } from "@/db/schema";
import { createReadingSchema, getReadingsSchema } from "@/lib/validations/readings";
import { desc, and, gte, lte, eq, sql } from "drizzle-orm";
import { requireTenantRole } from "@/lib/api-rbac";

export async function POST(request: NextRequest) {
  const ctx = await requireTenantRole(request, "operator");
  if (ctx instanceof NextResponse) return ctx;

  try {
    const body = await request.json();
    const validatedData = createReadingSchema.parse(body);
    
    // Verificar monotonicidade
    const lastReading = await db
      .select()
      .from(readings)
      .where(eq(readings.tenant_id, ctx.tenantId))
      .orderBy(desc(readings.ts))
      .limit(1);
    
    if (lastReading.length > 0) {
      const last = lastReading[0];
      
      // Verificar se timestamp é maior que a última leitura
      if (new Date(validatedData.ts) <= last.ts) {
        return NextResponse.json(
          { error: "Timestamp deve ser maior que a última leitura" },
          { status: 400 }
        );
      }
      
      // Verificar se hidrômetro não regrediu (apenas para leitura regular)
      if (validatedData.hydrometer_status === "regular" && validatedData.hydrometer_m3 < parseFloat(last.hydrometer_m3)) {
        return NextResponse.json(
          { error: "Hidrômetro regrediu: verifique a digitação ou altere o tipo para 'Virada' ou 'Troca'" },
          { status: 400 }
        );
      }
      
      // Verificar se horímetro não regrediu (apenas para leitura regular)
      if (validatedData.horimeter_status === "regular" && validatedData.horimeter_h < parseFloat(last.horimeter_h)) {
        return NextResponse.json(
          { error: "Horímetro regrediu: verifique a digitação ou altere o tipo para 'Virada' ou 'Troca'" },
          { status: 400 }
        );
      }
    }
    
    const newReading = await db
      .insert(readings)
      .values({
        tenant_id: ctx.tenantId,
        ts: new Date(validatedData.ts),
        hydrometer_m3: validatedData.hydrometer_m3.toString(),
        horimeter_h: validatedData.horimeter_h.toString(),
        notes: validatedData.notes,
        hydrometer_status: validatedData.hydrometer_status,
        horimeter_status: validatedData.horimeter_status,
        hydrometer_final_old: validatedData.hydrometer_final_old?.toString(),
        hydrometer_initial_new: validatedData.hydrometer_initial_new?.toString(),
        horimeter_final_old: validatedData.horimeter_final_old?.toString(),
        horimeter_initial_new: validatedData.horimeter_initial_new?.toString(),
      })
      .returning();
    
    return NextResponse.json({ id: newReading[0].id }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const ctx = await requireTenantRole(request, "viewer");
  if (ctx instanceof NextResponse) return ctx;

  try {
    const { searchParams } = new URL(request.url);
    const validatedParams = getReadingsSchema.parse({
      from: searchParams.get("from"),
      to: searchParams.get("to"),
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
    });
    
    const offset = (validatedParams.page - 1) * validatedParams.limit;
    
    const whereConditions = [eq(readings.tenant_id, ctx.tenantId)];
    
    if (validatedParams.from) {
      whereConditions.push(gte(readings.ts, new Date(validatedParams.from)));
    }
    
    if (validatedParams.to) {
      whereConditions.push(lte(readings.ts, new Date(validatedParams.to)));
    }
    
    const [items, totalRows] = await Promise.all([
      db
        .select()
        .from(readings)
        .where(and(...whereConditions))
        .orderBy(desc(readings.ts))
        .limit(validatedParams.limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(readings)
        .where(and(...whereConditions))
    ]);
    
    return NextResponse.json({
      items,
      page: validatedParams.page,
      total: Number(totalRows[0]?.count ?? 0),
    });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
