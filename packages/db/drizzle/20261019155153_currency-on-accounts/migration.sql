-- Currency lives on accounts only: goals and limits are denominated in the
-- tenant's main currency. Dropping their own currency re-denominates every
-- row into the main currency, so the migration never does it silently: when
-- an ACTIVE goal or limit is in another currency, it stops and lists them
-- (tenant, entity, id, currency) so the owner edits or deletes them first.
-- Deleted rows are left out — nobody can edit them, and nothing reads them
-- as money.
DO $$
DECLARE
  conflicts text;
BEGIN
  SELECT string_agg(
           format('tenant %s %s %s (%s)', mismatched.tenant_id, mismatched.entity, mismatched.id, mismatched.currency),
           '; ' ORDER BY mismatched.tenant_id, mismatched.entity, mismatched.id
         )
    INTO conflicts
    FROM (
      SELECT g."tenant_id", 'goal' AS entity, g."id", g."currency"
        FROM "goals" g
        JOIN "tenant_settings" s ON s."tenant_id" = g."tenant_id"
       WHERE g."status" = 'ACTIVE' AND g."currency" <> s."main_currency"
      UNION ALL
      SELECT l."tenant_id", 'limit' AS entity, l."id", l."currency"
        FROM "limits" l
        JOIN "tenant_settings" s ON s."tenant_id" = l."tenant_id"
       WHERE l."status" = 'ACTIVE' AND l."currency" <> s."main_currency"
    ) AS mismatched;

  IF conflicts IS NOT NULL THEN
    RAISE EXCEPTION 'goals or limits are not in their tenant''s main currency; edit or delete these before migrating: %', conflicts;
  END IF;
END
$$;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "spread_pct" numeric(5,2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "goals" DROP COLUMN "currency";--> statement-breakpoint
ALTER TABLE "limits" DROP COLUMN "currency";--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_spread_pct_range" CHECK ("spread_pct" >= 0 and "spread_pct" <= 100);
