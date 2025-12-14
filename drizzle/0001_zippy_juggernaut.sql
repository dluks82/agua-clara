CREATE TABLE "memberships" (
	"user_id" text NOT NULL,
	"tenant_id" text NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "memberships_user_id_tenant_id_pk" PRIMARY KEY("user_id","tenant_id")
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
INSERT INTO "tenants" ("id", "name", "slug") VALUES ('default', 'Default', 'default') ON CONFLICT ("slug") DO NOTHING;
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"image" text,
	"google_sub" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_google_sub_unique" UNIQUE("google_sub")
);
--> statement-breakpoint
ALTER TABLE "settings" DROP CONSTRAINT "settings_key_unique";--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "tenant_id" text;--> statement-breakpoint
UPDATE "events" SET "tenant_id" = 'default' WHERE "tenant_id" IS NULL;--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "tenant_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "readings" ADD COLUMN "tenant_id" text;--> statement-breakpoint
UPDATE "readings" SET "tenant_id" = 'default' WHERE "tenant_id" IS NULL;--> statement-breakpoint
ALTER TABLE "readings" ALTER COLUMN "tenant_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "readings" ADD COLUMN "hydrometer_status" text DEFAULT 'regular' NOT NULL;--> statement-breakpoint
ALTER TABLE "readings" ADD COLUMN "horimeter_status" text DEFAULT 'regular' NOT NULL;--> statement-breakpoint
ALTER TABLE "readings" ADD COLUMN "hydrometer_final_old" numeric(10, 3);--> statement-breakpoint
ALTER TABLE "readings" ADD COLUMN "hydrometer_initial_new" numeric(10, 3);--> statement-breakpoint
ALTER TABLE "readings" ADD COLUMN "horimeter_final_old" numeric(10, 3);--> statement-breakpoint
ALTER TABLE "readings" ADD COLUMN "horimeter_initial_new" numeric(10, 3);--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "tenant_id" text;--> statement-breakpoint
UPDATE "settings" SET "tenant_id" = 'default' WHERE "tenant_id" IS NULL;--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "tenant_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "readings" ADD CONSTRAINT "readings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "settings_tenant_key_unique" ON "settings" USING btree ("tenant_id","key");
