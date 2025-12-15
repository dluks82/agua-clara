CREATE TABLE "public_dashboard_links" (
  "id" text PRIMARY KEY NOT NULL,
  "tenant_id" text NOT NULL REFERENCES "tenants"("id") ON DELETE cascade,
  "token_hash" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "expires_at" timestamp with time zone NOT NULL,
  "revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX "public_dashboard_links_token_hash_unique" ON "public_dashboard_links" USING btree ("token_hash");
--> statement-breakpoint
CREATE INDEX "public_dashboard_links_tenant_idx" ON "public_dashboard_links" USING btree ("tenant_id");

