CREATE TABLE "import_mappings" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "import_mappings_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenant_id" integer NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"created_by" integer,
	"created_dt" timestamp with time zone DEFAULT now() NOT NULL,
	"update_by" integer,
	"update_dt" timestamp with time zone DEFAULT now() NOT NULL,
	"account_id" integer NOT NULL,
	"mapping" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "external_id" varchar(255);--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "import_batch_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "import_mappings_account_key" ON "import_mappings" ("tenant_id","account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "transactions_external_id_key" ON "transactions" ("tenant_id","linked_account_id","external_id") WHERE status = 'ACTIVE' and external_id is not null;--> statement-breakpoint
CREATE INDEX "transactions_import_batch_idx" ON "transactions" ("tenant_id","import_batch_id") WHERE import_batch_id is not null;--> statement-breakpoint
ALTER TABLE "import_mappings" ADD CONSTRAINT "import_mappings_tenant_id_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id");--> statement-breakpoint
ALTER TABLE "import_mappings" ADD CONSTRAINT "import_mappings_account_id_accounts_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id");