import path from "node:path";
import fs from "node:fs";

import { config as loadEnv } from "dotenv";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

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

const journal = JSON.parse(fs.readFileSync(journalPath, "utf8"));
const entries = Array.isArray(journal?.entries) ? journal.entries : [];

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

const rows = await db.$client`
  select created_at
  from drizzle.__drizzle_migrations
  order by created_at desc
  limit 1
`;

const lastAppliedMillis = rows.length ? Number(rows[0].created_at) : null;
const pending = lastAppliedMillis === null ? entries : entries.filter((e) => e.when > lastAppliedMillis);

await sql.end({ timeout: 5 });

console.log({
  lastAppliedMillis,
  pendingCount: pending.length,
  pendingTags: pending.map((e) => e.tag),
});
