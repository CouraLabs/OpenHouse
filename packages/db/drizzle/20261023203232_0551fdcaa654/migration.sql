ALTER TABLE "accounts" ADD COLUMN "opening_balance" numeric(16,2);--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "opening_dt" date DEFAULT current_date NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "reconciled_through" date;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "is_adjustment" boolean DEFAULT false NOT NULL;--> statement-breakpoint
-- Backfill: opening = balance - sum(applied deltas of ACTIVE, non-Canceled rows),
-- so every account's current balance stays identical. An account with no rows
-- opens at its balance, dated by its creation day.
UPDATE "accounts" SET "opening_balance" = "accounts"."balance" - coalesce((
  SELECT sum(CASE WHEN "transactions"."type" = 'Income' THEN "transactions"."amount" ELSE -"transactions"."amount" END)
  FROM "transactions"
  WHERE "transactions"."linked_account_id" = "accounts"."id"
    AND "transactions"."status" = 'ACTIVE'
    AND "transactions"."review_status" <> 'Canceled'
), 0), "opening_dt" = coalesce((
  SELECT min("transactions"."transaction_dt")
  FROM "transactions"
  WHERE "transactions"."linked_account_id" = "accounts"."id"
), "accounts"."created_dt"::date);--> statement-breakpoint
ALTER TABLE "accounts" ALTER COLUMN "opening_balance" SET NOT NULL;--> statement-breakpoint
CREATE INDEX "transactions_account_dt_idx" ON "transactions" ("tenant_id","linked_account_id","transaction_dt","id");
