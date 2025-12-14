import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { env } from "@/lib/env";

const sql = postgres(env.DATABASE_URL);
export const db = drizzle(sql, { schema });
