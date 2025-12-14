import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const allSettings = await db.select().from(settings);
    
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
      .where(eq(settings.key, key))
      .limit(1);
    
    if (existing.length > 0) {
      // Atualizar existente
      await db
        .update(settings)
        .set({ value })
        .where(eq(settings.key, key));
    } else {
      // Criar novo
      await db.insert(settings).values({ key, value });
    }
    
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
        .where(eq(settings.key, key))
        .limit(1);
      
      if (existing.length > 0) {
        return db
          .update(settings)
          .set({ value: String(value) })
          .where(eq(settings.key, key));
      } else {
        return db.insert(settings).values({ key, value: String(value) });
      }
    });
    
    await Promise.all(promises);
    
    return NextResponse.json({ message: "Configurações atualizadas com sucesso" });
  } catch (error) {
    console.error("Erro ao atualizar configurações:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
