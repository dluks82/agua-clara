CREATE INDEX "events_tenant_ts_idx" ON "events" USING btree ("tenant_id","ts");--> statement-breakpoint
CREATE INDEX "readings_tenant_ts_idx" ON "readings" USING btree ("tenant_id","ts");