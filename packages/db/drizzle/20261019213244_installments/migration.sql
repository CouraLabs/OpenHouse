ALTER TABLE "transactions" ADD COLUMN "installment_group_id" uuid;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "installment_number" smallint;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "installment_count" smallint;--> statement-breakpoint
CREATE INDEX "transactions_installment_group_idx" ON "transactions" ("tenant_id","installment_group_id") WHERE installment_group_id is not null;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_installment_shape" CHECK (("installment_group_id" is null and "installment_number" is null and "installment_count" is null) or ("installment_group_id" is not null and 1 <= "installment_number" and "installment_number" <= "installment_count" and "installment_count" <= 48));