-- An email becomes one user in one tenant. The migration never merges
-- duplicates: when two rows share an email once lowercased and trimmed, it
-- stops and lists them so the owner resolves them by hand first.
DO $$
DECLARE
  conflicts text;
BEGIN
  SELECT string_agg(
           format('%s (user ids %s)', normalized, ids),
           '; ' ORDER BY normalized
         )
    INTO conflicts
    FROM (
      SELECT lower(btrim("email")) AS normalized,
             string_agg("id"::text, ', ' ORDER BY "id") AS ids
        FROM "users"
       GROUP BY lower(btrim("email"))
      HAVING count(*) > 1
    ) AS duplicated;

  IF conflicts IS NOT NULL THEN
    RAISE EXCEPTION 'users share an email; resolve these before migrating: %', conflicts;
  END IF;
END
$$;--> statement-breakpoint
UPDATE "users" SET "email" = lower(btrim("email")) WHERE "email" <> lower(btrim("email"));--> statement-breakpoint
DROP INDEX "users_tenant_id_email_key";--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_key" ON "users" (lower("email"));
