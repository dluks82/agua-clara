import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireTenantRole } from "@/lib/api-rbac";
import { revalidatePath, revalidateTag } from "next/cache";

export async function GET(request: NextRequest) {
  const ctx = await requireTenantRole(request, "viewer");
  if (ctx instanceof NextResponse) return ctx;

  try {
    const allSettings = await db
      .select()
      .from(settings)
      .where(eq(settings.tenant_id, ctx.tenantId));
    
    // Converter array para objeto
    const settingsObject = allSettings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {} as Record<string, string>);
    
    return NextResponse.json(settingsObject);
  } catch (error) {
    console.error("Erro ao buscar configurações:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const ctx = await requireTenantRole(request, "admin");
  if (ctx instanceof NextResponse) return ctx;

  try {
    const body = await request.json();
    const { key, value } = body;
    
    if (!key || value === undefined) {
      return NextResponse.json(
        { error: "Chave e valor são obrigatórios" },
        { status: 400 }
      );
    }
    
    // Verificar se já existe
    const existing = await db
      .select()
      .from(settings)
      .where(and(eq(settings.tenant_id, ctx.tenantId), eq(settings.key, key)))
      .limit(1);
    
    if (existing.length > 0) {
      // Atualizar existente
      await db
        .update(settings)
        .set({ value })
        .where(and(eq(settings.tenant_id, ctx.tenantId), eq(settings.key, key)));
    } else {
      // Criar novo
      await db.insert(settings).values({ tenant_id: ctx.tenantId, key, value });
    }

    revalidateTag(`dashboard:${ctx.tenantId}`);
    
    return NextResponse.json({ message: "Configuração salva com sucesso" });
  } catch (error) {
    console.error("Erro ao salvar configuração:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const ctx = await requireTenantRole(request, "admin");
  if (ctx instanceof NextResponse) return ctx;

  try {
    const body = await request.json();
    const settingsToUpdate = body;
    
    if (!settingsToUpdate || typeof settingsToUpdate !== 'object') {
      return NextResponse.json(
        { error: "Dados de configuração inválidos" },
        { status: 400 }
      );
    }
    
    // Atualizar múltiplas configurações
    const promises = Object.entries(settingsToUpdate).map(async ([key, value]) => {
      const existing = await db
        .select()
        .from(settings)
        .where(and(eq(settings.tenant_id, ctx.tenantId), eq(settings.key, key)))
        .limit(1);
      
      if (existing.length > 0) {
        return db
          .update(settings)
          .set({ value: String(value) })
          .where(and(eq(settings.tenant_id, ctx.tenantId), eq(settings.key, key)));
      } else {
        return db.insert(settings).values({ tenant_id: ctx.tenantId, key, value: String(value) });
      }
    });
    
    await Promise.all(promises);

    revalidatePath("/dashboard");
    revalidatePath("/configuracoes");
    revalidateTag(`dashboard:${ctx.tenantId}`);
    
    return NextResponse.json({ message: "Configurações atualizadas com sucesso" });
  } catch (error) {
    console.error("Erro ao atualizar configurações:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
