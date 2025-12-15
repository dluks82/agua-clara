import path from "node:path";

import { config as loadEnv } from "dotenv";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

loadEnv({ path: ".env.local" });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("Missing DATABASE_URL.");
  process.exit(1);
}

const sql = postgres(databaseUrl, { max: 1 });
const db = drizzle(sql);

const migrationsFolder = path.join(process.cwd(), "drizzle");
await migrate(db, { migrationsFolder });

await sql.end({ timeout: 5 });
console.log("Migrations applied.");

