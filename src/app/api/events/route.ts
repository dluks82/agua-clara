import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events } from "@/db/schema";
import { desc, and, gte, lte, eq } from "drizzle-orm";
import { requireTenantRole } from "@/lib/api-rbac";

function normalizeJsonbPayload(payload: unknown): unknown | null {
  if (payload === undefined || payload === null) return null;
  if (typeof payload === "string") {
    try {
      return JSON.parse(payload);
    } catch {
      return payload;
    }
  }
  return payload;
}

export async function GET(request: NextRequest) {
  const ctx = await requireTenantRole(request, "viewer");
  if (ctx instanceof NextResponse) return ctx;

  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const type = searchParams.get("type");
    
    const whereConditions = [eq(events.tenant_id, ctx.tenantId)];
    
    if (from) {
      whereConditions.push(gte(events.ts, new Date(from)));
    }
    
    if (to) {
      whereConditions.push(lte(events.ts, new Date(to)));
    }
    
    if (type) {
      whereConditions.push(eq(events.type, type));
    }
    
    const eventsData = await db
      .select()
      .from(events)
      .where(and(...whereConditions))
      .orderBy(desc(events.ts));

    const normalized = eventsData.map((event) => ({
      ...event,
      payload: normalizeJsonbPayload(event.payload),
    }));

    return NextResponse.json(normalized);
  } catch (error) {
    console.error("Erro ao buscar eventos:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const ctx = await requireTenantRole(request, "operator");
  if (ctx instanceof NextResponse) return ctx;

  try {
    const body = await request.json();
    const { ts, type, payload } = body;
    
    if (!ts || !type) {
      return NextResponse.json(
        { error: "Timestamp e tipo são obrigatórios" },
        { status: 400 }
      );
    }
    
    // Validar tipos de evento permitidos
    const allowedTypes = [
      "troca_hidrometro",
      "troca_horimetro", 
      "manutencao",
      "calibracao",
      "outro"
    ];
    
    if (!allowedTypes.includes(type)) {
      return NextResponse.json(
        { error: "Tipo de evento inválido" },
        { status: 400 }
      );
    }
    
    const newEvent = await db
      .insert(events)
      .values({
        tenant_id: ctx.tenantId,
        ts: new Date(ts),
        type,
        payload: normalizeJsonbPayload(payload),
      })
      .returning();
    
    return NextResponse.json({ id: newEvent[0].id }, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar evento:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const ctx = await requireTenantRole(request, "operator");
  if (ctx instanceof NextResponse) return ctx;

  try {
    const body = await request.json();
    const { id, ts, type, payload } = body;
    
    if (!id || !ts || !type) {
      return NextResponse.json(
        { error: "ID, timestamp e tipo são obrigatórios" },
        { status: 400 }
      );
    }
    
    // Validar tipos de evento permitidos
    const allowedTypes = [
      "troca_hidrometro",
      "troca_horimetro", 
      "manutencao",
      "calibracao",
      "outro"
    ];
    
    if (!allowedTypes.includes(type)) {
      return NextResponse.json(
        { error: "Tipo de evento inválido" },
        { status: 400 }
      );
    }
    
    // Verificar se o evento existe
    const existingEvent = await db
      .select()
      .from(events)
      .where(and(eq(events.id, id), eq(events.tenant_id, ctx.tenantId)))
      .limit(1);
    
    if (existingEvent.length === 0) {
      return NextResponse.json(
        { error: "Evento não encontrado" },
        { status: 404 }
      );
    }
    
    // Atualizar o evento
    const updatedEvent = await db
      .update(events)
      .set({
        ts: new Date(ts),
        type,
        payload: normalizeJsonbPayload(payload),
      })
      .where(and(eq(events.id, id), eq(events.tenant_id, ctx.tenantId)))
      .returning();
    
    return NextResponse.json(
      { message: "Evento atualizado com sucesso", event: updatedEvent[0] },
      { status: 200 }
    );
  } catch (error) {
    console.error("Erro ao atualizar evento:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
