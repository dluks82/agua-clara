import { pgTable, serial, timestamp, numeric, text, jsonb } from "drizzle-orm/pg-core";

export const readings = pgTable("readings", {
  id: serial("id").primaryKey(),
  ts: timestamp("ts", { withTimezone: true }).notNull(),
  hydrometer_m3: numeric("hydrometer_m3", { precision: 10, scale: 3 }).notNull(),
  horimeter_h: numeric("horimeter_h", { precision: 10, scale: 3 }).notNull(),
  notes: text("notes"),
  hydrometer_status: text("hydrometer_status").default("regular").notNull(),
  horimeter_status: text("horimeter_status").default("regular").notNull(),
  hydrometer_final_old: numeric("hydrometer_final_old", { precision: 10, scale: 3 }),
  hydrometer_initial_new: numeric("hydrometer_initial_new", { precision: 10, scale: 3 }),
  horimeter_final_old: numeric("horimeter_final_old", { precision: 10, scale: 3 }),
  horimeter_initial_new: numeric("horimeter_initial_new", { precision: 10, scale: 3 }),
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
});

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  ts: timestamp("ts", { withTimezone: true }).notNull(),
  type: text("type").notNull(),
  payload: jsonb("payload"),
});

export type Reading = typeof readings.$inferSelect;
export type NewReading = typeof readings.$inferInsert;
export type Setting = typeof settings.$inferSelect;
export type NewSetting = typeof settings.$inferInsert;
export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
