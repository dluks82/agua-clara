import "server-only";

import fs from "node:fs";
import path from "node:path";

import { readMigrationFiles } from "drizzle-orm/migrator";

import { db } from "@/db";

type JournalEntry = {
  idx: number;
  when: number;
  tag: string;
  breakpoints: boolean;
};

function getMigrationsFolder(): string {
  return path.join(process.cwd(), "drizzle");
}

function readJournalEntries(): JournalEntry[] {
  const migrationsFolder = getMigrationsFolder();
  const journalPath = path.join(migrationsFolder, "meta", "_journal.json");
  const raw = fs.readFileSync(journalPath, "utf8");
  const parsed = JSON.parse(raw) as { entries: JournalEntry[] };
  return parsed.entries;
}

async function getLastAppliedMillis(): Promise<number | null> {
  await db.$client`CREATE SCHEMA IF NOT EXISTS drizzle`;
  await db.$client`
    CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `;

  const rows = await db.$client<{ created_at: string }[]>`
    select created_at
    from drizzle.__drizzle_migrations
    order by created_at desc
    limit 1
  `;

  if (rows.length === 0) return null;
  const millis = Number(rows[0].created_at);
  return Number.isFinite(millis) ? millis : null;
}

export async function getMigrationStatus() {
  const migrationsFolder = getMigrationsFolder();
  const journalEntries = readJournalEntries();
  const migrationMetas = readMigrationFiles({ migrationsFolder });
  const lastAppliedMillis = await getLastAppliedMillis();

  const lastAppliedAt = lastAppliedMillis ? new Date(lastAppliedMillis).toISOString() : null;
  const pendingJournalEntries =
    lastAppliedMillis === null
      ? journalEntries
      : journalEntries.filter((entry) => entry.when > lastAppliedMillis);

  return {
    migrationsFolder,
    availableCount: migrationMetas.length,
    lastAppliedMillis,
    lastAppliedAt,
    pendingCount: pendingJournalEntries.length,
    pendingTags: pendingJournalEntries.map((entry) => entry.tag),
  };
}

