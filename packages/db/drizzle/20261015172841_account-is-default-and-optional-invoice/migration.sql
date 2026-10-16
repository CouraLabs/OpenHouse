ALTER TABLE "accounts" ADD COLUMN "is_default" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "invoice" DROP NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_one_default_per_tenant_key" ON "accounts" ("tenant_id") WHERE is_default;