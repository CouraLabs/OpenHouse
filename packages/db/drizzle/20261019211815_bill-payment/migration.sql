ALTER TABLE "credit_card_statements" ADD COLUMN "minimum_due" numeric(16,2);--> statement-breakpoint
ALTER TABLE "credit_card_statements" ADD COLUMN "bank_total" numeric(16,2);--> statement-breakpoint
ALTER TABLE "credit_card_statements" ADD COLUMN "reconciled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "payment_statement_id" integer;--> statement-breakpoint
CREATE INDEX "transactions_payment_statement_id_idx" ON "transactions" ("tenant_id","payment_statement_id") WHERE status = 'ACTIVE' and payment_statement_id is not null;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_payment_statement_id_credit_card_statements_id_fkey" FOREIGN KEY ("payment_statement_id") REFERENCES "credit_card_statements"("id");--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_payment_is_transfer_in" CHECK ("payment_statement_id" is null or ("type" = 'Income' and "transfer_group_id" is not null and "statement_id" is null));--> statement-breakpoint
-- backfill:start
-- Every ACTIVE payment into a card already recorded — the card side of a
-- transfer, an Income — settles a bill: the card's latest ACTIVE bill
-- closed by the payment's day (its exclusive close on or before it), or the
-- card's first bill when none had closed yet. Payments on a card with no
-- bill at all stay unlinked; the user links them with "Move to bill".
UPDATE "transactions" t
   SET "payment_statement_id" = coalesce(
         (SELECT s."id" FROM "credit_card_statements" s
           WHERE s."tenant_id" = t."tenant_id"
             AND s."account_id" = t."linked_account_id"
             AND s."status" = 'ACTIVE'
             AND s."close_date" <= t."transaction_dt"
           ORDER BY s."close_date" DESC
           LIMIT 1),
         (SELECT s."id" FROM "credit_card_statements" s
           WHERE s."tenant_id" = t."tenant_id"
             AND s."account_id" = t."linked_account_id"
             AND s."status" = 'ACTIVE'
           ORDER BY s."close_date" ASC
           LIMIT 1))
  FROM "accounts" a
 WHERE a."id" = t."linked_account_id"
   AND a."type" = 'Credit Card'
   AND t."status" = 'ACTIVE'
   AND t."type" = 'Income'
   AND t."transfer_group_id" IS NOT NULL
   AND t."statement_id" IS NULL
   AND t."payment_statement_id" IS NULL;
-- backfill:end
