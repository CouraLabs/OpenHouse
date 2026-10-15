CREATE TABLE "accounts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "accounts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenant_id" integer NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"created_by" integer,
	"created_dt" timestamp with time zone DEFAULT now() NOT NULL,
	"update_by" integer,
	"update_dt" timestamp with time zone DEFAULT now() NOT NULL,
	"name" varchar(255) NOT NULL,
	"agency" varchar(255),
	"number" integer NOT NULL,
	"type" text NOT NULL,
	"balance" numeric(16,2) NOT NULL,
	"limit" numeric(16,2),
	"closeDay" smallint,
	"closeMonth" smallint,
	"dueDay" smallint,
	"dueMonth" smallint
);
--> statement-breakpoint
CREATE INDEX "accounts_tenant_id_idx" ON "accounts" ("tenant_id");--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_tenant_id_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id");