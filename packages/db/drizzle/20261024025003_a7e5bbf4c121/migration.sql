CREATE TABLE "transaction_splits" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "transaction_splits_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenant_id" integer NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"created_by" integer,
	"created_dt" timestamp with time zone DEFAULT now() NOT NULL,
	"update_by" integer,
	"update_dt" timestamp with time zone DEFAULT now() NOT NULL,
	"transaction_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"share" numeric(16,2) NOT NULL,
	CONSTRAINT "transaction_splits_share_positive" CHECK ("share" > 0)
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "ownership" text DEFAULT 'personal' NOT NULL;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "default_split" jsonb;--> statement-breakpoint
ALTER TABLE "recurring_transactions" ADD COLUMN "paid_by_user_id" integer;--> statement-breakpoint
ALTER TABLE "recurring_transactions" ADD COLUMN "default_split" jsonb;--> statement-breakpoint
ALTER TABLE "tenant_settings" ADD COLUMN "unsplit_mode" text DEFAULT 'personal' NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "paid_by_user_id" integer;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "is_settlement" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX "transaction_splits_transaction_id_idx" ON "transaction_splits" ("transaction_id");--> statement-breakpoint
CREATE INDEX "transaction_splits_tenant_id_idx" ON "transaction_splits" ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "transaction_splits_member_key" ON "transaction_splits" ("transaction_id","user_id") WHERE status = 'ACTIVE';--> statement-breakpoint
ALTER TABLE "recurring_transactions" ADD CONSTRAINT "recurring_transactions_paid_by_user_id_users_id_fkey" FOREIGN KEY ("paid_by_user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "transaction_splits" ADD CONSTRAINT "transaction_splits_tenant_id_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id");--> statement-breakpoint
ALTER TABLE "transaction_splits" ADD CONSTRAINT "transaction_splits_transaction_id_transactions_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id");--> statement-breakpoint
ALTER TABLE "transaction_splits" ADD CONSTRAINT "transaction_splits_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_paid_by_user_id_users_id_fkey" FOREIGN KEY ("paid_by_user_id") REFERENCES "users"("id");--> statement-breakpoint
-- Existing rows were paid by whoever created them.
UPDATE "transactions" SET "paid_by_user_id" = "created_by" WHERE "created_by" IN (SELECT "id" FROM "users");--> statement-breakpoint
UPDATE "recurring_transactions" SET "paid_by_user_id" = "created_by" WHERE "created_by" IN (SELECT "id" FROM "users");
