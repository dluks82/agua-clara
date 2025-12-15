import { NextRequest, NextResponse } from "next/server";
import path from "node:path";

import { migrate } from "drizzle-orm/postgres-js/migrator";

import { db } from "@/db";
import { baselineMigrations, getMigrationStatus } from "@/lib/migrations";

function requireMigrationsAuth(request: NextRequest) {
  const token = process.env.MIGRATIONS_TOKEN;
  if (!token) {
    return { ok: false as const, status: 500, message: "MIGRATIONS_TOKEN não configurado no ambiente." };
  }

  const auth = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${token}`;
  if (auth !== expected) {
    return { ok: false as const, status: 401, message: "Não autorizado." };
  }

  return { ok: true as const };
}

export async function GET(request: NextRequest) {
  const auth = requireMigrationsAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const status = await getMigrationStatus();
  return NextResponse.json(status);
}

export async function POST(request: NextRequest) {
  const auth = requireMigrationsAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const body = await request.json().catch(() => ({}));
  const mode = typeof body?.mode === "string" ? body.mode : "apply";

  if (mode === "baseline") {
    const status = await baselineMigrations();
    return NextResponse.json({ baselined: true, ...status });
  }

  const migrationsFolder = path.join(process.cwd(), "drizzle");
  await migrate(db, { migrationsFolder });

  const status = await getMigrationStatus();
  return NextResponse.json({ applied: true, ...status });
}
