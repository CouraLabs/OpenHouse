-- The column arrives NOT NULL, but rows already exist: backfill them with
-- a temporary default, then drop the default so the schema stays strict.
ALTER TABLE "accounts" ADD COLUMN "currency" text DEFAULT 'USD' NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ALTER COLUMN "currency" DROP DEFAULT;--> statement-breakpoint
-- The limit periods were renamed: the stored values follow.
UPDATE "limits" SET "type" = 'Daily' WHERE "type" = 'Day';--> statement-breakpoint
UPDATE "limits" SET "type" = 'Weekly' WHERE "type" = 'Week';--> statement-breakpoint
UPDATE "limits" SET "type" = 'Monthly' WHERE "type" = 'Month';--> statement-breakpoint
UPDATE "limits" SET "type" = 'Yearly' WHERE "type" = 'Year';