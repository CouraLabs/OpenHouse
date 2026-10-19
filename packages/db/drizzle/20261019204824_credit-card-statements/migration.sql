CREATE TABLE "credit_card_statements" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "credit_card_statements_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenant_id" integer NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"created_by" integer,
	"created_dt" timestamp with time zone DEFAULT now() NOT NULL,
	"update_by" integer,
	"update_dt" timestamp with time zone DEFAULT now() NOT NULL,
	"account_id" integer NOT NULL,
	"period_start" date NOT NULL,
	"close_date" date NOT NULL,
	"due_date" date NOT NULL,
	"closed_at" timestamp with time zone,
	CONSTRAINT "credit_card_statements_period_order" CHECK ("close_date" > "period_start"),
	CONSTRAINT "credit_card_statements_due_after_close" CHECK ("due_date" >= "close_date")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "close_day_inclusive" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "statement_id" integer;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "statement_pinned" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "credit_card_statements_account_close_key" ON "credit_card_statements" ("tenant_id","account_id","close_date") WHERE status = 'ACTIVE';--> statement-breakpoint
CREATE INDEX "credit_card_statements_tenant_account_due_idx" ON "credit_card_statements" ("tenant_id","account_id","due_date");--> statement-breakpoint
CREATE INDEX "transactions_statement_id_idx" ON "transactions" ("tenant_id","statement_id") WHERE status = 'ACTIVE' and statement_id is not null;--> statement-breakpoint
ALTER TABLE "credit_card_statements" ADD CONSTRAINT "credit_card_statements_tenant_id_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id");--> statement-breakpoint
ALTER TABLE "credit_card_statements" ADD CONSTRAINT "credit_card_statements_account_id_accounts_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id");--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_statement_id_credit_card_statements_id_fkey" FOREIGN KEY ("statement_id") REFERENCES "credit_card_statements"("id");--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_pinned_needs_statement" CHECK (not "statement_pinned" or "statement_id" is not null);--> statement-breakpoint
-- backfill:start
-- Every ACTIVE charge on a credit card lands on a bill, by the same rule as
-- poco's `resolveStatement` (every card is non-inclusive at this point: the
-- column was just added with its default). The card side of a payment — an
-- Income that is a transfer leg — is not a charge and gets no bill. Cards
-- missing a close or due day are skipped; saving their days later assigns
-- them. Rows that already have a bill are left alone, so re-running assigns
-- only what is missing.
WITH card_rows AS (
  SELECT t."id", t."tenant_id", t."linked_account_id" AS account_id,
         a."closeDay" AS cd, a."dueDay" AS dd,
         CASE
           WHEN t."transaction_dt" >= m."m0" + (least(a."closeDay", extract(day FROM m."m0" + interval '1 month - 1 day')::int) - 1)
           THEN (m."m0" + interval '1 month')::date
           ELSE m."m0"
         END AS km
    FROM "transactions" t
    JOIN "accounts" a ON a."id" = t."linked_account_id"
   CROSS JOIN LATERAL (SELECT date_trunc('month', t."transaction_dt")::date AS m0) m
   WHERE a."type" = 'Credit Card'
     AND a."closeDay" IS NOT NULL
     AND a."dueDay" IS NOT NULL
     AND t."status" = 'ACTIVE'
     AND t."statement_id" IS NULL
     AND NOT (t."type" = 'Income' AND t."transfer_group_id" IS NOT NULL)
),
windows AS (
  SELECT r."id", r."tenant_id", r."account_id",
         r."km" + (least(r."cd", extract(day FROM r."km" + interval '1 month - 1 day')::int) - 1) AS close_date,
         p."pm" + (least(r."cd", extract(day FROM p."pm" + interval '1 month - 1 day')::int) - 1) AS period_start,
         d."dm" + (least(r."dd", extract(day FROM d."dm" + interval '1 month - 1 day')::int) - 1) AS nominal_due
    FROM card_rows r
   CROSS JOIN LATERAL (SELECT (r."km" - interval '1 month')::date AS pm) p
   CROSS JOIN LATERAL (
     SELECT CASE WHEN r."dd" > r."cd" THEN r."km" ELSE (r."km" + interval '1 month')::date END AS dm
   ) d
)
INSERT INTO "credit_card_statements" ("tenant_id", "account_id", "period_start", "close_date", "due_date")
SELECT DISTINCT w."tenant_id", w."account_id", w."period_start", w."close_date", greatest(w."nominal_due", w."close_date")
  FROM windows w
ON CONFLICT ("tenant_id", "account_id", "close_date") WHERE status = 'ACTIVE' DO NOTHING;
--> statement-breakpoint
WITH card_rows AS (
  SELECT t."id", t."tenant_id", t."linked_account_id" AS account_id,
         a."closeDay" AS cd,
         CASE
           WHEN t."transaction_dt" >= m."m0" + (least(a."closeDay", extract(day FROM m."m0" + interval '1 month - 1 day')::int) - 1)
           THEN (m."m0" + interval '1 month')::date
           ELSE m."m0"
         END AS km
    FROM "transactions" t
    JOIN "accounts" a ON a."id" = t."linked_account_id"
   CROSS JOIN LATERAL (SELECT date_trunc('month', t."transaction_dt")::date AS m0) m
   WHERE a."type" = 'Credit Card'
     AND a."closeDay" IS NOT NULL
     AND a."dueDay" IS NOT NULL
     AND t."status" = 'ACTIVE'
     AND t."statement_id" IS NULL
     AND NOT (t."type" = 'Income' AND t."transfer_group_id" IS NOT NULL)
)
UPDATE "transactions" t
   SET "statement_id" = s."id"
  FROM card_rows r
  JOIN "credit_card_statements" s
    ON s."tenant_id" = r."tenant_id"
   AND s."account_id" = r."account_id"
   AND s."status" = 'ACTIVE'
   AND s."close_date" = r."km" + (least(r."cd", extract(day FROM r."km" + interval '1 month - 1 day')::int) - 1)
 WHERE t."id" = r."id";
--> statement-breakpoint
-- The audit stamp of bills whose period already ended in the tenant's zone.
UPDATE "credit_card_statements" s
   SET "closed_at" = now()
  FROM "tenant_settings" ts
 WHERE ts."tenant_id" = s."tenant_id"
   AND s."closed_at" IS NULL
   AND s."close_date" <= (now() AT TIME ZONE ts."timezone")::date;
-- backfill:end
