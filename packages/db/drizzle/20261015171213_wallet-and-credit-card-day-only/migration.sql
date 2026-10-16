-- The old `Credit` type carried a limit and close/due dates — exactly what a
-- Credit Card is now — so its rows become Credit Cards, keeping that data.
UPDATE "accounts" SET "type" = 'Credit Card' WHERE "type" = 'Credit';--> statement-breakpoint
ALTER TABLE "accounts" DROP COLUMN "closeMonth";--> statement-breakpoint
ALTER TABLE "accounts" DROP COLUMN "dueMonth";