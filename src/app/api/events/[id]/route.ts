import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireTenantRole } from "@/lib/api-rbac";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireTenantRole(request, "operator");
  if (ctx instanceof NextResponse) return ctx;

  try {
    const { id } = await params;
    const eventId = parseInt(id);
    
    if (isNaN(eventId)) {
      return NextResponse.json(
        { error: "ID inválido" },
        { status: 400 }
      );
    }

    // Verificar se o evento existe
    const existingEvent = await db
      .select()
      .from(events)
      .where(and(eq(events.id, eventId), eq(events.tenant_id, ctx.tenantId)))
      .limit(1);

    if (existingEvent.length === 0) {
      return NextResponse.json(
        { error: "Evento não encontrado" },
        { status: 404 }
      );
    }

    // Excluir o evento
    await db
      .delete(events)
      .where(and(eq(events.id, eventId), eq(events.tenant_id, ctx.tenantId)));

    return NextResponse.json(
      { message: "Evento excluído com sucesso" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Erro ao excluir evento:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
