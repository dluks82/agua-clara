import { pgTable, serial, timestamp, numeric, text, jsonb, primaryKey, uniqueIndex, index } from "drizzle-orm/pg-core";

export const tenants = pgTable("tenants", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  image: text("image"),
  google_sub: text("google_sub").unique(),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const memberships = pgTable(
  "memberships",
  {
    user_id: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tenant_id: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    role: text("role").notNull(), // owner | admin | operator | viewer
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.user_id, t.tenant_id] }),
  })
);

export const readings = pgTable(
  "readings",
  {
    id: serial("id").primaryKey(),
    tenant_id: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
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
  },
  (t) => ({
    tenantTsIdx: index("readings_tenant_ts_idx").on(t.tenant_id, t.ts),
  })
);

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  tenant_id: text("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  key: text("key").notNull(),
  value: text("value").notNull(),
}, (t) => ({
  tenantKeyUnique: uniqueIndex("settings_tenant_key_unique").on(t.tenant_id, t.key),
}));

export const events = pgTable(
  "events",
  {
    id: serial("id").primaryKey(),
    tenant_id: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    ts: timestamp("ts", { withTimezone: true }).notNull(),
    type: text("type").notNull(),
    payload: jsonb("payload"),
  },
  (t) => ({
    tenantTsIdx: index("events_tenant_ts_idx").on(t.tenant_id, t.ts),
  })
);

export const publicDashboardLinks = pgTable(
  "public_dashboard_links",
  {
    id: text("id").primaryKey(),
    tenant_id: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    token_hash: text("token_hash").notNull().unique(),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expires_at: timestamp("expires_at", { withTimezone: true }).notNull(),
    revoked_at: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => ({
    tenantIdx: index("public_dashboard_links_tenant_idx").on(t.tenant_id),
  })
);

export type Reading = typeof readings.$inferSelect;
export type NewReading = typeof readings.$inferInsert;
export type Setting = typeof settings.$inferSelect;
export type NewSetting = typeof settings.$inferInsert;
export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Membership = typeof memberships.$inferSelect;
export type NewMembership = typeof memberships.$inferInsert;
export type PublicDashboardLink = typeof publicDashboardLinks.$inferSelect;
export type NewPublicDashboardLink = typeof publicDashboardLinks.$inferInsert;
