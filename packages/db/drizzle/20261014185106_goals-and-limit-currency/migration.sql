CREATE TABLE "goals" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "goals_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenant_id" integer NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"created_by" integer,
	"created_dt" timestamp with time zone DEFAULT now() NOT NULL,
	"update_by" integer,
	"update_dt" timestamp with time zone DEFAULT now() NOT NULL,
	"name" varchar(255) NOT NULL,
	"linked_account_id" integer NOT NULL,
	"balance" numeric(16,2) NOT NULL,
	"balance_dt" date NOT NULL,
	"target_balance" numeric(16,2) NOT NULL,
	"target_dt" date,
	"currency" text NOT NULL
);
--> statement-breakpoint
-- The column arrives NOT NULL, but rows already exist: backfill them with
-- a temporary default, then drop the default so the schema stays strict.
ALTER TABLE "limits" ADD COLUMN "currency" text DEFAULT 'USD' NOT NULL;--> statement-breakpoint
ALTER TABLE "limits" ALTER COLUMN "currency" DROP DEFAULT;--> statement-breakpoint
CREATE INDEX "goals_tenant_id_idx" ON "goals" ("tenant_id");--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_tenant_id_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id");--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_linked_account_id_accounts_id_fkey" FOREIGN KEY ("linked_account_id") REFERENCES "accounts"("id");