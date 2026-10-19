CREATE TABLE "tenant_settings" (
	"tenant_id" integer PRIMARY KEY,
	"timezone" text NOT NULL,
	"main_currency" text NOT NULL,
	"timezone_confirmed" boolean DEFAULT false NOT NULL,
	"update_by" integer,
	"update_dt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tenant_settings" ADD CONSTRAINT "tenant_settings_tenant_id_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id");--> statement-breakpoint
-- Every existing tenant gets its row. The zone is a `UTC` placeholder left
-- unconfirmed, so the owner is asked to confirm the real one; the main
-- currency is the one most of the tenant's ACTIVE accounts use (ties go to
-- the alphabetically first code), or USD when it has none.
INSERT INTO "tenant_settings" ("tenant_id", "timezone", "main_currency", "timezone_confirmed")
SELECT t."id",
       'UTC',
       COALESCE(
         (SELECT a."currency"
            FROM "accounts" a
           WHERE a."tenant_id" = t."id" AND a."status" = 'ACTIVE'
           GROUP BY a."currency"
           ORDER BY count(*) DESC, a."currency"
           LIMIT 1),
         'USD'
       ),
       false
  FROM "tenants" t
ON CONFLICT ("tenant_id") DO NOTHING;
