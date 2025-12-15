import path from "node:path";
import fs from "node:fs";

import { config as loadEnv } from "dotenv";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { readMigrationFiles } from "drizzle-orm/migrator";

loadEnv({ path: ".env.local" });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("Missing DATABASE_URL.");
  process.exit(1);
}

const migrationsFolder = path.join(process.cwd(), "drizzle");
const journalPath = path.join(migrationsFolder, "meta", "_journal.json");
if (!fs.existsSync(journalPath)) {
  console.error(`Missing ${journalPath}`);
  process.exit(1);
}

const sql = postgres(databaseUrl, { max: 1 });
const db = drizzle(sql);

await db.$client`CREATE SCHEMA IF NOT EXISTS drizzle`;
await db.$client`
  CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
    id SERIAL PRIMARY KEY,
    hash text NOT NULL,
    created_at bigint
  )
`;

const existing = await db.$client`
  select created_at
  from drizzle.__drizzle_migrations
`;
const existingMillis = new Set(existing.map((row) => Number(row.created_at)));

const metas = readMigrationFiles({ migrationsFolder });
let inserted = 0;
for (const meta of metas) {
  if (existingMillis.has(meta.folderMillis)) continue;
  await db.$client`
    insert into drizzle.__drizzle_migrations ("hash", "created_at")
    values (${meta.hash}, ${meta.folderMillis})
  `;
  inserted++;
}

await sql.end({ timeout: 5 });
console.log(`Baselined ${inserted} migration(s).`);
