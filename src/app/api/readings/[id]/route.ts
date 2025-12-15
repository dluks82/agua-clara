import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { readings } from "@/db/schema";
import { createReadingSchema } from "@/lib/validations/readings";
import { eq, desc, and, ne } from "drizzle-orm";
import { requireTenantRole } from "@/lib/api-rbac";
import { revalidateTag } from "next/cache";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireTenantRole(request, "operator");
  if (ctx instanceof NextResponse) return ctx;

  try {
    const { id } = await params;
    const readingId = parseInt(id);
    
    if (isNaN(readingId)) {
      return NextResponse.json(
        { error: "ID inválido" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = createReadingSchema.parse(body);

    // Verificar se a leitura existe
    const existingReading = await db
      .select()
      .from(readings)
      .where(and(eq(readings.id, readingId), eq(readings.tenant_id, ctx.tenantId)))
      .limit(1);

    if (existingReading.length === 0) {
      return NextResponse.json(
        { error: "Leitura não encontrada" },
        { status: 404 }
      );
    }

    // Verificar monotonicidade com outras leituras (excluindo a atual)
    const otherReadings = await db
      .select()
      .from(readings)
      .where(and(ne(readings.id, readingId), eq(readings.tenant_id, ctx.tenantId)))
      .orderBy(desc(readings.ts));

    // Verificar se timestamp não conflita com outras leituras
    for (const reading of otherReadings) {
      if (new Date(validatedData.ts).getTime() === reading.ts.getTime()) {
        return NextResponse.json(
          { error: "Já existe uma leitura com este timestamp" },
          { status: 400 }
        );
      }
    }

    // Verificar monotonicidade do hidrômetro
    const readingsBefore = otherReadings.filter(r => r.ts < new Date(validatedData.ts));
    const readingsAfter = otherReadings.filter(r => r.ts > new Date(validatedData.ts));

    // Verificar se hidrômetro não regrediu em relação às leituras anteriores
    if (readingsBefore.length > 0) {
      const lastBefore = readingsBefore[0];
      if (validatedData.hydrometer_m3 < parseFloat(lastBefore.hydrometer_m3)) {
        return NextResponse.json(
          { error: "Hidrômetro regrediu em relação às leituras anteriores" },
          { status: 400 }
        );
      }
    }

    // Verificar se hidrômetro não regrediu em relação às leituras posteriores
    if (readingsAfter.length > 0) {
      const firstAfter = readingsAfter[readingsAfter.length - 1];
      if (validatedData.hydrometer_m3 > parseFloat(firstAfter.hydrometer_m3)) {
        return NextResponse.json(
          { error: "Hidrômetro regrediu em relação às leituras posteriores" },
          { status: 400 }
        );
      }
    }

    // Verificar monotonicidade do horímetro
    if (readingsBefore.length > 0) {
      const lastBefore = readingsBefore[0];
      if (validatedData.horimeter_h < parseFloat(lastBefore.horimeter_h)) {
        return NextResponse.json(
          { error: "Horímetro regrediu em relação às leituras anteriores" },
          { status: 400 }
        );
      }
    }

    if (readingsAfter.length > 0) {
      const firstAfter = readingsAfter[readingsAfter.length - 1];
      if (validatedData.horimeter_h > parseFloat(firstAfter.horimeter_h)) {
        return NextResponse.json(
          { error: "Horímetro regrediu em relação às leituras posteriores" },
          { status: 400 }
        );
      }
    }

    // Atualizar a leitura
    const updatedReading = await db
      .update(readings)
      .set({
        ts: new Date(validatedData.ts),
        hydrometer_m3: validatedData.hydrometer_m3.toString(),
        horimeter_h: validatedData.horimeter_h.toString(),
        notes: validatedData.notes,
      })
      .where(and(eq(readings.id, readingId), eq(readings.tenant_id, ctx.tenantId)))
      .returning();

    revalidateTag(`dashboard:${ctx.tenantId}`);

    return NextResponse.json(
      { message: "Leitura atualizada com sucesso", reading: updatedReading[0] },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Erro ao atualizar leitura:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireTenantRole(request, "operator");
  if (ctx instanceof NextResponse) return ctx;

  try {
    const { id } = await params;
    const readingId = parseInt(id);
    
    if (isNaN(readingId)) {
      return NextResponse.json(
        { error: "ID inválido" },
        { status: 400 }
      );
    }

    // Verificar se a leitura existe
    const existingReading = await db
      .select()
      .from(readings)
      .where(and(eq(readings.id, readingId), eq(readings.tenant_id, ctx.tenantId)))
      .limit(1);

    if (existingReading.length === 0) {
      return NextResponse.json(
        { error: "Leitura não encontrada" },
        { status: 404 }
      );
    }

    // Excluir a leitura
    await db
      .delete(readings)
      .where(and(eq(readings.id, readingId), eq(readings.tenant_id, ctx.tenantId)));

    revalidateTag(`dashboard:${ctx.tenantId}`);

    return NextResponse.json(
      { message: "Leitura excluída com sucesso" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Erro ao excluir leitura:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
